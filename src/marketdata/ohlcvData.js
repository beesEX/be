const logger = require('../logger');


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
    this.dataToRecordInDB.time = this.startTime;
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

class OhlcvResolutionDataSet {
  constructor(currency, baseCurrency) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.resolutionDataSet = {};
  }

  createData (timeResolutionType, startTime) {
    if (!this.resolutionDataSet[timeResolutionType])
      this.resolutionDataSet[timeResolutionType] = new OhlcvData(this.currency, this.baseCurrency, startTime);
  }

  setLastClosePrice (timeResolutionType, lastClosePrice) {
    this.resolutionDataSet[timeResolutionType].lastClosePrice = lastClosePrice;
  }

  getCurrentOhlcvData (timeResolutionType) {
    const currentMarketData = Object.assign({}, this.resolutionDataSet[timeResolutionType].data);
    currentMarketData.time = this.resolutionDataSet[timeResolutionType].startTime;
    return currentMarketData;
  }
}

const ohlcvResolutionDataSet = new OhlcvResolutionDataSet('BTC', 'USDT');

module.exports = ohlcvResolutionDataSet;
