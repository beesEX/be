const logger = require('../logger');

const ohlcv_timer = require('./ohlcv.timer');
const ohlcv_data = require('./ohlcv.data');
const ohlcv_service = require('./ohlcv.service');

const tradeExecutionService = require('../settlement/tradeexecution.service');

const {
  timeResolutionValueArray,
  timeResolutionTypeArray
} = require('../app.constants');


// load all unsaved being built market data in DB
const init = async () => {
  // hard code
  const currencyArray = ['BTC'];
  const baseCurrencyArray = ['USTD'];

  // get the last unsaved market data from trade table
  // - get last tick time for each pair of currency (if each time resolution has a tick time, choose the smallest)
  // - for each tick time, load data from trade table via calling trade service

  /*
  lastTickTime = {
    currency0_baseCurrency0: {
      minTick,
      timeResolutionType0: lastTickTime0,
      ...
      timeResolutionTypeN: lastTickTimeN,
    },
    ...
    currencyN_baseCurrencyN: ...
  }
  */
  const lastTickTime = {};
  for (let i = 0; i < currencyArray.length; i += 1) {
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      lastTickTime[`${currencyArray[i]}_${baseCurrencyArray[j]}`] = {};
      let minTick = null;
      const lastTickOfCurrencyPairPromises = [];
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        lastTickOfCurrencyPairPromises.push(ohlcv_service.getLastMarketDataTimeTick(timeResolutionTypeArray[k], currencyArray[i], baseCurrencyArray[j]));
      }
      const lastTickOfCurrencyPair = await Promise.all(lastTickOfCurrencyPairPromises);
      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        if(lastTickOfCurrencyPair[k]) {
          minTick = minTick ? Math.min(minTick, lastTickOfCurrencyPair[k]) : lastTickOfCurrencyPair[k];
          lastTickTime[`${currencyArray[i]}_${baseCurrencyArray[j]}`][timeResolutionTypeArray[k]] = lastTickOfCurrencyPair[k];
        }
      }
      lastTickTime.minTick = minTick;
    }
  }

  /*
   beCheckedTradeData = {
    currency0: {
      baseCurrency0: {
        unsavedTradeData [<Array of unsaved market data in format of trade object>],
        lastSavedTradeData: last trade object
      }
    },
    ...
   }
  */
  const beCheckedTradeData = {};
  const getUnsavedTradePromises = [];
  const getLastSavedTradePromise = [];
  for (let i = 0; i < currencyArray.length; i += 1) {
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      const lastTick = lastTickTime[`${currencyArray[i]}_${baseCurrencyArray[j]}`].minTick;
      if (lastTick) {
        const lastTimeStamp = new Date();
        lastTimeStamp.setTime(lastTick * 1000);
        getUnsavedTradePromises.push(tradeExecutionService.getAllTradesFromTime(currencyArray[i], baseCurrencyArray[j], lastTimeStamp));
        getLastSavedTradePromise.push(tradeExecutionService.getLastTradeBeginTime(currencyArray[i], baseCurrencyArray[j], lastTimeStamp));
      }
      else {
        getUnsavedTradePromises.push(tradeExecutionService.getAllTrades(currencyArray[i], baseCurrencyArray[j]));
        getLastSavedTradePromise.push(null);
      }
    }
  }
  const unsavedTradesData = await Promise.all(getUnsavedTradePromises);
  const lastSavedTradesData = await Promise.all(getLastSavedTradePromise);
  for (let i = 0; i < currencyArray.length; i += 1) {
    for (let j = 0; j < baseCurrencyArray.length; j += 1) {
      const idx = i * currencyArray.length + j * baseCurrencyArray.length;

      beCheckedTradeData[currencyArray[i]] = {};
      beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]] = {
        unsavedTradeData: unsavedTradesData[idx],
        lastSavedTradeData: lastSavedTradesData[idx],
      };
    }
  }

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
      const toSaveMarketData = beCheckedTradeData[currencyArray[i]]
                                && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]]
                                && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]].unsavedTradeData;
      const lastSavedMarketData = beCheckedTradeData[currencyArray[i]]
                                && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]]
                                && beCheckedTradeData[currencyArray[i]][baseCurrencyArray[j]].lastSavedTradeData;

      for (let k = 0; k < timeResolutionTypeArray.length; k += 1) {
        const lastTick = lastTickTime[`${currencyArray[i]}_${baseCurrencyArray[j]}`][timeResolutionTypeArray[k]];
        const currentTick = ohlcv_timer.getNextTickTimeOfResolution(timeResolutionValueArray[k]);
        if (!lastTick) { // no market data for this time resolution
          // if no toSaveMarketData: just create data for current tick
          if (!toSaveMarketData || toSaveMarketData.length === 0) {
            ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], currentTick);
          }
          // else: put all toSaveMarketData in order (for missing data -> set price of lastSavedMarketData for all next ticks)
          else {
            const nextTickTimeOfToSaveData = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], toSaveMarketData[0].executedAt);
            ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], nextTickTimeOfToSaveData);
          }
          for (let l = 0; l < toSaveMarketData.length; l += 1) {
            await ohlcv_data.addData(toSaveMarketData[l]);
          }
        }
        else { // there is market data for this time resolution
          // if no toSaveMarketData:
          if (!toSaveMarketData || toSaveMarketData.length === 0) {
            //  - if last tick < current tick  && lastSavedMarketData.price: set price of last saved trade for all next tick time
            if (lastTick < currentTick && lastSavedMarketData && lastSavedMarketData.price) {
              const tickTimeOfLastSavedTrade = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], lastSavedMarketData.executedAt);
              let nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(tickTimeOfLastSavedTrade, timeResolutionTypeArray[k]);
              ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], nextTickTime);
              while (nextTickTime < currentTick) {
                ohlcv_data.addData({
                  currency: currencyArray[i],
                  baseCurrency: baseCurrencyArray[j],
                  price: lastSavedMarketData.price,
                  quantity: 0,
                });
                nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(nextTickTime, timeResolutionTypeArray[k]);
                await ohlcv_data.nextTickForCurrencyPair(timeResolutionTypeArray[k], nextTickTime, currencyArray[i], baseCurrencyArray[j]);
              }
            }
            //  - else: just create data for current tick
            else {
              ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], currentTick);
            }
          }
          // else:
          //  - if last tick <= current tick: put all toSaveMarketData in order (for missing data -> set price of lastSavedMarketData for all next ticks)
          //  - else: error, only create data set for current tick
          else {
            if (lastTick <= currentTick) {
              // if there is missing data between lastSavedMarketData and toSaveMarketData: filling by price of lastSavedMarketData
              const nextTickTimeOfToSaveData = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], toSaveMarketData[0].executedAt);
              if (lastSavedMarketData && lastSavedMarketData.price) {
                const tickTimeOfLastSavedTrade = ohlcv_timer.getTickTimeOfTimeResolutionOfTimeStamp(timeResolutionTypeArray[k], lastSavedMarketData.executedAt);
                let nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(tickTimeOfLastSavedTrade, timeResolutionTypeArray[k]);
                ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], nextTickTime);
                while (nextTickTime < nextTickTimeOfToSaveData) {
                  ohlcv_data.addData({
                    currency: currencyArray[i],
                    baseCurrency: baseCurrencyArray[j],
                    price: lastSavedMarketData.price,
                    quantity: 0,
                  });
                  nextTickTime = ohlcv_timer.getNextTickTimeOfResolution(nextTickTime, timeResolutionTypeArray[k]);
                  await ohlcv_data.nextTickForCurrencyPair(timeResolutionTypeArray[k], nextTickTime, currencyArray[i], baseCurrencyArray[j]);
                }
              }
              else {
                ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], nextTickTimeOfToSaveData);
              }
              for (let l = 0; l < toSaveMarketData.length; l += 1) {
                await ohlcv_data.addData(toSaveMarketData[l]);
              }
            }
            else {
              logger.error('ohlcv.aggregator.js init(): ERROR: There is toSaveMarketData but lastTick > currentTick');
              ohlcv_data.createData(currencyArray[i], baseCurrencyArray[j], timeResolutionTypeArray[k], currentTick);
            }
          }
        }
      }
    }
  }
};

init().then(() => {
  logger.info('ohlcv.aggregator.js init(): finish initiation');
  // start ohlcv timer
  //ohlcv_timer.begin();
});

const collectTrade = (tradeEvent) => {
  ohlcv_data.addData(tradeEvent);
};

module.exports = {
  collectTrade,
};
