const { logger } = global;

const schema = require('./order.schema');
const constants = require('app.constants');

const db = require('db');
const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, schema);
// usage: https://github.com/paralect/node-mongo/blob/master/API.md#mongo-service

module.exports = {

  placeOrder : async (newOrderObject) => {
    logger.info('order.service.js: place order:',JSON.stringify(newOrderObject, null, 2));
    service.create(newOrderObject);

    return newOrderObject;
  },

  updateOrder : async (orderObject) => {
    const updatedOrder = await service.update({ _id: orderObject._id}, (doc) => {
        doc.limitPrice = orderObject.limitPrice;
        doc.filledQuantity = orderObject.filledQuantity;
        doc.status = orderObject.status;
        doc.lastUpdatedAt = new Date()
    });
    logger.info('order.service.js: updated order =', JSON.stringify(updatedOrder, null, 2));

    return updatedOrder;
  },

  cancelOrder : async (orderObject) => {
    const updatedOrder = await service.update({ _id: orderObject._id}, (doc) => {
      doc.status = "CANCELED";
      doc.lastUpdatedAt = new Date()
    });
    logger.info('order.service.js: updated order =', JSON.stringify(updatedOrder, null, 2));

    return updatedOrder;
  },

  getActiveOrder : async (userId) => {
    const maxOrderNumber = 3000;
    logger.info('order.service.js: get active orders of uID:', userId);

    let results = [];

    const activeStatus = ['PLACED', 'PARTIALLY_FILLED'];

    for(let k=0; k<activeStatus.length; ++k){
      let result = await service.find({userId: userId, status: activeStatus[k]}, {perPage: maxOrderNumber});
      results = results.concat(result.results);

      let pagesCount = 1;
      if(result.pagesCount){
        pagesCount = result.pagesCount;
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