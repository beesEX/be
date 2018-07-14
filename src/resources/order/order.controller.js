// created by Viet Anh Ho
const { logger } = global;

const orderSchema = require('./order.schema');
const orderService = require('./order.service');

/* POST /order/place */
exports.orderPlaceHandler = async (ctx) => {
  logger.info('order.controller.js: orderPlaceHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));

  const newOrderObj = {
    type: ctx.request.body.type,
    side: ctx.request.body.side,
    currency: ctx.request.body.currency,
    baseCurrency: ctx.request.body.baseCurrency,
    limitPrice: ctx.request.body.limitPrice,
    quantity: ctx.request.body.quantity,
    filledQuantity: 0.0,
    status: orderSchema.ORDER_STATUS.PLACED,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    userId: ctx.state.user._id.toString(),
  };

  ctx.body = await orderService.placeOrder(newOrderObj);
};

/* POST /order/update */
exports.orderUpdateHandler = async (ctx) => {
  logger.info('order.controller.js: orderUpdateHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));
  ctx.body = await orderService.updateOrderByUser(ctx.request.body, ctx.state.user._id.toString());
};

/* POST /order/cancel */
exports.orderCancelHandler = async (ctx) => {
  logger.info('order.controller.js: orderCancelHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));
  await orderService.cancelOrder(ctx.request.body.orderId, ctx.state.user._id.toString());

  ctx.body = null;
};

/* GET /order/active */
exports.orderActiveHandler = async (ctx) => {
  logger.info('order.controller.js: orderActiveHandler(): received userId', ctx.state.user._id.toString());
  ctx.body = await orderService.getActiveOrder(ctx.state.user._id.toString(), ctx.request.query);
};
