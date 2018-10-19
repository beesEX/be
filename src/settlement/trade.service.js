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

module.exports = {
  recordTrade,
  getLastTrades,
};
