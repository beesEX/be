// created by Viet Anh Ho
const { logger } = global;

const orderService = require('./order.service');

exports.orderPlaceHandler = () => {
  let id = 1;
  let orderList = [];

  return async (ctx, next) => {
    logger.info('Receive POST ORDER request');
    logger.info('ctx.request.body = ',JSON.stringify(ctx.request.body, null, 2));
    /*
    orderList.push({
      id : id++,
      type: "Limit",
      currency: "Bitcoin",
      baseCurrency: ctx.request.body.currency,
      quantity: ctx.request.body.quantity,
      status: "Active",
      createdAt : new Date()
    });
    */
    orderList.push(id.toString()+" "+ctx.request.body.currency+" "+ctx.request.body.quantity.toString());
    ctx.body = {
      orderHis: orderList,
    };


  };
};

exports.orderUpdateHandler = () => {

  return async (ctx, next) => {
    ctx.body = {
      orderHis: "Update order",
    };

  };
};

exports.orderCancelHandler = () => {

  return async (ctx, next) => {
    ctx.body = {
      orderHis: "cancel order",
    };

  };
};

exports.orderActiveHandler = () => {

  return async (ctx, next) => {
    ctx.body = {
      message: "GetActiveOrder",
    };
  };
};