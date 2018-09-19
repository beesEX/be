const logger = require('../logger');

const ohlcv_service = require('./ohlcv.service');
const ohlcv_timer = require('./ohlcv.timer');

class OhlcvData {
  constructor(currency, baseCurrency, startTime) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.startTime = startTime;
    this.dataToRecordInDB = null;
    this.lastClosePrice = null;
    this.data = null;
  }

  updateData(tradeEvent) {
    if (!this.data) this.data = {};
    if (!this.data.open) this.data.open = tradeEvent.price;
    this.data.close = tradeEvent.price;
    this.data.high = this.data.high ? Math.max(tradeEvent.price, this.data.high) : tradeEvent.price;
    this.data.low = this.data.low ? Math.min(tradeEvent.price, this.data.low) : tradeEvent.price;
    this.data.volume = this.data.volume ? (this.data.volume + tradeEvent.quantity) : tradeEvent.quantity;
    this.lastClosePrice = tradeEvent.price;
  }

  getDataToRecordAndSetStartTime(startTime) {
    this.dataToRecordInDB = Object.assign({}, this.data);
    this.dataToRecordInDB.startTime = this.startTime;
    this.dataToRecordInDB.currency = this.currency;
    this.dataToRecordInDB.baseCurrency = this.baseCurrency;
    this.dataToRecordInDB.createdAt = new Date();
    this.data.open = null;
    this.data.close = null;
    this.data.high = null;
    this.data.low = null;
    this.data.volume = 0;
    this.startTime = startTime;

    return this.dataToRecordInDB;
  }
}

// [Tung]: remove this var and move all functions below into the class OhlcvData above. Each orderbook instance owns an
// ohlcv aggregator instance which owns an ohlcv data instance, so you don't need to hold the current state of aggregating
// of all currency pairs in an object like this. Try to write the code a little mode object-oriented, we have ES6!
// Actually, i'm not really happy with the name `OhlcvData` of the class, after moving all the functions below into the class,
// it will then become a class containing not only current state of aggregating results, but core logic of ohlcv aggregating,
// so pls try to rename it some how more adequately
const data = {};

const getSymbol = (currency, baseCurrency) => { // [Tung]: this util functions should be then removed
  return `${currency}_${baseCurrency}`;
};

const createData = (timeResolutionType, startTime, currency, baseCurrency) => {
  const symbol = getSymbol(currency, baseCurrency);
  if (!data[symbol]) data[symbol] = {};
  data[symbol][timeResolutionType] = new OhlcvData(currency, baseCurrency, startTime);
};

const setLastClosePrice = (timeResolutionType, currency, baseCurrency, lastClosePrice) => {
  const symbol = getSymbol(currency, baseCurrency);
  if (!data[symbol] || !data[symbol][timeResolutionType]) return null; // ERROR
  data[symbol][timeResolutionType].lastClosePrice = lastClosePrice;
};


// TODO: handle recordMarketDataAndSetStartTimeForCurrencyPair to avoid duplicate call
const recordMarketDataAndSetStartTimeForCurrencyPair = async (timeResolutionType, startTime, currency, baseCurrency) => {
  const symbol = getSymbol(currency, baseCurrency);
  if (data[symbol] && data[symbol][timeResolutionType]) {
    const dataToRecordInDB = data[symbol][timeResolutionType].getDataToRecordAndSetStartTime(startTime);
    await ohlcv_service.recordMarketData(timeResolutionType, dataToRecordInDB);
  }
};

