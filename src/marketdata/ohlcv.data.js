const logger = require('../logger');

const ohlcv_service = require('./ohlcv.service');
const ohlcv_timer = require('./ohlcv.timer');

class OhlcvData {
  constructor(currency, baseCurrency, tickTime) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.tickTime = tickTime;
    this.dataToRecordInDB = null;
    this.data = null;
  }

  addData(tradeEvent) {
    if (!this.data) this.data = {};
    if (!this.data.open) this.data.open = tradeEvent.price;
    this.data.close = tradeEvent.price;
    this.data.high = this.data.high ? Math.max(tradeEvent.price, this.data.high) : tradeEvent.price;
    this.data.low = this.data.low ? Math.max(tradeEvent.price, this.data.low) : tradeEvent.price;
    this.data.volume = this.data.volume ? (this.data.volume + tradeEvent.quantity) : tradeEvent.quantity;
  }

  nextTick(tickTime) {
    this.dataToRecordInDB = Object.assign({}, this.data);
    this.dataToRecordInDB.time = parseInt(this.tickTime);
    this.dataToRecordInDB.currency = this.currency;
    this.dataToRecordInDB.baseCurrency = this.baseCurrency;
    this.dataToRecordInDB.createdAt = new Date();
    this.data = null;
    this.tickTime = tickTime;
  }
}

const data = {};

const getSymbol = (currency, baseCurrency) => {
  return `${currency}_${baseCurrency}`;
};

const createData = (currency, baseCurrency, timeResolutionType, tickTime) => {
  const symbol = getSymbol(currency, baseCurrency);
  if (!data[symbol]) data[symbol] = {};
  data[symbol][timeResolutionType] = new OhlcvData(currency, baseCurrency, tickTime);
};

const nextTickForCurrencyPair = async (timeResolutionType, tickTime, currency, baseCurrency) => {
  const symbol = getSymbol(currency, baseCurrency);

  if (data[symbol] && data[symbol][timeResolutionType]) {
    data[symbol][timeResolutionType].nextTick(tickTime);
    const dataToRecordInDB = data[symbol][timeResolutionType].dataToRecordInDB;
    await ohlcv_service.recordMarketData(timeResolutionType, dataToRecordInDB);
  }
};

const nextTick = async (timeResolutionType, tickTime) => {
  // do for all symbol of time resolution type
  const symbolList = Object.getOwnPropertyNames(data);

  // for each ohlcv data set next tick and get data to record
  const dataToRecordPromises = [];
  for (let i = 0; i < symbolList.length; i += 1) {
    if (data[symbolList[i]] && data[symbolList[i]][timeResolutionType]) {
      data[symbolList[i]][timeResolutionType].nextTick(tickTime);
      const dataToRecordInDB = data[symbolList[i]][timeResolutionType].dataToRecordInDB;
      dataToRecordPromises.push(ohlcv_service.recordMarketData(timeResolutionType, dataToRecordInDB));
    }
  }

  await Promise.all(dataToRecordPromises);
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
const addData = async (tradeEvent) => {
  const symbol = getSymbol(tradeEvent.currency, tradeEvent.baseCurrency);

  // add for all time resolution of this symbol
  if (data[symbol]) {
    const resolutionTypeList = Object.getOwnPropertyNames(data[symbol]);
    for (let i = 0; i < resolutionTypeList.length; i += 1) {
      const currentTickTime = data[symbol][resolutionTypeList[i]].tickTime;
      const tradeTickTime = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(resolutionTypeList[i], tradeEvent.createdAt);
      if (tradeTickTime === currentTickTime) {
        data[symbol][resolutionTypeList[i]].addData(tradeEvent);
      }
      else {
        const closePrice = data[symbol][resolutionTypeList[i]].close;
        let nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(currentTickTime, resolutionTypeList[i]);
        while (nextTickTime < tradeTickTime) {
          await nextTickForCurrencyPair(resolutionTypeList[i], tradeTickTime, tradeEvent.currency, tradeEvent.baseCurrency);
          data[symbol][resolutionTypeList[i]].addData({
            currency: tradeEvent.currency,
            baseCurrency: tradeEvent.baseCurrency,
            price: closePrice,
            quantity: 0,
          });
          nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(nextTickTime, resolutionTypeList[i]);
        }
        await nextTickForCurrencyPair(resolutionTypeList[i], tradeTickTime, tradeEvent.currency, tradeEvent.baseCurrency);
        data[symbol][resolutionTypeList[i]].addData(tradeEvent);
      }
    }
  }
};

module.exports = {
  createData,
  nextTickForCurrencyPair,
  nextTick,
  addData,
};
