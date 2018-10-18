const logger = require('../logger');

const ohlcvTimer = require('./ohlcvTimer');
const {
  OhlcvResolutionDataSet
} = require('./ohlcvData');
const ohlcvService = require('./ohlcv.service');

const requestNamespace = require('../config/requestNamespace');

const {
  OHLCV_COLLECTIONS: OHLCV_RESOLUTIONS
} = require('../app.constants');

const GET_OHLCV_DATA_EVENT = 'GET_OHLCV_DATA_EVENT';

class OhlcvAggregator {
  constructor(currency, baseCurrency) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
    this.ohlcvDataSet = new OhlcvResolutionDataSet(this.currency, this.baseCurrency);
  }

  async init() {
    // get the last unsaved market data from trade table
    // - get last start time for each time resolution
    // - for each start time, load the last saved trade and all unsaved trades

    const lastStartTime = {};

    const lastStartTimeOfCurrencyPairPromises = [];
    for (let k = 0; k < OHLCV_RESOLUTIONS.length; k += 1) {
      lastStartTimeOfCurrencyPairPromises.push(ohlcvService.getLastMarketDataStartTime(this.currency, this.baseCurrency, OHLCV_RESOLUTIONS[k]));
    }
    const lastStartTimeOfCurrencyPair = await Promise.all(lastStartTimeOfCurrencyPairPromises);
    for (let k = 0; k < OHLCV_RESOLUTIONS.length; k += 1) {
      lastStartTime[OHLCV_RESOLUTIONS[k]] = lastStartTimeOfCurrencyPair[k];
    }
    logger.info(`ohlcvAggregator.js init(): lastStartTime=${JSON.stringify(lastStartTime, null, 2)}`);

    /*
     beCheckedTradeData = {
        timeResolutionType0: {
          unsavedTradeData [<Array of unsaved market data in format of trade object>],
          lastSavedTradeData: last trade object
        }
      ...
     }
    */
    const beCheckedTradeData = {};

    for (let k = 0; k < OHLCV_RESOLUTIONS.length; k += 1) {
      if (lastStartTime[OHLCV_RESOLUTIONS[k]]) {
        const nextStartTime = ohlcvTimer.getNextStartTime(lastStartTime[OHLCV_RESOLUTIONS[k]], OHLCV_RESOLUTIONS[k]);
        const lastTimeStamp = new Date(nextStartTime);
        beCheckedTradeData[OHLCV_RESOLUTIONS[k]] = {
          unsavedTradeData: await ohlcvService.getAllTradesAfterTime(this.currency, this.baseCurrency, lastTimeStamp),
          lastSavedTradeData: await ohlcvService.getFirstTradeBeforeTime(this.currency, this.baseCurrency, lastTimeStamp),
        };
      }
      else {
        beCheckedTradeData[OHLCV_RESOLUTIONS[k]] = {
          unsavedTradeData: await ohlcvService.getAllTradesOfCurrencyPair(this.currency, this.baseCurrency),
        };
      }
    }
    logger.info(`ohlcvAggregator.js init(): beCheckedTradeData=${JSON.stringify(beCheckedTradeData, null, 2)}`);

    // for each data of each resolution of each pair currency:
    // if no market data for this time resolution (tmp_lastStartTime = null):
    //  - if no toBeSavedTradeEvents: just create data set for current start time
    //  - else: create data set with start time = toBeSavedTradeEvents[0].executedTime and put all toBeSavedTradeEvents to this data set
    // else: there is market data for this time resolution (tmp_lastStartTime != null)
    //  create new data set with start time is next start time of executed time of last saved trade
    //  set last close price for data set
    //  - if no new trade event (!toBeSavedTradeEvents || toBeSavedTradeEvents.length = 0): some thing error! (how was last market data saved?)  //
    //  - else (there are some unprocessed trade events): put all toBeSavedTradeEvents to this data set

    for (let k = 0; k < OHLCV_RESOLUTIONS.length; k += 1) {
      const toBeSavedTradeEvents = beCheckedTradeData[OHLCV_RESOLUTIONS[k]].unsavedTradeData;
      const lastSavedTradeEvent = beCheckedTradeData[OHLCV_RESOLUTIONS[k]].lastSavedTradeData;
      const lastStartTimeOfThisResolution = lastStartTime[OHLCV_RESOLUTIONS[k]];
      const currentStartTime = ohlcvTimer.getCurrentStartTime(OHLCV_RESOLUTIONS[k]);
      if (!lastStartTimeOfThisResolution) { // no market data for this time resolution
        // if no toBeSavedTradeEvents: just create data for current start time
        if (!toBeSavedTradeEvents || toBeSavedTradeEvents.length === 0) {
          this.ohlcvDataSet.createData(OHLCV_RESOLUTIONS[k], currentStartTime);
        }
        // else: put all toBeSavedTradeEvents in order
        else {
          const firstStartTime = ohlcvTimer.getStartTimeOfTimeStamp(OHLCV_RESOLUTIONS[k], toBeSavedTradeEvents[0].executedAt);
          this.ohlcvDataSet.createData(OHLCV_RESOLUTIONS[k], firstStartTime);
          for (let l = 0; l < toBeSavedTradeEvents.length; l += 1) {
            this.updateDataForResolutionUsingTradeObject(OHLCV_RESOLUTIONS[k], toBeSavedTradeEvents[l]);
          }
        }
      }
      else { // there is market data for this time resolution
        const startTimeOfLastSavedTrade = ohlcvTimer.getStartTimeOfTimeStamp(OHLCV_RESOLUTIONS[k], lastSavedTradeEvent.executedAt);
        const startTime = ohlcvTimer.getNextStartTime(startTimeOfLastSavedTrade, OHLCV_RESOLUTIONS[k]);
        this.ohlcvDataSet.createData(OHLCV_RESOLUTIONS[k], startTime);
        const lastClosePrice = lastSavedTradeEvent.price;
        this.ohlcvDataSet.setLastClosePrice(OHLCV_RESOLUTIONS[k], lastClosePrice);

        // if no toBeSavedTradeEvents:
        if (!toBeSavedTradeEvents || toBeSavedTradeEvents.length === 0) {
          //  SOME THING ERROR!
          logger.error(`ohlcvAggregator.js init(): Error`);
        }
        // else: there is toBeSavedTradeEvents
        else {
          //put all toBeSavedTradeEvents to this data set
          for (let l = 0; l < toBeSavedTradeEvents.length; l += 1) {
            if (toBeSavedTradeEvents[l].executedAt.getTime() > lastStartTimeOfThisResolution){ // redundant check
              this.updateDataForResolutionUsingTradeObject(OHLCV_RESOLUTIONS[k], toBeSavedTradeEvents[l]);
            }
          }
        }
      }
    }
    logger.info(`ohlcvAggregator.js init(): data=${JSON.stringify(this.ohlcvDataSet,null,2)}`);
  }

  async recordDataAndResetStartTime(timeResolutionType, startTime) {
    const ohlcvDataOfTimeResolution = this.ohlcvDataSet.resolutionDataSet[timeResolutionType];
    if (ohlcvDataOfTimeResolution) {
      logger.info(`ohlcvAggregator.js recordDataAndResetStartTime(): timeResolutionType=${timeResolutionType} startTime=${startTime}`);
      const dataToRecordInDB = ohlcvDataOfTimeResolution.reset(startTime);
      if (dataToRecordInDB) ohlcvService.recordMarketData(timeResolutionType, dataToRecordInDB);
    }
    else {
      logger.error(`ohlcvAggregator.js recordDataAndResetStartTime(): ERROR: no timeResolutionType=${timeResolutionType} found`);
    }
  }

  // only use for init
  async updateDataForResolutionUsingTradeObject(timeResolutionType, tradeObject) {
    logger.info(`ohlcvAggregator.js updateDataForResolutionUsingTradeObject(): tradeObject=${JSON.stringify(tradeObject)}`);

    const ohlcvTradeData = {
      open: tradeObject.price,
      high: tradeObject.price,
      low: tradeObject.price,
      close: tradeObject.price,
      volume: tradeObject.quantity,
      time: tradeObject.matchedAt.getTime(),
    };

    const ohlcvDataOfTimeResolution = this.ohlcvDataSet.resolutionDataSet[timeResolutionType];
    if (!ohlcvDataOfTimeResolution) {
      logger.error(`ohlcvAggregator.js updateDataForResolutionUsingTradeObject(): ERROR: Data of resolution ${timeResolutionType} must be created first`);
    }
    if (ohlcvTradeData.time < ohlcvDataOfTimeResolution.startTime) {
      logger.error(`ohlcvAggregator.js updateDataForResolutionUsingTradeObject(): ERROR ohlcvTradeData.time=${ohlcvTradeData.time} < currentStartTime=${ohlcvDataOfTimeResolution.startTime}`);
    }
    else if (this.ohlcvDataSet.isInCurrentAggregatingPeriod(timeResolutionType, ohlcvTradeData.time)) {
      ohlcvDataOfTimeResolution.aggregate(ohlcvTradeData);
    }
    else {
      while (!this.ohlcvDataSet.isInCurrentAggregatingPeriod(timeResolutionType, ohlcvTradeData.time)) {
        const nextStartTime = ohlcvTimer.getNextStartTime(ohlcvDataOfTimeResolution.startTime, timeResolutionType);
        this.recordDataAndResetStartTime(timeResolutionType, nextStartTime);
      }
      ohlcvDataOfTimeResolution.aggregate(ohlcvTradeData);
    }
  }

  /*
   const ohlcvTradeData = {
      open,
      high,
      low,
      close,
      volume,
      time,
   }
   */
  async collectOhlcvTradeData(ohlcvTradeData) {
    logger.info(`ohlcvAggregator.js collectTrade(): tradeEvent=${JSON.stringify(ohlcvTradeData)}`);

    for (let i = 0; i < OHLCV_RESOLUTIONS.length; i += 1) {
      const ohlcvDataOfTimeResolution = this.ohlcvDataSet.resolutionDataSet[OHLCV_RESOLUTIONS[i]];
      if (ohlcvTradeData.time < ohlcvDataOfTimeResolution.startTime) {
        logger.error(`ohlcvAggregator.js collectTrade(): ERROR ohlcvTradeData.time=${ohlcvTradeData.time} < currentStartTime=${ohlcvDataOfTimeResolution.startTime}`);
      }
      else if (this.ohlcvDataSet.isInCurrentAggregatingPeriod(OHLCV_RESOLUTIONS[i], ohlcvTradeData.time)) {
        ohlcvDataOfTimeResolution.aggregate(ohlcvTradeData);
      }
      else {
        while (!this.ohlcvDataSet.isInCurrentAggregatingPeriod(OHLCV_RESOLUTIONS[i], ohlcvTradeData.time)) {
          const nextStartTime = ohlcvTimer.getNextStartTime(ohlcvDataOfTimeResolution.startTime, OHLCV_RESOLUTIONS[i]);
          this.recordDataAndResetStartTime(OHLCV_RESOLUTIONS[i], nextStartTime);
        }
        ohlcvDataOfTimeResolution.aggregate(ohlcvTradeData);
      }
    }
    logger.info(`ohlcvAggregator.js collectTrade(): data=${JSON.stringify(this.ohlcvDataSet.resolutionDataSet, null, 2)}`);
  }

  async getCollectedOhlcvData(timeResolution, fromTimeTS, toTimeTS) {
    logger.info(`ohlcvAggregator.js getCollectedOhlcvData(): timeResolution=${timeResolution}`);

    const ohlcvDataInDB = await ohlcvService.getMarketData(this.currency, this.baseCurrency, timeResolution, fromTimeTS, toTimeTS, true);
    logger.debug(`ohlcvAggregator.js getCollectedOhlcvData(): ohlcvDataInDB=${JSON.stringify(ohlcvDataInDB)}`);

    const ohlcvDataOnRAM = this.ohlcvDataSet.getCurrentOhlcvData(timeResolution);
    logger.debug(`ohlcvAggregator.js getCollectedOhlcvData(): ohlcvDataOnRAM=${JSON.stringify(ohlcvDataOnRAM)}`);

    if (ohlcvDataOnRAM && ohlcvDataOnRAM.close && ohlcvDataOnRAM.time && ohlcvDataOnRAM.time < toTimeTS) {
      ohlcvDataInDB.push(ohlcvDataOnRAM);

      let nextStartTime = ohlcvTimer.getNextStartTime(ohlcvDataOnRAM.time, timeResolution);
      const lastClosePrice = ohlcvDataOnRAM.close;
      while (nextStartTime <= toTimeTS) {
        ohlcvDataInDB.push({
          open: lastClosePrice,
          close: lastClosePrice,
          high: lastClosePrice,
          low: lastClosePrice,
          volume: 0,
          time: nextStartTime,
        });
        nextStartTime = ohlcvTimer.getNextStartTime(nextStartTime, timeResolution);
      }
    }

    return ohlcvDataInDB;
  }
}

const ohlcvAggregator = new OhlcvAggregator('BTC', 'USDT');
ohlcvAggregator.init().then(() => {
  logger.info('ohlcvAggregator.js init(): finished initiation');
});

const handleMessage = async (event) => {
  requestNamespace.set('requestId', event.requestId);
  switch (event.type) {
    case GET_OHLCV_DATA_EVENT: {
      logger.debug(`ohlcvAggregator.js: received a message from parent process = ${JSON.stringify(event)}`);

      const data = await ohlcvAggregator.getCollectedOhlcvData(event.resolution, event.from, event.to);
      logger.info(`ohlcvAggregator.js: data to return = ${JSON.stringify(data)}`);

      process.send({
        id: event.id,
        type: GET_OHLCV_DATA_EVENT,
        data
      });

      break;
    }
  }
};

process.on('message', (event) => {
  logger.debug(`ohlcvAggregator.js: received a message = ${JSON.stringify(event)}`);
  const handle = requestNamespace.bind(handleMessage);
  handle(event);
});

module.exports = ohlcvAggregator;
