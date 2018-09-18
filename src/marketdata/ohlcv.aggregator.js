const logger = require('../logger');

const ohlcv_timer = require('./ohlcv.timer');
const ohlcv_data = require('./ohlcv.data');
const ohlcv_service = require('./ohlcv.service');

const {
  timeResolutionValueArray,
  timeResolutionTypeArray
} = require('../app.constants');


// load all unsaved being built market data in DB
const init = async () => {
  // hard code
  const currencyArray = ['BTC'];
  const baseCurrencyArray = ['USDT'];

  // get the last unsaved market data from trade table
  // - get last start time for each pair of currency of each time resolution
  // - for each start time, load the last saved trade and all unsaved trades

  /*
  lastStartTime = {
    currency0: {
      baseCurrency0: {
        timeResolutionType0: lastStartTime0,
        ...
      }
    },
    ...
  }
  */
  const lastStartTime = {};
  for (let i = 0; i < currencyArray.length; i += 1) {
    lastStartTime[currencyArray[i]] = {};
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      lastStartTime[currencyArray[i]][baseCurrencyArray[j]] = {};
      const lastStartTimeOfCurrencyPairPromises = [];
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        lastStartTimeOfCurrencyPairPromises.push(ohlcv_service.getLastMarketDataStartTime(timeResolutionTypeArray[k], currencyArray[i], baseCurrencyArray[j]));
      }
      const lastStartTimeOfCurrencyPair = await Promise.all(lastStartTimeOfCurrencyPairPromises);
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        if (lastStartTimeOfCurrencyPair[k]) {
          lastStartTime[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]] = lastStartTimeOfCurrencyPair[k];
        }
      }
    }
  }
  logger.info(`ohlcv.aggregator.js init(): lastStartTime=${JSON.stringify(lastStartTime,null,2)}`);

  /*
   beCheckedTradeData = {
    currency0: {
      baseCurrency0: {
        timeResolutionType0: {
          unsavedTradeData [<Array of unsaved market data in format of trade object>],
          lastSavedTradeData: last trade object
        }
      }
    },
    ...
   }
  */
  const beCheckedTradeData = {};
  for (let i = 0; i < currencyArray.length; i += 1) {
    beCheckedTradeData[currencyArray[i]] = {};
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]] = {};
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        const tmp_lastStartTime = lastStartTime[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]];
        if (tmp_lastStartTime) {
          const nextStartTime = ohlcv_timer.getNextStartTime(tmp_lastStartTime, timeResolutionTypeArray[k]);
          const lastTimeStamp = new Date(nextStartTime);
          beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]] = {
            unsavedTradeData: await ohlcv_service.getAllTradesAfterTime(currencyArray[i], baseCurrencyArray[j], lastTimeStamp),
            lastSavedTradeData: await ohlcv_service.getFirstTradeBeforeTime(currencyArray[i], baseCurrencyArray[j], lastTimeStamp),
          };
        }
        else {
          beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]] = {
            unsavedTradeData: await ohlcv_service.getAllTradesOfCurrencyPair(currencyArray[i], baseCurrencyArray[j]),
          };
        }
      }
    }
  }
  logger.info(`ohlcv.aggregator.js init(): beCheckedTradeData=${JSON.stringify(beCheckedTradeData,null,2)}`);

  // for each data of each resolution of each pair currency:
  // if no market data for this time resolution (tmp_lastStartTime = null):
  //  - if no toBeSavedTradeEvents: just create data set for current start time
  //  - else: create data set with start time = toBeSavedTradeEvents[0].executedTime and put all toBeSavedTradeEvents to this data set
  // else: there is market data for this time resolution (tmp_lastStartTime != null)
  //  create new data set with start time is next start time of executed time of last saved trade
  //  set last close price for data set
  //  - if no new trade event (!toBeSavedTradeEvents || toBeSavedTradeEvents.length = 0): some thing error! (how was last market data saved?)  //
  //  - else (there are some unprocessed trade events): put all toBeSavedTradeEvents to this data set

  for (let i = 0; i < currencyArray.length; i += 1) {
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        const toBeSavedTradeEvents = beCheckedTradeData[currencyArray[i]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]].unsavedTradeData;
        const lastSavedTradeEvent = beCheckedTradeData[currencyArray[i]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]].lastSavedTradeData;
        const tmp_lastStartTime = lastStartTime[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]];
        const currentStartTime = ohlcv_timer.getCurrentStartTime(timeResolutionValueArray[k]);
        if (!tmp_lastStartTime) { // no market data for this time resolution
          // if no toBeSavedTradeEvents: just create data for current start time
          if (!toBeSavedTradeEvents || toBeSavedTradeEvents.length === 0) {
            ohlcv_data.createData(timeResolutionTypeArray[k], currentStartTime, currencyArray[i], baseCurrencyArray[j]);
          }
          // else: put all toBeSavedTradeEvents in order
          else {
            const firstStartTime = ohlcv_timer.getStartTimeOfTimeStamp(timeResolutionTypeArray[k], toBeSavedTradeEvents[0].executedAt);
            ohlcv_data.createData(timeResolutionTypeArray[k], firstStartTime, currencyArray[i], baseCurrencyArray[j]);
            for (let l = 0; l < toBeSavedTradeEvents.length; l += 1) {
              await ohlcv_data.updateDataForResolution(timeResolutionTypeArray[k], toBeSavedTradeEvents[l]);
            }
          }
        }
        else { // there is market data for this time resolution
          const startTimeOfLastSavedTrade = ohlcv_timer.getStartTimeOfTimeStamp(timeResolutionTypeArray[k], lastSavedTradeEvent.executedAt);
          const startTime = ohlcv_timer.getNextStartTime(startTimeOfLastSavedTrade, timeResolutionTypeArray[k]);
          ohlcv_data.createData(timeResolutionTypeArray[k], startTime, currencyArray[i], baseCurrencyArray[j]);
          const lastClosePrice = lastSavedTradeEvent.price;
          ohlcv_data.setLastClosePrice(timeResolutionTypeArray[k], currencyArray[i], baseCurrencyArray[j], lastClosePrice);

          // if no toBeSavedTradeEvents:
          if (!toBeSavedTradeEvents || toBeSavedTradeEvents.length === 0) {
            //  SOME THING ERROR!
            logger.error(`ohlcv.aggregator.js init(): Error`);
          }
          // else: there is toBeSavedTradeEvents
          else {
            //put all toBeSavedTradeEvents to this data set
            for (let l = 0; l < toBeSavedTradeEvents.length; l += 1) {
              if (toBeSavedTradeEvents[l].executedAt.getTime() > tmp_lastStartTime) // redundant check
                await ohlcv_data.updateDataForResolution(timeResolutionTypeArray[k], toBeSavedTradeEvents[l]);
            }
          }
        }
      }
    }
  }
  logger.info(`ohlcv.aggregator.js init(): data=${JSON.stringify(ohlcv_data.data,null,2)}`);
};

init().then(() => {
  logger.info('ohlcv.aggregator.js init(): finish initiation');
  // start ohlcv timer
  //ohlcv_timer.begin();
});

const collectTrade = (tradeEvent) => {
  logger.info(`ohlcv.aggregator.js collectTrade(): tradeEvent=${JSON.stringify(tradeEvent)}`);
  ohlcv_data.updateData(tradeEvent);
  logger.info(`ohlcv.aggregator.js collectTrade(): data=${JSON.stringify(ohlcv_data.data,null,2)}`);
};

module.exports = {
  collectTrade,
};
// TODO: handle this case
