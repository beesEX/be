const logger = require('../logger');

const tradeSchema = require('./trade.schema');
const constants = require('../app.constants');
const db = require('../db');

const service = db.createService(constants.DATABASE_DOCUMENTS.TRADES, tradeSchema.schema);

const recordTrade = async (tradeObject) => {
  const recordedTradeObject = await service.create(tradeObject);
  logger.info(`trade.service.js: recordTrade(): recordedTradeObject = ${JSON.stringify(recordedTradeObject)}`);
};

const getLastTrades = async (currency, baseCurrency) => {
  logger.info(`trade.service.js: getLastTrades(): currency=${currency} baseCurrency=${baseCurrency}`);
  const tradeDataQuery = await service.find({
    currency,
    baseCurrency
  }, {sort: {executedAt: -1}, limit: 50});

  return (tradeDataQuery && tradeDataQuery.results) || [];
};

const getAllTradesAfterTime = async (currency, baseCurrency, fromTime) => {
  logger.info(`ohlcv.service.js: getAllTradesAfterTime(): currency = ${currency} baseCurrency = ${baseCurrency} fromTime = ${JSON.stringify(fromTime)}`);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
    executedAt: {$gt: fromTime}
  }, {sort: {executedAt: 1}});
  logger.info(`ohlcv.service.js: getAllTradesAfterTime(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

const getAllTradesOfCurrencyPair = async (currency, baseCurrency) => {
  logger.info(`ohlcv.service.js: getAllTradesOfCurrencyPair(): currency = ${currency} baseCurrency = ${baseCurrency}`);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
  }, {sort: {executedAt: 1}});
  logger.info(`ohlcv.service.js: getAllTradesOfCurrencyPair(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results;
};

const getFirstTradeBeforeTime = async (currency, baseCurrency, beforeTime) => {
  logger.info(`ohlcv.service.js: getFirstTradeBeforeTime(): currency = ${currency} baseCurrency = ${baseCurrency} beginTime = ${JSON.stringify(beforeTime)}`);
  const tradeQuery = await service.find({
    currency,
    baseCurrency,
    executedAt: {$lt: beforeTime}
  }, {sort: {executedAt: -1}, limit: 1});
  logger.info(`ohlcv.service.js: getFirstTradeBeforeTime(): tradeQuery = ${JSON.stringify(tradeQuery)}`);
  return tradeQuery && tradeQuery.results && tradeQuery.results[0];
};

module.exports = {
  recordTrade,
  getLastTrades,
  getAllTradesAfterTime,
  getAllTradesOfCurrencyPair,
  getFirstTradeBeforeTime
};
