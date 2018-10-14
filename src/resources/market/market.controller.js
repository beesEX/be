/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const beesV8 = require('../../trading-engine/beesV8');

const {DATABASE_DOCUMENTS} = require('../../app.constants');

const logger = require('../../logger');

const tradeService = require('../../settlement/trade.service');

const getAggregatedStateOfOrderBook = async (ctx) => {
  if (ctx.params && ctx.params.currency && ctx.params.baseCurrency) {
    logger.info(`market.controller.js: getAggregatedStateOfOrderBook(): currency = ${ctx.params.currency} base currency = ${ctx.params.baseCurrency}`);
    ctx.body = await beesV8.getAggregatedStateOfOrderBook(`${ctx.params.currency}_${ctx.params.baseCurrency}`);
  }
  else {
    ctx.body = {
      error: 'currency/baseCurrency is missing'
    };
  }
};

const getMarketOhlcvData = async (ctx) => {
  logger.info(`market.controller.js: getMarketOhlcvData(): ctx.params=${JSON.stringify(ctx && ctx.params)} ctx.query=${JSON.stringify(ctx && ctx.request && ctx.request.query)}`);

  const currency = ctx && ctx.params && ctx.params.currency;
  const baseCurrency = ctx && ctx.params && ctx.params.baseCurrency;
  const resolution = ctx && ctx.params && ctx.params.resolution;
  const fromTime = ctx && ctx.request && ctx.request.query && ctx.request.query.from && parseInt(ctx.request.query.from);
  const toTime = Math.min(ctx && ctx.request && ctx.request.query && ctx.request.query.to && parseInt(ctx.request.query.to), new Date().getTime());

  const mapOfResolutionAndDocument = {
    1: DATABASE_DOCUMENTS.OHLCV1M,
    5: DATABASE_DOCUMENTS.OHLCV5M,
    60: DATABASE_DOCUMENTS.OHLCV60M,
    60000: DATABASE_DOCUMENTS.OHLCV1M,
    300000: DATABASE_DOCUMENTS.OHLCV5M,
    3600000: DATABASE_DOCUMENTS.OHLCV60M
  };

  if (currency && baseCurrency && resolution && mapOfResolutionAndDocument[resolution] && fromTime && toTime) {
    const symbol = `${currency}_${baseCurrency}`;
    const arrayOfDataPoints = await beesV8.getOhlcvData(symbol, mapOfResolutionAndDocument[resolution], fromTime, toTime);
    ctx.body = {

      data: arrayOfDataPoints

    };
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

const getLastTrade = async (ctx) => {
  logger.info(`market.controller.js: getLastTrade(): ctx.params=${JSON.stringify(ctx && ctx.params)}`);

  const currency = ctx && ctx.params && ctx.params.currency;
  const baseCurrency = ctx && ctx.params && ctx.params.baseCurrency;

  const lastTrades = await tradeService.getLastTrades(currency, baseCurrency);

  ctx.body = {
    data: lastTrades,
  };
};


module.exports = {
  getAggregatedStateOfOrderBook,
  getMarketOhlcvData,
  getLastTrade,
};
