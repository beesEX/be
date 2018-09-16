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
  // - get last tick time for each pair of currency (if each time resolution has a tick time, choose the smallest)
  // - for each tick time, load data from trade table via calling trade service

  /*
  lastTickTime = {
    currency0: {
      baseCurrency0: {
        timeResolutionType0: lastTickTime0,
        ...
      }
    },
    ...
  }
  */
  const lastTickTime = {};
  for (let i = 0; i < currencyArray.length; i += 1) {
    lastTickTime[currencyArray[i]] = {};
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      lastTickTime[currencyArray[i]][baseCurrencyArray[j]] = {};
      const lastTickOfCurrencyPairPromises = [];
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        lastTickOfCurrencyPairPromises.push(ohlcv_service.getLastMarketDataTimeTick(timeResolutionTypeArray[k], currencyArray[i], baseCurrencyArray[j]));
      }
      const lastTickOfCurrencyPair = await Promise.all(lastTickOfCurrencyPairPromises);
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        if(lastTickOfCurrencyPair[k]) {
          lastTickTime[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]] = lastTickOfCurrencyPair[k];
        }
      }
    }
  }
  logger.info(`ohlcv.aggregator.js init(): lastTickTime=${JSON.stringify(lastTickTime,null,2)}`);

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
        const lastTick = lastTickTime[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]];
        if (lastTick) {
          const lastTimeStamp = new Date(lastTick * 1000);
          beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]] = {
            unsavedTradeData: await ohlcv_service.getAllTradesFromTime(currencyArray[i], baseCurrencyArray[j], lastTimeStamp),
            lastSavedTradeData: await ohlcv_service.getLastTradeBeginTime(currencyArray[i], baseCurrencyArray[j], lastTimeStamp),
          };
        }
        else {
          beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]] = {
            unsavedTradeData: await ohlcv_service.getAllTrades(currencyArray[i], baseCurrencyArray[j]),
          };
        }
      }
    }
  }
  logger.info(`ohlcv.aggregator.js init(): beCheckedTradeData=${JSON.stringify(beCheckedTradeData,null,2)}`);

  // for each data of each resolution of each pair currency:
  // if no market data for this time resolution:
  //  - if no toSaveMarketData: just create data for current tick
  //  - else: put all toSaveMarketData in order (for missing data -> set price of lastSavedMarketData for all next ticks)
  // else: there is market data for this time resolution
  //  - if no toSaveMarketData:
  //    + if last tick < current tick: set price of last saved trade for all next tick time
  //    + else: just create data for current tick
  //  - else:
  //    + if last tick <= current tick: put all toSaveMarketData in order (for missing data -> set price of lastSavedMarketData for all next ticks)
  //    + else: error

  for (let i = 0; i < currencyArray.length; i += 1) {
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        const toSaveMarketData = beCheckedTradeData[currencyArray[i]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]].unsavedTradeData;
        const lastSavedMarketData = beCheckedTradeData[currencyArray[i]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]]
          && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]].lastSavedTradeData;
        const lastTick = lastTickTime[currencyArray[i]][baseCurrencyArray[j]][timeResolutionTypeArray[k]];
        const currentTick = ohlcv_timer.getNextTickTimeOfResolution(timeResolutionValueArray[k]);
        if (!lastTick) { // no market data for this time resolution
          // if no toSaveMarketData: just create data for current tick
          if (!toSaveMarketData || toSaveMarketData.length === 0) {
            ohlcv_data.createData(timeResolutionTypeArray[k], currentTick, currencyArray[i], baseCurrencyArray[j]);
          }
          // else: put all toSaveMarketData in order
          else {
            const nextTickTimeOfToSaveData = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], toSaveMarketData[0].executedAt);
            ohlcv_data.createData(timeResolutionTypeArray[k], nextTickTimeOfToSaveData, currencyArray[i], baseCurrencyArray[j]);
            for (let l = 0; l < toSaveMarketData.length; l += 1) {
              await ohlcv_data.addDataForResolution(timeResolutionTypeArray[k], toSaveMarketData[l]);
            }
          }
        }
        else { // there is market data for this time resolution
          // if no toSaveMarketData:
          if (!toSaveMarketData || toSaveMarketData.length === 0) {
            //  - if lastSavedMarketData.price: set state of data
            if (lastSavedMarketData && lastSavedMarketData.price) {
              const tickTimeOfLastSavedTrade = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], lastSavedMarketData.executedAt);
              const nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(tickTimeOfLastSavedTrade, timeResolutionTypeArray[k]);
              const lastClosePrice = lastSavedMarketData.price;
              const dataState = {
                open: lastClosePrice,
                high: lastClosePrice,
                low: lastClosePrice,
                close: lastClosePrice,
                volume: 0,
              };
              ohlcv_data.setDataState(timeResolutionTypeArray[k], nextTickTime, currencyArray[i], baseCurrencyArray[j], dataState);
            }
            //  - else: no toSaveMarketData and no lastClosePrice -> just create data for current tick
            else {
              ohlcv_data.createData(timeResolutionTypeArray[k], currentTick, currencyArray[i], baseCurrencyArray[j]);
            }
          }
          // else: there is toSaveMarketData
          //  - if lastSavedMarketData.price: set state of data then put all toSaveMarketData in order
          //  - else: create data set at time tick of first toSaveMarketData then put all toSaveMarketData in order
          else {
            const nextTickTimeOfToSaveData = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], toSaveMarketData[0].executedAt);
            if (lastSavedMarketData && lastSavedMarketData.price) {
              const tickTimeOfLastSavedTrade = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], lastSavedMarketData.executedAt);
              const nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(tickTimeOfLastSavedTrade, timeResolutionTypeArray[k]);
              const lastClosePrice = lastSavedMarketData.price;
              const dataState = {
                open: lastClosePrice,
                high: lastClosePrice,
                low: lastClosePrice,
                close: lastClosePrice,
                volume: 0,
              };
              ohlcv_data.setDataState(timeResolutionTypeArray[k], nextTickTime, currencyArray[i], baseCurrencyArray[j], dataState);
            }
            else {
              ohlcv_data.createData(timeResolutionTypeArray[k], nextTickTimeOfToSaveData, currencyArray[i], baseCurrencyArray[j]);
            }
            for (let l = 0; l < toSaveMarketData.length; l += 1) {
              await ohlcv_data.addDataForResolution(timeResolutionTypeArray[k], toSaveMarketData[l]);
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
  ohlcv_data.addData(tradeEvent);
  logger.info(`ohlcv.aggregator.js collectTrade(): data=${JSON.stringify(ohlcv_data.data,null,2)}`);
};

module.exports = {
  collectTrade,
};