// only use for init
const updateDataForResolution = async (timeResolutionType, tradeObject) => {
  logger.info(`ohlcv.data.js updateDataForResolution(): tradeEvent=${JSON.stringify(tradeObject)}`);
  const symbol = getSymbol(tradeObject.currency, tradeObject.baseCurrency);
  const mapOfResolutionAndData = data[symbol];
  if (mapOfResolutionAndData) {
    //TODO: maybe split this line in multiple lines so the logic will be easier to understand. E.g.
    //const resolutionType = resolutionTypeList[i];
    //const dataPoint = mapOfResolutionAndData[resolutionType];
    //const startTime = dataPoint.startTime; // this line might be no necessary
    const currentStartTime = mapOfResolutionAndData[timeResolutionType].startTime;
    const tradeExecutedTime = ohlcv_timer.getStartTimeOfTimeStamp(timeResolutionType, tradeObject.executedAt);
    if (tradeExecutedTime === currentStartTime || !mapOfResolutionAndData[timeResolutionType].data) {
      mapOfResolutionAndData[timeResolutionType].updateData(tradeObject);
    }
    else {
      const closePrice = mapOfResolutionAndData[timeResolutionType].data.close;
      let nextTickTime = ohlcv_timer.getNextStartTime(currentStartTime, timeResolutionType);
      while (nextTickTime < tradeExecutedTime) {
        await recordMarketDataAndSetStartTimeForCurrencyPair(timeResolutionType, nextTickTime, tradeObject.currency, tradeObject.baseCurrency);
        mapOfResolutionAndData[timeResolutionType].updateData({
          currency: tradeObject.currency,
          baseCurrency: tradeObject.baseCurrency,
          price: closePrice,
          quantity: 0,
        });
        nextTickTime = ohlcv_timer.getNextStartTime(nextTickTime, timeResolutionType);
      }
      await recordMarketDataAndSetStartTimeForCurrencyPair(timeResolutionType, tradeExecutedTime, tradeObject.currency, tradeObject.baseCurrency);
      mapOfResolutionAndData[timeResolutionType].updateData(tradeObject);
    }
  }
  else {
    logger.error(`ohlcv.data.js updateDataForResolution(): ERROR: undefined symbol=${symbol}`);
  }
};

/*
const tradeEvent = {
      currency: reasonObj.currency,
      baseCurrency: reasonObj.baseCurrency,
      price: matchList[i].price,
      quantity: matchList[i].tradedQuantity,
      executedAt: orderbookEvent.timestamp,
    };
 */
const updateData = async (tradeEvent) => {
  logger.info(`ohlcv.data.js updateData(): tradeEvent=${JSON.stringify(tradeEvent)}`);
  const symbol = getSymbol(tradeEvent.currency, tradeEvent.baseCurrency);

  if (data[symbol]) {
    const resolutionTypeList = Object.getOwnPropertyNames(data[symbol]);
    for (let i = 0; i < resolutionTypeList.length; i += 1) {
      const currentStartTime = data[symbol][resolutionTypeList[i]].startTime;
      if (tradeEvent.executedAt.getTime() < currentStartTime) {
        logger.info(`ohlcv.data.js updateData(): ERROR tradeEvent.executedAt.getTime()=${tradeEvent.executedAt.getTime()} < currentStartTime=${currentStartTime}`);
      }
      else if (ohlcv_timer.isTimeStampInRangeOfStartTime(resolutionTypeList[i], tradeEvent.executedAt, currentStartTime) || !data[symbol][resolutionTypeList[i]].lastClosePrice) {
        data[symbol][resolutionTypeList[i]].updateData(tradeEvent);
      }
      else {
        const closePrice = data[symbol][resolutionTypeList[i]].lastClosePrice;
        let nextStartTime = ohlcv_timer.getNextStartTime(currentStartTime, resolutionTypeList[i]);
        while (!ohlcv_timer.isTimeStampInRangeOfStartTime(resolutionTypeList[i], tradeEvent.executedAt, nextStartTime)) {
          await recordMarketDataAndSetStartTimeForCurrencyPair(resolutionTypeList[i], nextStartTime, tradeEvent.currency, tradeEvent.baseCurrency);
          data[symbol][resolutionTypeList[i]].updateData({
            currency: tradeEvent.currency,
            baseCurrency: tradeEvent.baseCurrency,
            price: closePrice,
            quantity: 0,
          });
          nextStartTime = ohlcv_timer.getNextStartTime(nextStartTime, resolutionTypeList[i]);
        }
        await recordMarketDataAndSetStartTimeForCurrencyPair(resolutionTypeList[i], nextStartTime, tradeEvent.currency, tradeEvent.baseCurrency);
        data[symbol][resolutionTypeList[i]].updateData(tradeEvent);
      }
    }
  }
  else {
    logger.error(`ohlcv.data.js updateData(): ERROR: undefined symbol=${symbol}`);
  }
};

module.exports = {
  data, // only for testing
  createData,
  updateData,
  updateDataForResolution,
  setLastClosePrice,
};
