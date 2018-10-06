const {RESOLUTION_2_AGGREGATING_PERIOD_LENGTH} = require('./ohlcvTimer');

class OhlcvData {
  constructor(currency, baseCurrency, startTime) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.startTime = startTime;
    this.lastClosePrice = null;
    this.data = null;
  }

  aggregate(tradeEvent) {
    if (!this.data) this.data = {};
    if (!this.data.open) this.data.open = tradeEvent.price;
    this.data.close = tradeEvent.price;
    this.data.high = this.data.high ? Math.max(tradeEvent.price, this.data.high) : tradeEvent.price;
    this.data.low = this.data.low ? Math.min(tradeEvent.price, this.data.low) : tradeEvent.price;
    this.data.volume = this.data.volume ? (this.data.volume + tradeEvent.quantity) : tradeEvent.quantity;
    this.lastClosePrice = tradeEvent.price;
  }

  reset(startTime) {
    let dataToRecordInDB = null;
    if (this.data && this.data.open) {
      dataToRecordInDB = Object.assign({}, this.data);
      dataToRecordInDB.time = this.startTime;
      dataToRecordInDB.currency = this.currency;
      dataToRecordInDB.baseCurrency = this.baseCurrency;
      dataToRecordInDB.createdAt = new Date();
      this.data.open = null;
      this.data.close = null;
      this.data.high = null;
      this.data.low = null;
      this.data.volume = null;
    }
    else if (this.lastClosePrice) {
      dataToRecordInDB = {
        open: this.lastClosePrice,
        close: this.lastClosePrice,
        high: this.lastClosePrice,
        low: this.lastClosePrice,
        volume: 0,
        time: this.startTime,
        currency: this.currency,
        baseCurrency: this.baseCurrency,
        createdAt: new Date(),
      };
    }
    this.startTime = startTime;
    return dataToRecordInDB;
  }
}

class OhlcvResolutionDataSet {
  constructor(currency, baseCurrency) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.resolutionDataSet = {};
  }

  createData(timeResolutionType, startTime) {
    if (!this.resolutionDataSet[timeResolutionType]) {
      this.resolutionDataSet[timeResolutionType] = new OhlcvData(this.currency, this.baseCurrency, startTime);
    }
  }

  setLastClosePrice(timeResolutionType, lastClosePrice) {
    this.resolutionDataSet[timeResolutionType].lastClosePrice = lastClosePrice;
  }

  getCurrentOhlcvData(timeResolutionType) {
    if (!this.resolutionDataSet[timeResolutionType].data) return null;

    const currentMarketData = Object.assign({}, this.resolutionDataSet[timeResolutionType].data);
    currentMarketData.time = this.resolutionDataSet[timeResolutionType].startTime;
    return currentMarketData;
  }

  isInCurrentAggregatingPeriod(timeResolutionType, timeStamp) {
    const startTime = this.resolutionDataSet[timeResolutionType] && this.resolutionDataSet[timeResolutionType].startTime;
    const timeStampTS = timeStamp.getTime();
    const periodLength = RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType];
    if (timeStampTS < startTime) return false;
    return timeStampTS - startTime <= periodLength;
  }
}

module.exports = {
  OhlcvResolutionDataSet,
};
