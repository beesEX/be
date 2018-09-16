const logger = require('../logger');

const db = require('../db');
const {
  timeResolutionTypeArray
} = require('../app.constants');

const services = {};

for (let i = 0; i < timeResolutionTypeArray.length; i += 1) {
  services[timeResolutionTypeArray[i]] = db.createService(timeResolutionTypeArray[i]);
}

const recordMarketData = async (timeResolutionType, marketData) => {
  if (!services[timeResolutionType]) services[timeResolutionType] = db.createService(timeResolutionType);
  logger.log(`ohlcv.service.js recordMarketData(): record timeResolutionType=${timeResolutionType} marketData=${JSON.stringify(marketData)}`);
  const createdMarketData = await services[timeResolutionType].create(marketData);
  return createdMarketData;
};

const getLastMarketDataTimeTick = async (timeResolutionType, currency, baseCurrency) => {
  const marketDataQuery = await services[timeResolutionType].findOne({
    currency,
    baseCurrency,
  }, { sort: {time: -1}});

  logger.log(`ohlcv.service.js getLastMarketDataTimeTick(): marketDataQuery=${JSON.stringify(marketDataQuery)}`);
  return marketDataQuery && marketDataQuery.results && marketDataQuery.results[0] && marketDataQuery.results[0].time;
};

const getMarketData = async (timeResolutionType, startDate, endDate, currency, baseCurrency) => {

  const marketDataQuery = await services[timeResolutionType].find({
    currency,
    baseCurrency,
  }, { sort: {time: 1}, time: {$gt: startDate, $lt: endDate }});

  return marketDataQuery && marketDataQuery.results;
};

module.exports = {
  getLastMarketDataTimeTick,
  recordMarketData,
  getMarketData
};
