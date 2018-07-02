// created by Viet Anh Ho
const { logger } = global;

const orderService = require('./order.service');

exports.orderPlaceHandler = async (ctx, next) => {
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

  ctx.body = await orderService.placeOrder(newOrderObj);
};

exports.orderUpdateHandler = async (ctx, next) => {
  ctx.body = await orderService.updateOrder(ctx.request.body);
};

exports.orderCancelHandler = async (ctx, next) => {
  await orderService.cancelOrder(ctx.request.body.orderId, ctx.state.user._id.toString());
  ctx.body = {};
};

exports.orderActiveHandler = async (ctx, next) => {
  ctx.body = await orderService.getActiveOrder(ctx.state.user._id.toString());
};
