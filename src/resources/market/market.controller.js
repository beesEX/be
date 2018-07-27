/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const beesV8 = require('../../trading-engine/beesV8');

const { logger } = global;

exports.getAggregatedStateOfOrderBook = async (ctx) => {

  if (ctx.params && ctx.params.currency && ctx.params.baseCurrency) {

    logger.info(`order.controller.js: getAggregatedStateOfOrderBook: currency = ${ctx.params.currency} base currency = ${ctx.params.baseCurrency}`);

    ctx.body = await beesV8.getAggregatedStateOfOrderBook(ctx.params.currency, ctx.params.baseCurrency);
  }
  else {

    ctx.body = {

      error: 'currency/baseCurrency is missing'

    };
  }
};
