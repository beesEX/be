// created by Viet Anh Ho
const { logger } = global;

const orderSchema = require('./order.schema');
const orderService = require('./order.service');

/* POST /order/place */
exports.orderPlaceHandler = async (ctx, next) => {
  logger.info('order.controller.js: orderPlaceHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));

  const newOrderObj = {
    type: ctx.request.body.type,
    side: ctx.request.body.side,
    currency: ctx.request.body.currency,
    baseCurrency: ctx.request.body.baseCurrency,
    limitPrice: ctx.request.body.limitPrice,
    quantity: ctx.request.body.quantity,
    filledQuantity: 0.0,
    status: orderSchema.CONST.newOrder_status,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    userId: ctx.state.user._id.toString()
  };

  ctx.body = await orderService.placeOrder(newOrderObj);
};

/* POST /order/update */
exports.orderUpdateHandler = async (ctx, next) => {
  logger.info('order.controller.js: orderUpdateHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));
  ctx.body = await orderService.updateOrder(ctx.request.body, ctx.state.user._id.toString());
};

/* POST /order/cancel */
exports.orderCancelHandler = async (ctx, next) => {
  logger.info('order.controller.js: orderCancelHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));
  await orderService.cancelOrder(ctx.request.body.orderId, ctx.state.user._id.toString());
  // response.status = 200: OK <- automatically set by order.service.js
  ctx.body = {}; // tra ve http response code 200 co ma, viet the nay cung dc, nhung ko lam ro muc dich la minh chi muon tra ve ctx.status = 200;
};

/* GET /order/active */
exports.orderActiveHandler = async (ctx, next) => {
  logger.info('order.controller.js: orderActiveHandler(): received userId', ctx.state.user._id.toString());
  ctx.body = await orderService.getActiveOrder(ctx.state.user._id.toString());
};
