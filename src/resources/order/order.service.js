const { logger } = global;

const orderSchema = require('./order.schema');
const constants = require('app.constants');

const db = require('db');
const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, orderSchema.schema);
// usage: https://github.com/paralect/node-mongo/blob/master/API.md#mongo-service

module.exports = {

  /**
   * @param newOrderObject: an order object with full properties of an order <- should consider to fill needed features in order.controller or here
   * @returns {Promise<*>}
   */
  placeOrder : async (newOrderObject) => {
    const createdOrder = await service.create(newOrderObject);
    logger.info('order.service.js: placedOrder(): createdOrder =', JSON.stringify(createdOrder, null, 2));
    return createdOrder;
  },

  /**
   * @param orderObject: an object contains _id, limitPrice and quantity
   * @param userId: Koa generates it by using token
   * @returns {Promise<void>}
   */
  updateOrder : async (orderObject, userId) => {
    const updatedOrder = await service.update({ _id: orderObject._id, userId: userId}, (doc) => { // sao ko kiem tra userId cua order can update?
      doc.limitPrice = orderObject.limitPrice;
      doc.quantity = orderObject.quantity;
      doc.lastUpdatedAt = new Date()
    });
    logger.info('order.service.js: updateOrder(): updatedOrder =', JSON.stringify(updatedOrder, null, 2));

    return updatedOrder;
  },

  /**
   * @param orderId: ID of order to be canceled
   * @param userId: Koa generates it by using token
   * @returns {Promise<void>}
   */
  cancelOrder : async (orderId, userId) => {
    await service.update({ _id: orderId, userId: userId}, (doc) => {
      doc.status = orderSchema.CONST.cancelOrder_status;
      doc.lastUpdatedAt = new Date();
      logger.info('order.service.js: cancelOrder(): canceledOrder with id =', orderId);
    });
    return;
  },

  /**
   * @param userId: Koa generates it by using token
   * @returns {Promise<Array>}
   */
  getActiveOrder : async (userId) => {
    let result = await service.find({userId: userId, status: {$in:orderSchema.CONST.activeOrder_status}});
    logger.info('order.service.js: getActiveOrder(): list of active orders =', JSON.stringify(result.results, null, 2));

    return result.results;
  }
};
