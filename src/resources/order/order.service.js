const {logger} = global;

const orderSchema = require('./order.schema');
const constants = require('app.constants');
const db = require('db');

const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, orderSchema.schema);
// usage: https://github.com/paralect/node-mongo/blob/master/API.md#mongo-service

const beesV8 = require('trading-engine/beesV8');
const { Order, OrderPlacedEvent, OrderQuantityUpdatedEvent, OrderLimitUpdatedEvent, OrderCanceledEvent, } = require('./order.models');

const ON_BOOK_STATUS = [orderSchema.ORDER_STATUS.PLACED, orderSchema.ORDER_STATUS.PARTIALLY_FILLED];

module.exports = {

  /**
   * Places new order on book
   * @param {Object} newOrderObject: an order object with full properties of an order <- should consider to fill needed features in order.controller or here
   * @returns {Promise<{Object}>} Promise of the newly placed order record object
   */
  placeOrder: async (newOrderObject) => {
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
   * @returns {Promise<{Object}>} Promise of the updated order record object
   */
  updateOrderByUser: async (orderObject, userId) => {
    logger.info(`order.service.js: updateOrderByUser(): received order object ${JSON.stringify(orderObject)}`);
    if (!orderObject) {
      logger.error(`order.service.js: updateOrderByUser(): ERROR: unexpected type of orderObject`);
      return false;
    }

    orderObject = new Order(orderObject);

    const updateOrder = await service.find({
      userId,
      _id: orderObject._id,
      status: {$in: ON_BOOK_STATUS}
    });
    logger.info(`order.service.js: updateOrderByUser(): get order ${JSON.stringify(updateOrder)} from DB`);
    if (!updateOrder) {
      logger.error(`order.service.js: updateOrderByUser(): ERROR: not found order Id ${orderObject._id} of user Id ${userId} with on book status`);
      return false;
    }

    const oldQuantity = updateOrder.quantity;
    const oldPrice = updateOrder.limitPrice;

    updateOrder.quantity = orderObject.quantity;
    updateOrder.limitPrice = orderObject.limitPrice;

    logger.info(`order.service.js: updateOrderByUser(): oldQuantity = ${oldQuantity} and newQuantity = ${updateOrder.quantity}`);
    logger.info(`order.service.js: updateOrderByUser(): oldPrice = ${oldPrice} and newPrice = ${updateOrder.limitPrice}`);

    let orderbookEvent = null;

    if (oldPrice !== orderObject.limitPrice) {
      const orderLimitUpdatedEvent = new OrderLimitUpdatedEvent(new Order(updateOrder), oldQuantity, oldPrice);
      orderbookEvent = await beesV8.processOrderEvent(orderLimitUpdatedEvent);
    }
    else if (oldPrice === orderObject.limitPrice && oldQuantity !== orderObject.quantity) {
      const orderQuantityUpdatedEvent = new OrderQuantityUpdatedEvent(new Order(updateOrder), oldQuantity, oldPrice);
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
      if (orderbookEvent.reason.quantity > doc.filledQuantity) {
        doc.limitPrice = orderbookEvent.reason.price;
        doc.quantity = orderbookEvent.reason.quantity;
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
   * @returns {undefined}
   */
  cancelOrder: async (orderId, userId) => {
    // get the order with given Id in DB
    const cancelOrder = await service.find({
      userId,
      _id: orderId,
      status: {$in: ON_BOOK_STATUS}
    });
    logger.info(`order.service.js: cancelOrder(): get order ${JSON.stringify(cancelOrder)} from DB`);

    if (!cancelOrder) {
      logger.error(`order.service.js: cancelOrder(): ERROR: not found order Id ${orderId} of user Id ${userId} with on book status`);
      return false;
    }

    // found it
    const orderCanceledOrderEvent = new OrderCanceledEvent(new Order(cancelOrder));
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
   * @param {Object} reasonObj
   * @param {Object} matchObj
   * @returns true if success, false if failed
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

    if (updatedMatchOrder && updatedReasonOrder) {
      logger.info(`order.service.js: updatedMatchOrder(): updated reason order = ${JSON.stringify(updatedReasonOrder)} and match order = ${JSON.stringify(updatedMatchOrder)}`);
      return true;
    }

    if (!updatedReasonOrder) logger.error('order.service.js: updatedMatchOrder(): ERROR: failed to update reason object');
    if (!updatedMatchOrder) logger.error('order.service.js: updatedMatchOrder(): ERROR: failed to update match object');
    return false;
  },
};
