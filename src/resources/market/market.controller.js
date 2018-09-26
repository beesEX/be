/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const beesV8 = require('../../trading-engine/beesV8');
const ohlcvService = require('../../marketdata/ohlcv.service');

const {DATABASE_DOCUMENTS} = require('../../app.constants');

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

  const mapOfResolutionAndDocument = {
    1: DATABASE_DOCUMENTS.OHLCV1M,
    5: DATABASE_DOCUMENTS.OHLCV5M,
    60: DATABASE_DOCUMENTS.OHLCV60M
  };

  if (currency && baseCurrency && resolution && mapOfResolutionAndDocument[resolution] && fromTime && toTime) {
    ctx.body = await ohlcvService.getMarketData(mapOfResolutionAndDocument[resolution], fromTime, toTime, currency, baseCurrency);
  }
  else {
    let errorMessage = '';
    if (!currency) errorMessage = 'Missing currency';
    else if (!baseCurrency) errorMessage = 'Missing baseCurrency';
    else if (!resolution) errorMessage = 'Missing baseCurrency';
    else if (!mapOfResolutionAndDocument[resolution]) errorMessage = 'Undefined resolution';
    else if (!fromTime && !toTime) errorMessage = 'Missing "from time" and "to time" Unix TS';
    else if (!fromTime) errorMessage = 'Missing "from time" Unix TS';
    else if (!toTime) errorMessage = 'Missing "to time" Unix TS';
    else errorMessage = 'Missing something';
    ctx.body = {
      error: {
        code: 'MDT-01',
        message: errorMessage,
      }
    };
  }
};
