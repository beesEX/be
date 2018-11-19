const {RESOLUTION_2_AGGREGATING_PERIOD_LENGTH, getCurrentStartTime} = require('./ohlcvTimer');

class OhlcvData {
  constructor(currency, baseCurrency, startTime) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.startTime = startTime;
    this.lastClosePrice = null;
    this.data = null;
  }

  aggregate(ohlcvTradeData) {
    if(!this.data) this.data = {};
    if(!this.data.open) this.data.open = ohlcvTradeData.open;
    this.data.close = ohlcvTradeData.close;
    this.data.high = this.data.high ? Math.max(ohlcvTradeData.high, this.data.high) : ohlcvTradeData.high;
    this.data.low = this.data.low ? Math.min(ohlcvTradeData.low, this.data.low) : ohlcvTradeData.low;
    this.data.volume = this.data.volume ? (this.data.volume + ohlcvTradeData.volume) : ohlcvTradeData.volume;
    this.lastClosePrice = ohlcvTradeData.close;
  }

  reset(startTime) {
    let dataToRecordInDB = null;
    if(this.data && this.data.open) {
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
    else if(this.lastClosePrice) {
      dataToRecordInDB = {
        open: this.lastClosePrice,
        close: this.lastClosePrice,
        high: this.lastClosePrice,
        low: this.lastClosePrice,
        volume: 0,
        time: this.startTime,
        currency: this.currency,
        baseCurrency: this.baseCurrency,
        createdAt: new Date()
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
    if(!this.resolutionDataSet[timeResolutionType].data) return null;

    const currentMarketData = Object.assign({}, this.resolutionDataSet[timeResolutionType].data);
    currentMarketData.time = this.resolutionDataSet[timeResolutionType].startTime;
    return currentMarketData;
  }

  isInCurrentAggregatingPeriod(timeResolutionType, timeStampTS) {
    const startTime = this.resolutionDataSet[timeResolutionType] && this.resolutionDataSet[timeResolutionType].startTime;
    const periodLength = RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType];
    //console.log(`startTime=${startTime} timeStampTS=${timeStampTS} periodLength=${periodLength}`);
    if(timeStampTS < startTime) return false;
    return timeStampTS - startTime <= periodLength;
  }

  reset() {

    const arrayOfResolutions = Object.keys(this.resolutionDataSet);

    arrayOfResolutions.forEach((resolution) => {

      const startTime = getCurrentStartTime(resolution);

      const data = this.resolutionDataSet[resolution].data;

      if(data) {


        if(data.reset) {

          data.reset(startTime);

        }
        else{

          this.resolutionDataSet[resolution].data = null;

        }

      }

    });
  }
}

module.exports = {
  OhlcvResolutionDataSet
};
