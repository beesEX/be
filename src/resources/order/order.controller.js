// created by Viet Anh Ho
const { logger } = global;

const orderService = require('./order.service');

exports.orderPlaceHandler = () => {
  return async (ctx, next) => {
    logger.info('order.controller.js: Receive POST ORDER request');

    const newOrderObj = {
      type: ctx.request.body.type,
      side: ctx.request.body.side,
      currency: ctx.request.body.currency,
      baseCurrency: ctx.request.body.baseCurrency,
      limitPrice: ctx.request.body.limitPrice,
      quantity: ctx.request.body.quantity,
      filledQuantity: 0.0,
      status: 'PLACED',
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId: ctx.state.user._id.toString()
    };

    ctx.body = {
      order: await orderService.placeOrder(newOrderObj)
    }
  };
};

exports.orderUpdateHandler = () => {
  return async (ctx, next) => {
    ctx.body = {
      order: await orderService.updateOrder(ctx.request.body.order)
    };
  };
};

exports.orderCancelHandler = () => {
  return async (ctx, next) => {
    const canceledOrder = await orderService.cancelOrder(ctx.request.body.order);
    //logger.info('order.controller.js: canceled order =', JSON.stringify(canceledOrder, null, 2));
    ctx.body = {
      status: (canceledOrder._id === ctx.request.body.order._id && canceledOrder.status === "CANCELED")?"OK":"ERROR"
    };
  };
};

exports.orderActiveHandler = () => {
  return async (ctx, next) => {
    ctx.body = {
      orders: await orderService.getActiveOrder(ctx.state.user._id.toString())
    };
  };
};