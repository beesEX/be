const { logger } = global;

const orderSchema = require('./order.schema');
const constants = require('app.constants');
const db = require('db');

const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, orderSchema.schema);
// usage: https://github.com/paralect/node-mongo/blob/master/API.md#mongo-service

const beesV8 = require('trading-engine/beesV8');
const { Order, OrderPlacedEvent } = require('./order.models');

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
    const updatedOrder = await service.update({ _id: orderObject._id, userId: userId, status: { $in: ON_BOOK_STATUS } }, (doc) => {
      if (orderObject.quantity > doc.filledQuantity) {
        doc.limitPrice = orderObject.limitPrice;
        doc.quantity = orderObject.quantity;
        doc.lastUpdatedAt = new Date();
      }
    });
    logger.info('order.service.js: updateOrderByUser(): updatedOrder =', JSON.stringify(updatedOrder, null, 2));

    return updatedOrder;
  },

  /**
   * Cancel order of given user. Only on book order are allowed to canceled.
   * @param orderId: ID of order to be canceled
   * @param userId: userId of the owner of the order to be canceled
   * @returns {Promise<void>}
   */
  cancelOrder: async (orderId, userId) => {
    await service.update({ _id: orderId, userId: userId, status: { $in: ON_BOOK_STATUS } }, (doc) => {
      doc.status = orderSchema.ORDER_STATUS.CANCELED;
      doc.lastUpdatedAt = new Date();
      logger.info('order.service.js: cancelOrder(): canceledOrder with id =', orderId);
    });
  },

  /**
   * Retrieves orders on book of the given user
   * @param userId: userId of user for whose order should be retrieved
   * @returns {Promise<Array>}
   */
  getActiveOrder: async (userId) => {
    const result = await service.find({ userId: userId, status: { $in: ON_BOOK_STATUS } });
    logger.info('order.service.js: getActiveOrder(): list of active orders =', JSON.stringify(result.results, null, 2));

    return result.results;
  }
};
