// created by Viet Anh Ho
const { logger } = global;

const orderService = require('./order.service');

/* POST /order/place */
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
    status: 'PLACED', // Hay tao mot array chua cac constants cho status trong orderSchema, va su dung nhung constants do, ko dung literal string value nhu the nay, very error-prone
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    userId: ctx.state.user._id.toString()
  };

  ctx.body = await orderService.placeOrder(newOrderObj);
};

/* POST /order/update */
exports.orderUpdateHandler = async (ctx, next) => { // moi route handler nen co mot dong log in ra rang no da nhan dc request va parameter no can
  ctx.body = await orderService.updateOrder(ctx.request.body);
};

/* POST /order/cancel */
exports.orderCancelHandler = async (ctx, next) => { // moi route handler nen co mot dong log in ra rang no da nhan dc request va parameter no can
  await orderService.cancelOrder(ctx.request.body.orderId, ctx.state.user._id.toString());
  ctx.body = {}; // tra ve http response code 200 co ma, viet the nay cung dc, nhung ko lam ro muc dich la minh chi muon tra ve ctx.status = 200;
};

/* GET /order/active */
exports.orderActiveHandler = async (ctx, next) => { // moi route handler nen co mot dong log in ra rang no da nhan dc request va parameter no can
  ctx.body = await orderService.getActiveOrder(ctx.state.user._id.toString());
};
