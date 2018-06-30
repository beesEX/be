// created by Viet Anh Ho
const { logger } = global;

/*
exports.signin = async (ctx, next) => {
  const result = await validators.signin.validate(ctx);
  ctx.assert(!result.errors, 400);

  const { value: signinData } = result;

  const token = authService.createAuthToken({ userId: signinData.userId });

  ctx.body = {

    token,

  };
};
*/
exports.orderPostHandler = () => {
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

exports.orderGetHandler = () => {

  return async (ctx, next) => {
    logger.info('Receive GET ORDER request -> Return "Why is GET ??? "');
    logger.info('Next = ',JSON.stringify(next, null, 2));
    logger.info('Ctx = ',JSON.stringify(ctx, null, 2));
    ctx.body = {
      message: "Why is GET ??? ",
    };
  };
};