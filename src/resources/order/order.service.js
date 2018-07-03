const { logger } = global;

const schema = require('./order.schema');
const constants = require('app.constants');

const db = require('db');
const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, schema);
// usage: https://github.com/paralect/node-mongo/blob/master/API.md#mongo-service

module.exports = {

  /**
   * js function doc pls!!!
   * @param newOrderObject
   * @returns {Promise<*>}
   */
  placeOrder : async (newOrderObject) => {
    // cho nay phai viet nhu the nay: const createdOrder = await service.create(newOrderObject);
    service.create(newOrderObject); // cho nay phai co await chu? neu khong em se tra lai newOrderObject trong trang thai nhu khi input vao, khong phai trong trang thai sau khi da saved vao db
    logger.info('order.service.js: placed order:',JSON.stringify(newOrderObject, null, 2));

    return newOrderObject; // cho nay thi: return createdOrder;
  },

  /**
   * js function doc pls!!!
   * @param orderObject
   * @returns {Promise<void>}
   */
  updateOrder : async (orderObject) => {
    const updatedOrder = await service.update({ _id: orderObject._id}, (doc) => { // sao ko kiem tra userId cua order can update?
      doc.limitPrice = orderObject.limitPrice;
      doc.filledQuantity = orderObject.filledQuantity; // ko update filledQuantity, service function nay chi de dung cho nguoi dung update, chi update dc limitPrice va quantity thoi. Trading Engine se co update function rieng de update fillQuantity
      doc.status = orderObject.status; // ko update status, nguoi dung ko dc tu dong update status, Trading Engine se co function rieng de update status
      doc.lastUpdatedAt = new Date()
    });
    logger.info('order.service.js: updated order =', JSON.stringify(updatedOrder, null, 2));

    return updatedOrder;
  },

  /**
   * js function doc pls!!!
   * @param orderId
   * @param userId
   * @returns {Promise<void>}
   */
  cancelOrder : async (orderId, userId) => {
    await service.update({ _id: orderId, userId: userId}, (doc) => {
      doc.status = "CANCELED"; // Hay tao mot array chua cac constants cho status trong orderSchema, va su dung nhung constants do, ko dung literal string value nhu the nay, very error-prone
      doc.lastUpdatedAt = new Date();
      logger.info('order.service.js: canceled order with id =', orderId);
    });
    return;
  },

  /**
   * js function doc pls!!!
   * @param userId
   * @returns {Promise<Array>}
   */
  getActiveOrder : async (userId) => {
    const maxOrderNumber = 3000; // max number of documents per page
    let results = [];

    const activeStatus = ['PLACED', 'PARTIALLY_FILLED'];

    // thuc hien nhung query optimizations nhu Ngoc Son noi o tren chat
    for(let k=0; k<activeStatus.length; ++k){
      let result = await service.find({userId: userId, status: activeStatus[k]}, {perPage: maxOrderNumber}); // page default = 0
      results = results.concat(result.results);

      let pagesCount = 1;
      if(result.pagesCount){
        pagesCount = result.pagesCount; // try to take all other pages
        for(let i=1; i<pagesCount; ++i){
          result = await service.find({userId: userId}, {page: i, perPage: maxOrderNumber});
          results = results.concat(result.results);
        }
      }
    }

    logger.info('order.service.js: list of placed orders:', JSON.stringify(results, null, 2));

    return results;
  }
};
