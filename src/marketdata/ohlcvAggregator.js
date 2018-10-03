const logger = require('../logger');

const ohlcvTimer = require('./ohlcvTimer');
const ohlcvData = require('./ohlcvData');
const ohlcvService = require('./ohlcv.service');

const requestNamespace = require('../config/requestNamespace');

const {
  OHLCV_COLLECTIONS
} = require('../app.constants');

const GET_OHLCV_DATA_EVENT = 'GET_OHLCV_DATA_EVENT';

class OhlcvAggregator {
  constructor(currency, baseCurrency) {
    this.currency = currency;
    this.baseCurrency = baseCurrency;
  }

  async init() {
    // get the last unsaved market data from trade table
    // - get last start time for each time resolution
    // - for each start time, load the last saved trade and all unsaved trades

    const lastStartTime = {};

    const lastStartTimeOfCurrencyPairPromises = [];
    for (let k = 0; k < OHLCV_COLLECTIONS.length; k += 1) {
      lastStartTimeOfCurrencyPairPromises.push(ohlcvService.getLastMarketDataStartTime(OHLCV_COLLECTIONS[k], this.currency, this.baseCurrency));
    }
    const lastStartTimeOfCurrencyPair = await Promise.all(lastStartTimeOfCurrencyPairPromises);
    for (let k = 0; k < OHLCV_COLLECTIONS.length; k += 1) {
      lastStartTime[OHLCV_COLLECTIONS[k]] = lastStartTimeOfCurrencyPair[k];
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

    for (let k = 0; k < OHLCV_COLLECTIONS.length; k += 1) {
      if (lastStartTime[OHLCV_COLLECTIONS[k]]) {
        const nextStartTime = ohlcvTimer.getNextStartTime(lastStartTime[OHLCV_COLLECTIONS[k]], OHLCV_COLLECTIONS[k]);
        const lastTimeStamp = new Date(nextStartTime);
        beCheckedTradeData[OHLCV_COLLECTIONS[k]] = {
          unsavedTradeData: await ohlcvService.getAllTradesAfterTime(this.currency, this.baseCurrency, lastTimeStamp),
          lastSavedTradeData: await ohlcvService.getFirstTradeBeforeTime(this.currency, this.baseCurrency, lastTimeStamp),
        };
      }
      else {
        beCheckedTradeData[OHLCV_COLLECTIONS[k]] = {
          unsavedTradeData: await ohlcvService.getAllTradesOfCurrencyPair(this.currency, this.baseCurrency),
        };
      }
    }
    logger.info(`ohlcvAggregator.js init(): beCheckedTradeData=${JSON.stringify(beCheckedTradeData,null,2)}`);

    // for each data of each resolution of each pair currency:
    // if no market data for this time resolution (tmp_lastStartTime = null):
    //  - if no toBeSavedTradeEvents: just create data set for current start time
    //  - else: create data set with start time = toBeSavedTradeEvents[0].executedTime and put all toBeSavedTradeEvents to this data set
    // else: there is market data for this time resolution (tmp_lastStartTime != null)
    //  create new data set with start time is next start time of executed time of last saved trade
    //  set last close price for data set
    //  - if no new trade event (!toBeSavedTradeEvents || toBeSavedTradeEvents.length = 0): some thing error! (how was last market data saved?)  //
    //  - else (there are some unprocessed trade events): put all toBeSavedTradeEvents to this data set

    for (let k = 0; k < OHLCV_COLLECTIONS.length; k += 1) {
      const toBeSavedTradeEvents = beCheckedTradeData[OHLCV_COLLECTIONS[k]].unsavedTradeData;
      const lastSavedTradeEvent = beCheckedTradeData[OHLCV_COLLECTIONS[k]].lastSavedTradeData;
      const lastStartTimeOfThisResolution = lastStartTime[OHLCV_COLLECTIONS[k]];
      const currentStartTime = ohlcvTimer.getCurrentStartTime(OHLCV_COLLECTIONS[k]);
      if (!lastStartTimeOfThisResolution) { // no market data for this time resolution
        // if no toBeSavedTradeEvents: just create data for current start time
        if (!toBeSavedTradeEvents || toBeSavedTradeEvents.length === 0) {
          ohlcvData.createData(OHLCV_COLLECTIONS[k], currentStartTime);
        }
        // else: put all toBeSavedTradeEvents in order
        else {
          const firstStartTime = ohlcvTimer.getStartTimeOfTimeStamp(OHLCV_COLLECTIONS[k], toBeSavedTradeEvents[0].executedAt);
          ohlcvData.createData(OHLCV_COLLECTIONS[k], firstStartTime);
          for (let l = 0; l < toBeSavedTradeEvents.length; l += 1) {
            await this.updateDataForResolution(OHLCV_COLLECTIONS[k], toBeSavedTradeEvents[l]);
          }
        }
      }
      else { // there is market data for this time resolution
        const startTimeOfLastSavedTrade = ohlcvTimer.getStartTimeOfTimeStamp(OHLCV_COLLECTIONS[k], lastSavedTradeEvent.executedAt);
        const startTime = ohlcvTimer.getNextStartTime(startTimeOfLastSavedTrade, OHLCV_COLLECTIONS[k]);
        ohlcvData.createData(OHLCV_COLLECTIONS[k], startTime);
        const lastClosePrice = lastSavedTradeEvent.price;
        ohlcvData.setLastClosePrice(OHLCV_COLLECTIONS[k], lastClosePrice);

        // if no toBeSavedTradeEvents:
        if (!toBeSavedTradeEvents || toBeSavedTradeEvents.length === 0) {
          //  SOME THING ERROR!
          logger.error(`ohlcvAggregator.js init(): Error`);
        }
        // else: there is toBeSavedTradeEvents
        else {
          //put all toBeSavedTradeEvents to this data set
          for (let l = 0; l < toBeSavedTradeEvents.length; l += 1) {
            if (toBeSavedTradeEvents[l].executedAt.getTime() > lastStartTimeOfThisResolution) // redundant check
              await this.updateDataForResolution(OHLCV_COLLECTIONS[k], toBeSavedTradeEvents[l]);
          }
        }
      }
    }
    logger.info(`ohlcvAggregator.js init(): data=${JSON.stringify(ohlcvData,null,2)}`);
  }

  // TODO: handle recordMarketDataAndSetStartTimeForCurrencyPair to avoid duplicate call
  async recordMarketDataAndSetStartTimeForCurrencyPair (timeResolutionType, startTime) {
    if (ohlcvData.resolutionDataSet[timeResolutionType]) {
      const dataToRecordInDB = ohlcvData.resolutionDataSet[timeResolutionType].getDataToRecordAndSetStartTime(startTime);
      await ohlcvService.recordMarketData(timeResolutionType, dataToRecordInDB);
    }
  }

  // only use for init
  async updateDataForResolution (timeResolutionType, tradeObject) {
    logger.info(`ohlcvAggregator.js updateDataForResolution(): tradeEvent=${JSON.stringify(tradeObject)}`);
    const mapOfResolutionAndData = ohlcvData.resolutionDataSet[timeResolutionType];
    if (mapOfResolutionAndData) {
      //TODO: maybe split this line in multiple lines so the logic will be easier to understand. E.g.
      //const resolutionType = resolutionTypeList[i];
      //const dataPoint = mapOfResolutionAndData[resolutionType];
      //const startTime = dataPoint.startTime; // this line might be no necessary
      const currentStartTime = mapOfResolutionAndData.startTime;
      const tradeExecutedTime = ohlcvTimer.getStartTimeOfTimeStamp(timeResolutionType, tradeObject.executedAt);
      if (tradeExecutedTime === currentStartTime || !mapOfResolutionAndData.lastClosePrice) {
        mapOfResolutionAndData.updateData(tradeObject);
      }
      else {
        const closePrice = mapOfResolutionAndData.data.close;
        let nextTickTime = ohlcvTimer.getNextStartTime(currentStartTime, timeResolutionType);
        while (nextTickTime < tradeExecutedTime) {
          await this.recordMarketDataAndSetStartTimeForCurrencyPair(timeResolutionType, nextTickTime);
          mapOfResolutionAndData.updateData({
            currency: tradeObject.currency,
            baseCurrency: tradeObject.baseCurrency,
            price: closePrice,
            quantity: 0,
          });
          nextTickTime = ohlcvTimer.getNextStartTime(nextTickTime, timeResolutionType);
        }
        await this.recordMarketDataAndSetStartTimeForCurrencyPair(timeResolutionType, tradeExecutedTime);
        mapOfResolutionAndData.updateData(tradeObject);
      }
    }
    else {
      logger.error(`ohlcvAggregator.js updateDataForResolution(): ERROR: Data of resolution ${timeResolutionType} must be created first`);
    }
  }


  /*
  const tradeEvent = {
        currency: reasonObj.currency,
        baseCurrency: reasonObj.baseCurrency,
        price: matchList[i].price,
        quantity: matchList[i].tradedQuantity,
        executedAt: orderbookEvent.timestamp,
      };
   */
  async collectTrade (tradeEvent) {
    logger.info(`ohlcvAggregator.js collectTrade(): tradeEvent=${JSON.stringify(tradeEvent)}`);

    const resolutionTypeList = Object.getOwnPropertyNames(ohlcvData.resolutionDataSet);
    for (let i = 0; i < resolutionTypeList.length; i += 1) {
      const currentStartTime = ohlcvData.resolutionDataSet[resolutionTypeList[i]].startTime;
      if (tradeEvent.executedAt.getTime() < currentStartTime) {
        logger.info(`ohlcvAggregator.js collectTrade(): ERROR tradeEvent.executedAt.getTime()=${tradeEvent.executedAt.getTime()} < currentStartTime=${currentStartTime}`);
      }
      else if (ohlcvTimer.isTimeStampInRangeOfStartTime(resolutionTypeList[i], tradeEvent.executedAt, currentStartTime) || !ohlcvData.resolutionDataSet[resolutionTypeList[i]].lastClosePrice) {
        ohlcvData.resolutionDataSet[resolutionTypeList[i]].updateData(tradeEvent);
      }
      else {
        const closePrice = ohlcvData.resolutionDataSet[resolutionTypeList[i]].lastClosePrice;
        let nextStartTime = ohlcvTimer.getNextStartTime(currentStartTime, resolutionTypeList[i]);
        while (!ohlcvTimer.isTimeStampInRangeOfStartTime(resolutionTypeList[i], tradeEvent.executedAt, nextStartTime)) {
          await this.recordMarketDataAndSetStartTimeForCurrencyPair(resolutionTypeList[i], nextStartTime);
          ohlcvData.resolutionDataSet[resolutionTypeList[i]].updateData({
            currency: tradeEvent.currency,
            baseCurrency: tradeEvent.baseCurrency,
            price: closePrice,
            quantity: 0,
          });
          nextStartTime = ohlcvTimer.getNextStartTime(nextStartTime, resolutionTypeList[i]);
        }
        await this.recordMarketDataAndSetStartTimeForCurrencyPair(resolutionTypeList[i], nextStartTime);
        ohlcvData.resolutionDataSet[resolutionTypeList[i]].updateData(tradeEvent);
      }
    }
    logger.info(`ohlcvAggregator.js collectTrade(): data=${JSON.stringify(ohlcvData.resolutionDataSet,null,2)}`);
  }

  async getCollectedOhlcvData (timeResolution, fromTimeTS, toTimeTS) {
    logger.info(`ohlcvAggregator.js getCollectedOhlcvData(): timeResolution=${timeResolution}`);

    const ohlcvDataInDB = await ohlcvService.getMarketData(timeResolution, fromTimeTS, toTimeTS, this.currency, this.baseCurrency);
    logger.debug(`ohlcvAggregator.js getCollectedOhlcvData(): ohlcvDataInDB=${JSON.stringify(ohlcvDataInDB)}`);

    const ohlcvDataOnRAM = ohlcvData.getCurrentOhlcvData(timeResolution);
    logger.debug(`ohlcvAggregator.js getCollectedOhlcvData(): ohlcvDataOnRAM=${JSON.stringify(ohlcvDataOnRAM)}`);

    let ohlcvDataToReturn = [];
    if (ohlcvDataInDB && ohlcvDataInDB.length) ohlcvDataToReturn = ohlcvDataInDB;

    if (ohlcvDataOnRAM && ohlcvDataOnRAM.close && ohlcvDataOnRAM.time && ohlcvDataOnRAM.time < toTimeTS) {
      ohlcvDataToReturn.push(ohlcvDataOnRAM);

      let nextStartTime = ohlcvTimer.getNextStartTime(ohlcvDataOnRAM.time, timeResolution);
      const lastClosePrice = ohlcvDataOnRAM.close;
      while (nextStartTime <= toTimeTS) {
        ohlcvDataToReturn.push({
          open: lastClosePrice,
          close: lastClosePrice,
          high: lastClosePrice,
          low: lastClosePrice,
          time: nextStartTime,
        });
        nextStartTime = ohlcvTimer.getNextStartTime(nextStartTime, timeResolution);
      }
    }

    return ohlcvDataToReturn;
  }
}

const ohlcvAggregator = new OhlcvAggregator('BTC', 'USDT');
ohlcvAggregator.init().then(() => {
  logger.info('ohlcvAggregator.js init(): finished initiation');
});

// Order Book event handling logic for events received from parent process, sent by beesV8.js
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
