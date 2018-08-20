const {logger} = global;

const orderSchema = require('./order.schema');
const constants = require('../../app.constants');
//const {DATABASE_DOCUMENTS} = require('app.constants');
const db = require('../../db');

const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, orderSchema.schema);
//const service = db.createService(DATABASE_DOCUMENTS.ORDERS, orderSchema.schema);
// usage: https://github.com/paralect/node-mongo/blob/master/API.md#mongo-service

const beesV8 = require('../../trading-engine/beesV8');
const { Order, OrderPlacedEvent, OrderQuantityUpdatedEvent, OrderLimitUpdatedEvent, OrderCanceledEvent, } = require('./order.models');

const ON_BOOK_STATUS = [orderSchema.ORDER_STATUS.PLACED, orderSchema.ORDER_STATUS.PARTIALLY_FILLED];


const { idGenerator } = require('@paralect/node-mongo');
const txService = require('../../wealth-management/transaction.service');


module.exports = {

  /**
   * Checks available balance of user, locks amount required by the order, and places the order on book.
   * For now, fund check and lock only applies for LIMIT order.
   *
   * @param {Object} newOrderObject: an order object with full properties of an order <- should consider to fill needed features in order.controller or here
   * @returns {Promise<{Object}>} Promise of the newly placed order record object
   */

  placeOrder: async (newOrderObject) => {
    let fundCheckSuccessful = false;
    if (newOrderObject.type === 'LIMIT') {
      const orderId = idGenerator.generate();
      newOrderObject._id = orderId;

      if (newOrderObject.side === 'BUY') {
        const requiredAmount = newOrderObject.quantity * newOrderObject.limitPrice;
        fundCheckSuccessful = await txService.checkFundAndLock(newOrderObject.userId, newOrderObject.baseCurrency, requiredAmount, orderId);
      }
      else { // for SELL orders
        const requiredAmount = newOrderObject.quantity;
        fundCheckSuccessful = await txService.checkFundAndLock(newOrderObject.userId, newOrderObject.currency, requiredAmount, orderId);
      }
    }

    if (newOrderObject.type === 'LIMIT' && !fundCheckSuccessful) {
      throw new Error('not enought fund available');
    }

    const createdOrder = await service.create(newOrderObject);
    logger.info('order.service.js: placedOrder(): createdOrder =', JSON.stringify(createdOrder, null, 2));

    const orderPlacedEvent = new OrderPlacedEvent(new Order(createdOrder));
    beesV8.processOrderEvent(orderPlacedEvent);

    return createdOrder;
  },

  /**
   * Used by user to update a given order. Only limitPrice and quantity of order are able to change.
   * Only on book orders are allowed to be updated.
   * @param {Object} orderObject: an object contains _id, limitPrice and quantity. New quantity must be greater than quantity already filled.
   * @param {string} userId: userId of the owner of the order to be updated
   * @returns {Promise<{Object}>} Promise of the updated order record object if updating was successful, otherwise false
   */
  updateOrderByUser: async (orderObject, userId) => {
    logger.info(`order.service.js: updateOrderByUser(): received order object ${JSON.stringify(orderObject)}`);
    if (!orderObject) { // [Tung:] i guess, this means to be a null-check of input param, but it's not sufficient to get the code run correctly, for now i would remove it for simplicity, util we have time and do a meaningful Joi schema validation instead. Having not-sufficient precondition-checking code just pollutes your code!
      logger.error('order.service.js: updateOrderByUser(): ERROR: unexpected type of orderObject');
      return false;
    }

    orderObject = new Order(orderObject); // [Tung:] why do this? get any advantage when having the input again as Order object?

    let updateOrder = await service.find({ // [Tung:] you should rename the variable to: const 'orderToUpdateQuery' or just 'query'
      userId,
      _id: orderObject._id,
      status: {$in: ON_BOOK_STATUS}
    });
    logger.info(`order.service.js: updateOrderByUser(): get result ${JSON.stringify(updateOrder)} from DB`);
    if (!updateOrder || !updateOrder.results || updateOrder.results.length === 0) {
      logger.error(`order.service.js: updateOrderByUser(): ERROR: not found order with id=${orderObject._id} of userId=${userId} with on book status`);
      return false;
    }
    if (updateOrder.results.length !== 1) {
      logger.error(`order.service.js: updateOrderByUser(): ERROR: there are more than one orders found for userId=${userId} and orderId=${orderObject._id} with on book status`);
      return false;
    }

    updateOrder = new Order(updateOrder.results[0]); // [Tung:] reassign of local var is a bad practice, this line should be: const toBeUpdatedOrder = new Order(orderToUpdateQuery.results[0]);
    const oldQuantity = updateOrder.quantity;
    const oldPrice = updateOrder.limitPrice;

    updateOrder.quantity = orderObject.quantity;
    updateOrder.limitPrice = orderObject.limitPrice;

    logger.info(`order.service.js: updateOrderByUser(): oldQuantity = ${oldQuantity} and newQuantity = ${updateOrder.quantity}`);
    logger.info(`order.service.js: updateOrderByUser(): oldPrice = ${oldPrice} and newPrice = ${updateOrder.limitPrice}`);

    let orderbookEvent = null;

    if (oldPrice !== orderObject.limitPrice) {
      const orderLimitUpdatedEvent = new OrderLimitUpdatedEvent(updateOrder, oldQuantity, oldPrice);
      orderbookEvent = await beesV8.processOrderEvent(orderLimitUpdatedEvent);
    }
    else if (oldPrice === orderObject.limitPrice && oldQuantity !== orderObject.quantity) {
      const orderQuantityUpdatedEvent = new OrderQuantityUpdatedEvent(updateOrder, oldQuantity, oldPrice);
      orderbookEvent = await beesV8.processOrderEvent(orderQuantityUpdatedEvent);
    }
    logger.info(`order.service.js: updateOrderByUser(): received ${JSON.stringify(orderbookEvent)} from beesV8`);

    if (!orderbookEvent || !orderbookEvent.reason) {
      logger.info('order.service.js: updateOrderByUser(): failed to update order in order book');
      return false;
    }

    const updatedOrder = await service.update({
      _id: orderObject._id,
      userId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      if (orderbookEvent.reason.quantity >= doc.filledQuantity) {
        doc.limitPrice = orderbookEvent.reason.price;
        doc.quantity = orderbookEvent.reason.quantity;
        if (doc.filledQuantity === orderbookEvent.reason.quantity) doc.status = orderSchema.ORDER_STATUS.FILLED;
        doc.lastUpdatedAt = new Date();
      }
    });
    logger.info('order.service.js: updateOrderByUser(): updatedOrder =', JSON.stringify(updatedOrder, null, 2));

    if (updatedOrder) return updatedOrder;

    logger.info('order.service.js: updateOrderByUser(): failed to update order in DB');
    return false;
  },

  /**
   * Cancel order of given user. Only on book order are allowed to canceled.
   * @param {string} orderId: ID of order to be canceled
   * @param {string} userId: userId of the owner of the order to be canceled
   * @returns {Promise<boolean>} Promise of true if canceling of the order was successful, otherwise false
   */
  cancelOrder: async (orderId, userId) => {
    // get the order with given Id in DB
    let cancelOrder = await service.find({ // [Tung:] you should rename the variable to: const 'orderToCancelQuery' or just 'query'
      userId,
      _id: orderId,
      status: {$in: ON_BOOK_STATUS}
    });
    logger.info(`order.service.js: cancelOrder(): get result ${JSON.stringify(cancelOrder)} from DB`);

    if (!cancelOrder || !cancelOrder.results || cancelOrder.results.length === 0) {
      logger.error(`order.service.js: cancelOrder(): ERROR: not found order with id=${orderId} of userId=${userId} with on book status`);
      return false;
    }
    if (cancelOrder.results.length !== 1) {
      logger.error(`order.service.js: cancelOrder(): ERROR: there are more than one orders found for userId=${userId} and orderId=${orderId} with on book status`);
      return false;
    }

    cancelOrder = new Order(cancelOrder.results[0]); // [Tung:] reassign of local var is a bad practice, this line should be: const toBeCanceledOrder = new Order(orderToCancelQuery.results[0]);

    // found it
    const orderCanceledOrderEvent = new OrderCanceledEvent(cancelOrder);
    const orderbookEvent = await beesV8.processOrderEvent(orderCanceledOrderEvent);
    logger.info(`order.service.js: cancelOrder(): received ${JSON.stringify(orderbookEvent)} from beesV8`);

    if (!orderbookEvent || !orderbookEvent.reason) {
      logger.error('order.service.js: cancelOrder(): ERROR: failed to cancel order in order book');
      return false;
    }

    const canceledOrder = await service.update({
      _id: orderId,
      userId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      doc.status = orderSchema.ORDER_STATUS.CANCELED;
      doc.lastUpdatedAt = new Date();
    });
    logger.info('order.service.js: cancelOrder(): canceledOrder =', JSON.stringify(canceledOrder, null, 2));

    if (cancelOrder) return true;
    logger.info('order.service.js: cancelOrder(): failed to cancel order in DB');
    return false;
  },

  /**
   * Retrieves orders on book of the given user
   *
   * @param {string} userId
   * @param {Object} extraOptions
   * @returns {Promise<{orders: Array<{Object}, count: {number}>}>} Promise of object containing array of order records and a count
   */
  getActiveOrders: async (userId, extraOptions) => {

    let offset;
    let limit;
    let sort;

    if (extraOptions) {
      offset = parseInt(extraOptions.offset, 10) || 0;
      limit = parseInt(extraOptions.limit, 10) || 100;
      sort = JSON.parse(extraOptions.sort) || {};
    }
    else {
      offset = 0;
      limit = 100;
    }

    const perPage = limit;
    let page = (offset / limit) + 1;

    if (!Number.isInteger(page)) {
      logger.warn(`page ${page} is not an integer. It will be rounded down`);
      page = Math.floor(page);
    }

    const options = {
      perPage,
      page,
      sort
    };

    const result = await service.find({
      userId,
      status: {$in: ON_BOOK_STATUS},
      currency: extraOptions.currency,
      baseCurrency: extraOptions.baseCurrency}, options);

    logger.info(`order.service.js: getActiveOrder(): active orders = ${offset}-${offset + result.results.length}/${result.count} of userId=${userId} on market=${extraOptions.currency}_${extraOptions.baseCurrency}`);

    return {
      orders: result.results,
      count: result.count
    };
  },

  /**
   * Update pair of matched orders
   *
   * @param {Object} reasonObj: 'reason'-field of OrderbookEvent
   * @param {Object} matchObj: one of elements of the 'matches'-Array field of OrderbookEvent
   * @returns {Promise<boolean>} Promise of boolean, true if success, false if failed
   */
  updateOrdersbyMatch: async (reasonObj, matchObj, isReasonObjFilledCompletely) => {
    logger.info(`order.service.js: updatedMatchOrder(): received reason object = ${JSON.stringify(reasonObj)} and match object = ${JSON.stringify(matchObj)}`);

    // update reason order
    const updatedReasonOrder = await service.update({
      _id: reasonObj.orderId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      doc.filledQuantity += matchObj.tradedQuantity;
      doc.status = (isReasonObjFilledCompletely) ? orderSchema.ORDER_STATUS.FILLED : orderSchema.ORDER_STATUS.PARTIALLY_FILLED;
      doc.lastUpdatedAt = new Date();
    });

    // update match order
    const updatedMatchOrder = await service.update({
      _id: matchObj.orderId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      doc.filledQuantity += matchObj.tradedQuantity;
      doc.status = (matchObj.filledCompletely) ? orderSchema.ORDER_STATUS.FILLED : orderSchema.ORDER_STATUS.PARTIALLY_FILLED;
      doc.lastUpdatedAt = new Date();
    });

    if (updatedReasonOrder && updatedMatchOrder) {
      logger.info(`order.service.js: updateOrdersbyMatch(): updated order under processing = ${JSON.stringify(updatedReasonOrder)} and matched counter order = ${JSON.stringify(updatedMatchOrder)}`);
      return true;
    }

    if (!updatedReasonOrder) logger.error('order.service.js: updatedMatchOrder(): ERROR: failed to update reason object');
    if (!updatedMatchOrder) logger.error('order.service.js: updatedMatchOrder(): ERROR: failed to update match object');
    return false;
  },
};
