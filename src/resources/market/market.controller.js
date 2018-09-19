/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const beesV8 = require('../../trading-engine/beesV8');
const ohlcv_service = require('../../marketdata/ohlcv.service');

const { logger } = global;

exports.getAggregatedStateOfOrderBook = async (ctx) => {

  if (ctx.params && ctx.params.currency && ctx.params.baseCurrency) {

    logger.info(`order.controller.js: getAggregatedStateOfOrderBook: currency = ${ctx.params.currency} base currency = ${ctx.params.baseCurrency}`);

    ctx.body = await beesV8.getAggregatedStateOfOrderBook(`${ctx.params.currency}_${ctx.params.baseCurrency}`);
  }
  else {

    ctx.body = {

      error: 'currency/baseCurrency is missing'

    };
  }
};

exports.getMarketOhlcvData = async (ctx) => {
  const currency = ctx && ctx.params && ctx.params.currency;
  const baseCurrency = ctx && ctx.params && ctx.params.baseCurrency;
  const resolution = ctx && ctx.params && ctx.params.resolution;
  const fromTime = ctx && ctx.request && ctx.request.query && ctx.request.query.from;
  const toTime = ctx && ctx.request && ctx.request.query && ctx.request.query.to;

  if (currency && baseCurrency && resolution && fromTime && toTime) {
    ctx.body = await ohlcv_service.getMarketData(resolution, fromTime, toTime, currency, baseCurrency);
  }
  else {
    let errorMessage = '';
    if (!currency) errorMessage = 'Missing currency';
    else if (!baseCurrency) errorMessage = 'Missing baseCurrency';
    else if (!resolution) errorMessage = 'Missing baseCurrency';
    else if (!fromTime) errorMessage = 'Missing from time Unix TS';
    else if (!toTime) errorMessage = 'Missing to time Unix TS';
    else errorMessage = 'Missing something';
    ctx.body = {
      error: {
        code: 404,
        message: errorMessage,
      }
    };
  }
};
