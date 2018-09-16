const logger = require('../logger');

const db = require('../db');
const {
  timeResolutionTypeArray
} = require('../app.constants');

const tradeSchema = require('../settlement/trade.schema');
const constants = require('../app.constants');

const services = {};

for (let i = 0; i < timeResolutionTypeArray.length; i += 1) {
  services[timeResolutionTypeArray[i]] = db.createService(timeResolutionTypeArray[i]);
}

const recordMarketData = async (timeResolutionType, marketData) => {
  if (!services[timeResolutionType]) services[timeResolutionType] = db.createService(timeResolutionType);
  logger.log(`ohlcv.service.js recordMarketData(): record timeResolutionType=${timeResolutionType} marketData=${JSON.stringify(marketData)}`);
  const createdMarketData = await services[timeResolutionType].create(marketData);
  logger.log(`ohlcv.service.js recordMarketData(): recorded createdMarketData=${JSON.stringify(createdMarketData)}`);
  return createdMarketData;
};

const getLastMarketDataTimeTick = async (timeResolutionType, currency, baseCurrency) => {
  //logger.info(`ohlcv.service.js: getLastMarketDataTimeTick(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType}`);
  const marketDataQuery = await services[timeResolutionType].find({
    currency,
    baseCurrency,
  }, { sort: {time: -1}, limit: 1});
  logger.log(`ohlcv.service.js getLastMarketDataTimeTick(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType} marketDataQuery=${JSON.stringify(marketDataQuery)}`);
  return marketDataQuery && marketDataQuery.results && marketDataQuery.results[0] && marketDataQuery.results[0].time;
};

const getMarketData = async (timeResolutionType, startDate, endDate, currency, baseCurrency) => {
  logger.info(`ohlcv.service.js: getMarketData(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType} startDate = ${startDate} endDate = ${endDate} `);
  const marketDataQuery = await services[timeResolutionType].find({
    currency,
    baseCurrency,
  }, { sort: {time: 1}, time: {$gt: startDate, $lt: endDate }});

  return marketDataQuery && marketDataQuery.results;
};

const getAllTradesFromTime = async (currency, baseCurrency, fromTime) => {
  logger.info(`ohlcv.service.js: getAllTradesFromTime(): currency = ${currency} baseCurrency = ${baseCurrency} fromTime = ${fromTime}`);
  const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
  }, {sort: {executedAt : 1}, executedAt: {$gt: fromTime}});
  logger.info(`ohlcv.service.js: getAllTradesFromTime(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

const getAllTrades = async (currency, baseCurrency) => {
  logger.info(`ohlcv.service.js: getAllTrades(): currency = ${currency} baseCurrency = ${baseCurrency}`);
  const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
  }, {sort: {executedAt : 1}});
  logger.info(`ohlcv.service.js: getAllTrades(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

const getLastTradeBeginTime = async (currency, baseCurrency, beginTime) => {
  logger.info(`ohlcv.service.js: getLastTradeBeginTime(): currency = ${currency} baseCurrency = ${baseCurrency} beginTime = ${beginTime}`);
  const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
  }, {sort: {executedAt : -1}, executedAt: {$lt: beginTime}, limit: 1});
  logger.info(`ohlcv.service.js: getLastTradeBeginTime(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

module.exports = {
  getLastMarketDataTimeTick,
  recordMarketData,
  getMarketData,
  getAllTradesFromTime,
  getLastTradeBeginTime,
  getAllTrades,
};
