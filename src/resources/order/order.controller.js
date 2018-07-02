// created by Viet Anh Ho
const { logger } = global;

const orderService = require('./order.service');

// export.orderPlaceHandler = async (ctx, next) => {
exports.orderPlaceHandler = () => { // route handler function define nhu the nay se ko chay, vi ko nhan parameters nao tu Koa.js
  return async (ctx, next) => { // bo cai dong nay di, route handler function ben ngoai da defined la async roi
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
      userId: ctx.state.user._id.toString() // ctx.state.user._id la string roi, sao phai goi toString()?
    };

    ctx.body = { // ctx.body = await orderService.placeOrder(newOrderObj), API defines la response body chinh la cai order json object, khong can wrap vao field 'order' nua
      order: await orderService.placeOrder(newOrderObj)
    }
  }; // bo dong nay di nua
};

// export.orderUpdateHandler = async (ctx, next) => {
exports.orderUpdateHandler = () => { // route handler function define nhu the nay se ko chay, vi ko nhan parameters nao tu Koa.js
  return async (ctx, next) => { // bo cai dong nay di, route handler function ben ngoai da defined la async roi
    ctx.body = { // ctx.body = await orderService.updateOrder(ctx.request.body), API defines la response body chinh la cai order json object, khong can wrap vao field 'order' nua
      order: await orderService.updateOrder(ctx.request.body.order) // API defines la POST request boby chua json object -> ctx.request.body da chinh la cai json object roi, ko can truy cap them vao .order
    };
  };
};

// export.orderCancelHandler = async (ctx, next) => {
exports.orderCancelHandler = () => { // route handler function define nhu the nay se ko chay, vi ko nhan parameters nao tu Koa.js
  return async (ctx, next) => { // bo cai dong nay di, route handler function ben ngoai da defined la async roi
    ctx.request.body.order.userId = ctx.state.user._id.toString(); // dong nay lam gi day???
    const canceledOrder = await orderService.cancelOrder(ctx.request.body.order); // API defines la POST request co mot parameter ten la 'orderId' chua id cua order can cancel, body luc do ko phai json object, chi co mot cai paramter duy nhat ten la 'orderId' chua cai id cua order can cancel.
    //logger.info('order.controller.js: canceled order =', JSON.stringify(canceledOrder, null, 2));
    ctx.body = { // neu corderService.cancelOrder chay dung, ko van de gi, thi chi can tra ve http response code 200: ctx.status = 200; la xong
      status: (canceledOrder && canceledOrder._id === ctx.request.body.order._id && canceledOrder.status === "CANCELED")?"OK":"ERROR" // khong hieu y dinh cua dong nay, so sanh userId trong ctx va userId cua order phai lam ben trong service chu, sao lai cancel roi moi so sanh???
    };
  };
};

// export.orderActiveHandler = async (ctx, next) => {
exports.orderActiveHandler = () => { // route handler function define nhu the nay se ko chay, vi ko nhan parameters nao tu Koa.js
  return async (ctx, next) => { // bo cai dong nay di, route handler function ben ngoai da defined la async roi
    ctx.body = { // ctx.body = await orderService.getActiveOrder(ctx.request.body), API defines la response body chinh la array of order json objects, khong can wrap vao field 'orders' nua
      orders: await orderService.getActiveOrder(ctx.state.user._id.toString())
    };
  };
};
