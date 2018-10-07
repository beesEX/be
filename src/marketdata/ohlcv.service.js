const logger = require('../logger');

const db = require('../db');

const tradeSchema = require('../settlement/trade.schema');
const constants = require('../app.constants');

const services = {};

for (let i = 0; i < constants.OHLCV_COLLECTIONS.length; i += 1) {
  services[constants.OHLCV_COLLECTIONS[i]] = db.createService(constants.OHLCV_COLLECTIONS[i]);
}

const recordMarketData = async (timeResolutionType, marketData) => {
  if (!services[timeResolutionType]) services[timeResolutionType] = db.createService(timeResolutionType);
  logger.log(`ohlcv.service.js recordMarketData(): record timeResolutionType=${timeResolutionType} marketData=${JSON.stringify(marketData)}`);
  const createdMarketData = await services[timeResolutionType].create(marketData);
  logger.log(`ohlcv.service.js recordMarketData(): recorded createdMarketData=${JSON.stringify(createdMarketData)}`);
  return createdMarketData;
};

const getLastMarketDataStartTime = async (currency, baseCurrency, timeResolutionType) => {
  //logger.info(`ohlcv.service.js: getLastMarketDataStartTime(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType}`);
  const marketDataQuery = await services[timeResolutionType].find({
    currency,
    baseCurrency,
  }, { sort: {startTime: -1}, limit: 1});
  logger.log(`ohlcv.service.js getLastMarketDataStartTime(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType} marketDataQuery=${JSON.stringify(marketDataQuery)}`);
  return marketDataQuery && marketDataQuery.results && marketDataQuery.results[0] && marketDataQuery.results[0].startTime;
};

const getMarketData = async (currency, baseCurrency, timeResolutionType, fromTimeTS, toTimeTS) => {
  logger.info(`ohlcv.service.js: getMarketData(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType} startDate = ${fromTimeTS} endDate = ${toTimeTS} `);
  const service = services[timeResolutionType];
  if (!service) {
    logger.error('ohlcv.service.js getMarketData(): no service found');
    return null;
  }

  const marketDataQuery = await service.find({
    currency,
    baseCurrency,
    time: {$gte: Math.floor(fromTimeTS), $lte: Math.floor(toTimeTS)}
  }, {sort: {time: 1}});

  const marketDataToReturn = marketDataQuery && marketDataQuery.results;

  return marketDataToReturn;
};

const getAllTradesAfterTime = async (currency, baseCurrency, fromTime) => {
  logger.info(`ohlcv.service.js: getAllTradesAfterTime(): currency = ${currency} baseCurrency = ${baseCurrency} fromTime = ${JSON.stringify(fromTime)}`);
  const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
    executedAt: {$gt: fromTime}
  }, {sort: {executedAt : 1}});
  logger.info(`ohlcv.service.js: getAllTradesAfterTime(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

const getAllTradesOfCurrencyPair = async (currency, baseCurrency) => {
  logger.info(`ohlcv.service.js: getAllTradesOfCurrencyPair(): currency = ${currency} baseCurrency = ${baseCurrency}`);
  const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
  }, {sort: {executedAt : 1}});
  logger.info(`ohlcv.service.js: getAllTradesOfCurrencyPair(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

const getFirstTradeBeforeTime = async (currency, baseCurrency, beforeTime) => {
  logger.info(`ohlcv.service.js: getFirstTradeBeforeTime(): currency = ${currency} baseCurrency = ${baseCurrency} beginTime = ${JSON.stringify(beforeTime)}`);
  const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
    executedAt: {$lt: beforeTime}
  }, {sort: {executedAt : -1}, limit: 1});
  logger.info(`ohlcv.service.js: getFirstTradeBeforeTime(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results && tradeQuery.results[0];
};

module.exports = {
  getLastMarketDataStartTime,
  recordMarketData,
  getMarketData,
  getAllTradesAfterTime,
  getFirstTradeBeforeTime,
  getAllTradesOfCurrencyPair,
};
