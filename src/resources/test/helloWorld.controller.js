/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */
const { logger } = global;
exports.generateHandler = () => {
  let count = 0;

  return async (ctx, next) => {
    logger.info('Receive request -> Return Hello World ',count);
    logger.info('Ctx = ',JSON.stringify(ctx, null, 2));
    ctx.body = {
      message: `Hello World ${count}`,
    };

    count += 1;
  };
};
