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
   * @param newOrderObject: an order object with full properties of an order <- should consider to fill needed features in order.controller or here
   * @returns {Promise<*>}
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
   * @param orderObject: an object contains _id, limitPrice and quantity. New quantity must be greater than quantity already filled.
   * @param userId: userId of the owner of the order to be updated
   * @returns {Promise<void>}
   */
  updateOrderByUser: async (orderObject, userId) => {
    orderObject = new Order(orderObject);

    let oldQuantity = 0.0;
    let oldPrice = 0.0;

    const updatedOrder = await service.update({
      _id: orderObject._id,
      userId,
      status: {$in: ON_BOOK_STATUS}
    }, (doc) => {
      if (orderObject.quantity > doc.filledQuantity) {
        oldQuantity = doc.quantity;
        oldPrice = doc.limitPrice;

        console.log(`-------order.service.js oldQuantity ${oldQuantity} in type of ${typeof oldQuantity}`);
        console.log(`-------order.service.js oldPrice ${oldPrice} in type of ${typeof oldPrice}`);
        console.log(`-------order.service.js orderObject.limitPrice ${orderObject.limitPrice} in type of ${typeof orderObject.limitPrice}`);
        console.log(`-------order.service.js orderObject.quantity ${orderObject.quantity} in type of ${typeof orderObject.quantity}`);

        doc.limitPrice = orderObject.limitPrice;
        doc.quantity = orderObject.quantity;
        doc.lastUpdatedAt = new Date();
      }
    });
    logger.info('order.service.js: updateOrderByUser(): updatedOrder =', JSON.stringify(updatedOrder, null, 2));

    if (updatedOrder && oldPrice !== parseFloat(orderObject.limitPrice)) { // [Tung:] service core logic should not be bothered by such input pre-processing logic, this should be done in controller already.
      const orderLimitupdatedEvent = new OrderLimitUpdatedEvent(new Order(updatedOrder), oldQuantity, oldPrice);
      beesV8.processOrderEvent(orderLimitupdatedEvent);
    }
    else if (updatedOrder && oldPrice === parseFloat(orderObject.limitPrice) && oldQuantity !== parseFloat(orderObject.quantity)) { // [Tung:] service core logic should not be bothered by such input pre-processing logic, this should be done in controller already.
      const orderQuantityUpdatedEvent = new OrderQuantityUpdatedEvent(new Order(updatedOrder), oldQuantity, oldPrice);
      beesV8.processOrderEvent(orderQuantityUpdatedEvent);
    }

    return updatedOrder;
  },

  /**
   * Cancel order of given user. Only on book order are allowed to canceled.
   * @param orderId: ID of order to be canceled
   * @param userId: userId of the owner of the order to be canceled
   * @returns {Promise<void>}
   */
  cancelOrder: async (orderId, userId) => {
    const canceledOrder = await service.update({_id: orderId, userId, status: {$in: ON_BOOK_STATUS}}, (doc) => {
      doc.status = orderSchema.ORDER_STATUS.CANCELED;
      doc.lastUpdatedAt = new Date();
    });
    logger.info('order.service.js: cancelOrder(): canceledOrder =', JSON.stringify(canceledOrder, null, 2));

    if (canceledOrder) {
      const orderCanceledOrderEvent = new OrderCanceledEvent(new Order(canceledOrder));
      beesV8.processOrderEvent(orderCanceledOrderEvent);
    }
  },

  /**
   * Retrieves orders on book of the given user
   *
   * @param userId
   * @param extraOptions
   * @returns {Promise<Array<{name: string, code: (number)}>|*|Function>}
   */
  getActiveOrder: async (userId, extraOptions) => {

    let offset;
    let limit;
    let sort;

    if (extraOptions) {
      offset = parseInt(extraOptions.offset) || 0;
      limit = parseInt(extraOptions.limit) || 100;
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
  }
};
