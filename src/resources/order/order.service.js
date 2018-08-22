const {logger} = global;

const orderSchema = require('./order.schema');
const constants = require('../../app.constants');
const db = require('../../db');

const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, orderSchema.schema);
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
   * @returns {Promise<{Object}>} Promise of the updated order record object if updating was successful
   */
  updateOrderByUser: async (orderObject, userId) => {
    logger.info(`order.service.js: updateOrderByUser(): received order object ${JSON.stringify(orderObject)}`);

    if (!orderObject) { // [Tung:] i guess, this means to be a null-check of input param, but it's not sufficient to get the code run correctly, for now i would remove it for simplicity, util we have time and do a meaningful Joi schema validation instead. Having not-sufficient precondition-checking code just pollutes your code!
      logger.error('order.service.js: updateOrderByUser(): ERROR: unexpected type of orderObject');
      return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
      // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
    }

    const orderToUpdateQuery = await service.find({
      userId,
      _id: orderObject._id,
      status: {$in: ON_BOOK_STATUS}
    });
    logger.info(`order.service.js: updateOrderByUser(): get result ${JSON.stringify(orderToUpdateQuery)} from DB`);
    if (!orderToUpdateQuery || !orderToUpdateQuery.results || orderToUpdateQuery.results.length === 0) {
      logger.error(`order.service.js: updateOrderByUser(): ERROR: not found order with id=${orderObject._id} of userId=${userId} with on book status`);
      return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
      // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
    }
    if (orderToUpdateQuery.results.length !== 1) {
      logger.error(`order.service.js: updateOrderByUser(): ERROR: there are more than one orders found for userId=${userId} and orderId=${orderObject._id} with on book status`);
      return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
      // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
    }

    const toBeUpdatedOrder = new Order(orderToUpdateQuery.results[0]);
    const oldQuantity = toBeUpdatedOrder.quantity;
    const oldPrice = toBeUpdatedOrder.limitPrice;

    toBeUpdatedOrder.quantity = orderObject.quantity;
    toBeUpdatedOrder.limitPrice = orderObject.limitPrice;

    logger.info(`order.service.js: updateOrderByUser(): oldQuantity = ${oldQuantity} and newQuantity = ${toBeUpdatedOrder.quantity}`);
    logger.info(`order.service.js: updateOrderByUser(): oldPrice = ${oldPrice} and newPrice = ${toBeUpdatedOrder.limitPrice}`);

    // locking the new required fund amount as precondition of order update
    let fundLocked = false;
    if (toBeUpdatedOrder.side === 'BUY') {
      const newRequiredAmount = (toBeUpdatedOrder.quantity - toBeUpdatedOrder.filledQuantity) * toBeUpdatedOrder.limitPrice;
      fundLocked = await txService.releaseLockedFundAndLockNewAmount(userId, toBeUpdatedOrder.baseCurrency, newRequiredAmount, toBeUpdatedOrder._id.toString());
    } else { // toBeUpdatedOrder.side === 'SELL'
      const newRequiredAmount = toBeUpdatedOrder.quantity - toBeUpdatedOrder.filledQuantity;
      fundLocked = await txService.releaseLockedFundAndLockNewAmount(userId, toBeUpdatedOrder.currency, newRequiredAmount, toBeUpdatedOrder._id.toString());
    }
    if (!fundLocked) {
      logger.error('order.service.js: updateOrderByUser(): failed to update order; new required fund amount could not be locked');
      throw new Error('new required fund amount could not be locked prior to update order');
    }

    let orderbookEvent = null;

    if (oldPrice !== orderObject.limitPrice) {
      const orderLimitUpdatedEvent = new OrderLimitUpdatedEvent(toBeUpdatedOrder, oldQuantity, oldPrice);
      orderbookEvent = await beesV8.processOrderEvent(orderLimitUpdatedEvent);
    }
    else if (oldPrice === orderObject.limitPrice && oldQuantity !== orderObject.quantity) {
      const orderQuantityUpdatedEvent = new OrderQuantityUpdatedEvent(toBeUpdatedOrder, oldQuantity, oldPrice);
      orderbookEvent = await beesV8.processOrderEvent(orderQuantityUpdatedEvent);
    }
    logger.info(`order.service.js: updateOrderByUser(): received ${JSON.stringify(orderbookEvent)} from beesV8`);

    if (!orderbookEvent || !orderbookEvent.reason) {
      logger.info('order.service.js: updateOrderByUser(): failed to update order in order book');
      return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
      // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
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

    if (updatedOrder) {
      logger.info('order.service.js: updateOrderByUser(): order update was successful; updatedOrder =', JSON.stringify(updatedOrder, null, 2));
      return updatedOrder;
    }

    logger.info('order.service.js: updateOrderByUser(): failed to update order in DB');
    return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
    // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
  },

  /**
   * Cancel order of given user. Only on book order are allowed to be canceled.
   * @param {string} orderId: ID of order to be canceled
   * @param {string} userId: userId of the owner of the order to be canceled
   * @returns {Promise<boolean>} Promise of true if canceling of the order was successful, otherwise false
   */
  cancelOrder: async (orderId, userId) => {
    // get the order with given Id in DB
    const orderToCancelQuery = await service.find({
      userId,
      _id: orderId,
      status: {$in: ON_BOOK_STATUS}
    });
    logger.info(`order.service.js: cancelOrder(): get result ${JSON.stringify(orderToCancelQuery)} from DB`);

    if (!orderToCancelQuery || !orderToCancelQuery.results || orderToCancelQuery.results.length === 0) {
      logger.error(`order.service.js: cancelOrder(): ERROR: not found order with id=${orderId} of userId=${userId} with on book status`);
      return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
      // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
    }
    if (orderToCancelQuery.results.length !== 1) {
      logger.error(`order.service.js: cancelOrder(): ERROR: there are more than one orders found for userId=${userId} and orderId=${orderId} with on book status`);
      return false;// [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
      // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!
    }

    // found it
    const orderCanceledOrderEvent = new OrderCanceledEvent(new Order(orderToCancelQuery.results[0]));
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

    if (canceledOrder) {
      // release remaining locked fund of the canceled order if any exists
      if (canceledOrder.side === 'BUY') {
        txService.releaseLockedFund(userId, canceledOrder.baseCurrency, canceledOrder._id.toString());
      } else { // canceledOrder.side === 'SELL'
        txService.releaseLockedFund(userId, canceledOrder.currency, canceledOrder._id.toString());
      }

      logger.info('order.service.js: cancelOrder(): canceledOrder =', JSON.stringify(canceledOrder, null, 2));
      return true;
    }

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
   * @param {Object} reasonObj: 'reason'-field of OrderbookEvent, represents order under processing of the match.
   * @param {Object} matchObj: one of elements of the 'matches'-Array field of OrderbookEvent, represent the counter order of the match.
   * @returns {Promise<boolean>} Promise of boolean, true if success, false if failed
   */
  updateOrdersByMatch: async (reasonObj, matchObj) => {
    logger.info(`order.service.js: updateOrdersByMatch(): received reason object = ${JSON.stringify(reasonObj)} and match object = ${JSON.stringify(matchObj)}`);

    // update reason order
    const updatedReasonOrder = await service.update({
      _id: reasonObj.orderId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      doc.filledQuantity += matchObj.tradedQuantity;
      doc.status = (doc.filledQuantity === doc.quantity) ? orderSchema.ORDER_STATUS.FILLED : orderSchema.ORDER_STATUS.PARTIALLY_FILLED;
      doc.lastUpdatedAt = new Date();
    });

    // update match order
    const updatedMatchOrder = await service.update({
      _id: matchObj.orderId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      doc.filledQuantity += matchObj.tradedQuantity;
      doc.status = (matchObj.filledCompletely) ? orderSchema.ORDER_STATUS.FILLED : orderSchema.ORDER_STATUS.PARTIALLY_FILLED; // [Tung]: use quantity - filledQuantity comparision of match-Obj at each match pls, do not use filledCompletely-field, it's intended to be used in UI
      doc.lastUpdatedAt = new Date();
    });

    if (updatedReasonOrder && updatedMatchOrder) {
      logger.info(`order.service.js: updateOrdersByMatch(): updated successful; order under processing = ${JSON.stringify(updatedReasonOrder)} and matched counter order = ${JSON.stringify(updatedMatchOrder)}`);

      // release remaining locked fund if any exists after the reason order under processing has been filled completely
      if (updatedReasonOrder.status === orderSchema.ORDER_STATUS.FILLED) {
        if (updatedReasonOrder.side === 'BUY') {
          txService.releaseLockedFund(updatedReasonOrder.userId, updatedReasonOrder.baseCurrency, updatedReasonOrder._id.toString());
        }
        else { // updatedReasonOrder.side === 'SELL'
          txService.releaseLockedFund(updatedReasonOrder.userId, updatedReasonOrder.currency, updatedReasonOrder._id.toString());
        }
      }

      // release remaining locked fund if any exists after the matched counter order has been filled completely
      if (updatedMatchOrder.status === orderSchema.ORDER_STATUS.FILLED) {
        if (updatedMatchOrder.side === 'BUY') {
          txService.releaseLockedFund(updatedMatchOrder.userId, updatedMatchOrder.baseCurrency, updatedMatchOrder._id.toString());
        }
        else { // updatedReasonOrder.side === 'SELL'
          txService.releaseLockedFund(updatedMatchOrder.userId, updatedMatchOrder.currency, updatedMatchOrder._id.toString());
        }
      }

      return true;
    }

    if (!updatedReasonOrder) logger.error('order.service.js: updateOrdersByMatch(): ERROR: failed to update reason object');
    if (!updatedMatchOrder) logger.error('order.service.js: updateOrdersByMatch(): ERROR: failed to update match object');
    return false;
  },
};
