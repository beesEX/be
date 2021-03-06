// created by Viet Anh Ho
const { logger } = global;

const orderSchema = require('./order.schema');
const { Order } = require('./order.models');
const orderService = require('./order.service');

/* POST /order/place */
exports.orderPlaceHandler = async (ctx) => {
  logger.info('order.controller.js: orderPlaceHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));

  const newOrderObj = {
    type: ctx.request.body.type,
    side: ctx.request.body.side,
    currency: ctx.request.body.currency,
    baseCurrency: ctx.request.body.baseCurrency,
    limitPrice: typeof ctx.request.body.limitPrice === 'number' ? ctx.request.body.limitPrice : parseFloat(ctx.request.body.limitPrice),
    quantity: typeof ctx.request.body.quantity === 'number' ? ctx.request.body.quantity : parseFloat(ctx.request.body.quantity),
    filledQuantity: 0.0,
    status: orderSchema.ORDER_STATUS.PLACED,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    orderbookTS: new Date().getTime(),
    userId: ctx.state.user._id.toString(),
  };

  try {
    ctx.body = await orderService.placeOrder(newOrderObj);
  } catch (e) {
    ctx.body = { errors: [{code: 'ORD-001', msg: e.message}]};
  }
};

/* POST /order/update */
exports.orderUpdateHandler = async (ctx) => {
  logger.info('order.controller.js: orderUpdateHandler(): received request.body', JSON.stringify(ctx.request.body, null, 2));

  const newOrderObj = {
    _id: ctx.request.body._id,
    limitPrice: typeof ctx.request.body.limitPrice === 'number' ? ctx.request.body.limitPrice : parseFloat(ctx.request.body.limitPrice),
    quantity: typeof ctx.request.body.quantity === 'number' ? ctx.request.body.quantity : parseFloat(ctx.request.body.quantity),
  };

  ctx.body = await orderService.updateOrderByUser(newOrderObj, ctx.state.user._id.toString());
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
  ctx.body = await orderService.getActiveOrders(ctx.state.user._id.toString(), ctx.request.query);
};
