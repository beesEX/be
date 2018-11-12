const logger = require('../logger');

const db = require('../db');
const constants = require('../app.constants');

const services = {};

for (let i = 0; i < constants.OHLCV_COLLECTIONS.length; i += 1) {
  services[constants.OHLCV_COLLECTIONS[i]] = db.createService(constants.OHLCV_COLLECTIONS[i]);
}

const recordMarketData = async (timeResolutionType, marketData) => {
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
  }, { sort: {time: -1}, limit: 1});
  logger.log(`ohlcv.service.js getLastMarketDataStartTime(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType} marketDataQuery=${JSON.stringify(marketDataQuery)}`);
  return marketDataQuery && marketDataQuery.results && marketDataQuery.results[0] && marketDataQuery.results[0].time;
};

const getMarketData = async (currency, baseCurrency, timeResolutionType, fromTimeTS, toTimeTS, isShortForm = false) => {
  logger.info(`ohlcv.service.js: getMarketData(): currency = ${currency} baseCurrency = ${baseCurrency} timeResolutionType = ${timeResolutionType} startDate = ${fromTimeTS} endDate = ${toTimeTS} `);
  const service = services[timeResolutionType];
  if (!service) {
    logger.error('ohlcv.service.js getMarketData(): no service found');
    return null;
  }

  const options = {sort: {time: 1}};
  if (isShortForm) {
    options.open = 1;
    options.close = 1;
    options.high = 1;
    options.low = 1;
    options.volume = 1;
    options.time = 1;
    options.currency = 0;
    options.baseCurrency = 0;
    options.createdAt = 0;
    options._id = 0;
  }

  const marketDataQuery = await service.find({
    currency,
    baseCurrency,
    time: {$gte: Math.floor(fromTimeTS), $lte: Math.floor(toTimeTS)}
  }, options);

  return (marketDataQuery && marketDataQuery.results) || [];
};

module.exports = {
  getLastMarketDataStartTime,
  recordMarketData,
  getMarketData,
};
