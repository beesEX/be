// Created bz: Viet Anh Ho

// mocha unit tests of ohlcv aggregator come here
const logger = require('../logger');

const {describe, it} = require('mocha');
const { expect } = require('chai');

const beesV8 = require('../trading-engine/beesV8');
const {OrderEvent} = require('../resources/order/order.models');
const {open, publish, close} = require('../util/zeroMQpublisher');

const db = require('../db');
const constants = require('../app.constants');
const ohlcvTimer = require('./ohlcvTimer');

// =====================================================================
//                        OHLCV AGGREGATOR TEST
// =====================================================================
let itNumber = 0;
const itName = [
  'test ohlcv 1m',
];

const showItHighlight = async () => {
  if (itNumber < itName.length) {
    console.log('');
    console.log('---------------------------------------------------------');
    console.log(` OHLCV AGGREAGATOR: ${itName[itNumber]}`);
    console.log('---------------------------------------------------------');
    console.log('');
    itNumber += 1;
  }
};

// use this instead of uuid() because Mongo DB ID must be a single String of 12 bytes or a string of 24 hex characters
function makeRandomMongoDbId(idLength=24) {
  let text = "";
  const possible = "abcdef0123456789";

  for (let i = 0; i < idLength; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

const makeTrade = async (price, quantity) => {
  const buyOrder = {
    _type: OrderEvent.LIMIT_PLACED_EVENT,
    _order: {
      _id: makeRandomMongoDbId(),
      userId: makeRandomMongoDbId(),
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: price,
      quantity: quantity,
      filledQuantity: 0.0,
      currency: 'BTC',
      baseCurrency: 'USDT'
    }
  };
  await beesV8.processOrderEvent(buyOrder);

  const sellOrder = {
    _type: OrderEvent.LIMIT_PLACED_EVENT,
    _order: {
      _id: makeRandomMongoDbId(),
      userId: makeRandomMongoDbId(),
      type: 'LIMIT',
      side: 'SELL',
      limitPrice: price,
      quantity: quantity,
      filledQuantity: 0.0,
      currency: 'BTC',
      baseCurrency: 'USDT'
    }
  };
  await beesV8.processOrderEvent(sellOrder);
};

const executeTradeList = async (tradeList) => {
  for (let i=0; i<tradeList.length; i+= 1) {
    const trade = tradeList[i];
    await makeTrade(trade.price, trade.quantity);
  }
};

const getDurationFromNowToNextStartTime = (timeResolution) => {
  const currentStartTime = ohlcvTimer.getCurrentStartTime(timeResolution);
  const nextStartTime = ohlcvTimer.getNextStartTime(currentStartTime, timeResolution);
  const currentTime = new Date().getTime();
  return nextStartTime - currentTime;
};

const areTwoDecimalNumberEqual = (a, b) => {
  //console.log(`ohlcv.spec.js areTwoDecimalNumberEqual(): compare ${JSON.stringify(a)} and ${JSON.stringify(b)}`);
  const minimalDifference = 0.00000000001;
  return Math.abs(parseFloat(a)-parseFloat(b)) <= minimalDifference;
};

const isMarketDataSameAsExpect = (realMarketData, expectedMarketData) => {
  //console.log(`ohlcv.spec.js isMarketDataSameAsExpect(): compare ${JSON.stringify(realMarketData)} and ${JSON.stringify(expectedMarketData)}`);
  if(!realMarketData) return false;
  if(!areTwoDecimalNumberEqual(realMarketData.open, expectedMarketData.o)) return false;
  if(!areTwoDecimalNumberEqual(realMarketData.high, expectedMarketData.h)) return false;
  if(!areTwoDecimalNumberEqual(realMarketData.low, expectedMarketData.l)) return false;
  if(!areTwoDecimalNumberEqual(realMarketData.close, expectedMarketData.c)) return false;
  if(!areTwoDecimalNumberEqual(realMarketData.volume, expectedMarketData.v)) return false;
  return true;
};

describe('test ohlcv aggregate process', () => {
  before(() => {
    return new Promise(async (resolve) => {
      await db.get(constants.DATABASE_DOCUMENTS.TRANSACTIONS).drop();
      await db.get(constants.DATABASE_DOCUMENTS.ORDERS).drop();
      await db.get(constants.DATABASE_DOCUMENTS.TRADES).drop();
      await db.get(constants.DATABASE_DOCUMENTS.OHLCV1M).drop();
      await db.get(constants.DATABASE_DOCUMENTS.OHLCV5M).drop();
      await db.get(constants.DATABASE_DOCUMENTS.OHLCV60M).drop();

      // open zeroMQ
      open();

      console.log('');
      console.log('================================================================================');
      console.log('                 TEST OHLCV AGGREGATE PROCESS');
      console.log('================================================================================');
      console.log('');

      resolve(true);
    });
  });

  after(() => {
    // close zeroMQ
    close();
  });

  beforeEach(() => {
    return new Promise((resolve) => {
      showItHighlight().then(() => {
        resolve(true);
      });
    });
  });

  // --------------------------------------------
  // test ohlcv 1m
  // --------------------------------------------

  it('test ohlcv 1m', (done) => {
    new Promise(async (resolve) => {
      // description:
      // - it takes about 12 minutes to finish test
      // - each epoch is a trade list which will be executed within a period of time of a resolution
      // - the symbols on right side of each epoch are form of OHLC candle
      // - follow with list of trade (price and quantity)
      // - the last line of each epoch is expected stage of market data
      /*
      epoch 1: |
      - price: 6500, quantity: 1
      o:6500 h:6500 l:6500 c:6500 v:1

      epoch 2: |
      - empty
      o:6500 h:6500 l:6500 c:6500 v:01

      epoch 3: |=====|
      - price: 6510, quantity: 1
      - price: 6520, quantity: 1
      o:6510 h:6520 l:6510 c:6520 v:2

      epoch 4: |=====|
      - price: 6500, quantity: 1
      - price: 6490, quantity: 1
      o:6500 h:6500 l:6490 c:6490 v:2

      epoch 5: |--|=====|
      - price: 6510, quantity: 1
      - price: 6490, quantity: 1
      - price: 6520, quantity: 1
      o:6510 h:6520 l:6490 c:6520 v:3

      epoch 6: |--|=====|
      - price: 6520, quantity: 1
      - price: 6490, quantity: 1
      - price: 6510, quantity: 1
      o:6520 h:6520 l:6490 c:6510 v:3

      epoch 7: |=====|--|
      - price: 6490, quantity: 1
      - price: 6520, quantity: 1
      - price: 6500, quantity: 1
      o:6490 h:6520 l:6490 c:6500 v:3

      epoch 8: |=====|--|
      - price: 6500, quantity: 1
      - price: 6520, quantity: 1
      - price: 6490, quantity: 1
      o:6500 h:6520 l:6490 c:6490 v:3

      epoch 9: |--|=====|--|
      - price: 6500, quantity: 1
      - price: 6520, quantity: 1
      - price: 6505, quantity: 1
      - price: 6490, quantity: 1
      - price: 6510, quantity: 1
      o:6500 h:6520 l:6490 c:6510 v:5

      epoch 10: |--|=====|--|
      - price: 6510, quantity: 1
      - price: 6515, quantity: 1
      - price: 6520, quantity: 1
      - price: 6505, quantity: 1
      - price: 6490, quantity: 1
      - price: 6510, quantity: 1
      - price: 6500, quantity: 1
      o:6510 h:6520 l:6490 c:6500 v:7

       epoch 11: |-----|
      - price: 6490, quantity: 1
      - price: 6515, quantity: 1
      - price: 6520, quantity: 1
      - price: 6505, quantity: 1
      - price: 6490, quantity: 1
      o:6490 h:6520 l:6490 c:6490 v:5

      epoch 12: |-----|
      - price: 6520, quantity: 1
      - price: 6515, quantity: 1
      - price: 6490, quantity: 1
      - price: 6505, quantity: 1
      - price: 6520, quantity: 1
      o:6520 h:6520 l:6490 c:6520 v:5
      */

      await beesV8.start();

      const intervalTradeList = [];
      intervalTradeList.push([
        {price: 6500, quantity: 1}
      ]);
      intervalTradeList.push([]);
      intervalTradeList.push([
        {price: 6510, quantity: 1},
        {price: 6520, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6500, quantity: 1},
        {price: 6490, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6510, quantity: 1},
        {price: 6490, quantity: 1},
        {price: 6520, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6520, quantity: 1},
        {price: 6490, quantity: 1},
        {price: 6510, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6490, quantity: 1},
        {price: 6520, quantity: 1},
        {price: 6500, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6500, quantity: 1},
        {price: 6520, quantity: 1},
        {price: 6490, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6500, quantity: 1},
        {price: 6520, quantity: 1},
        {price: 6505, quantity: 1},
        {price: 6490, quantity: 1},
        {price: 6510, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6510, quantity: 1},
        {price: 6515, quantity: 1},
        {price: 6520, quantity: 1},
        {price: 6505, quantity: 1},
        {price: 6490, quantity: 1},
        {price: 6510, quantity: 1},
        {price: 6500, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6490, quantity: 1},
        {price: 6515, quantity: 1},
        {price: 6520, quantity: 1},
        {price: 6505, quantity: 1},
        {price: 6490, quantity: 1}
      ]);
      intervalTradeList.push([
        {price: 6520, quantity: 1},
        {price: 6515, quantity: 1},
        {price: 6490, quantity: 1},
        {price: 6505, quantity: 1},
        {price: 6520, quantity: 1}
      ]);

      const expectedMarketDataList = [
        {o:6500, h:6500, l:6500, c:6500, v:1},
        {o:6500, h:6500, l:6500, c:6500, v:1},
        {o:6510, h:6520, l:6510, c:6520, v:2},
        {o:6500, h:6500, l:6490, c:6490, v:2},
        {o:6510, h:6520, l:6490, c:6520, v:3},
        {o:6520, h:6520, l:6490, c:6510, v:3},
        {o:6490, h:6520, l:6490, c:6500, v:3},
        {o:6500, h:6520, l:6490, c:6490, v:3},
        {o:6500, h:6520, l:6490, c:6510, v:5},
        {o:6510, h:6520, l:6490, c:6500, v:7},
        {o:6490, h:6520, l:6490, c:6490, v:5},
        {o:6520, h:6520, l:6490, c:6520, v:5},
      ];

      const extraSleepTimeMs = 1000; // sleep extra 1s -> each trade list will be executed in a time interval
      const timeResolution = constants.DATABASE_DOCUMENTS.OHLCV1M;

      for (let i = 0; i < intervalTradeList.length; i += 1) {
        const tradeList = intervalTradeList[i];

        const timeToSleep = getDurationFromNowToNextStartTime(timeResolution) + extraSleepTimeMs + i * ohlcvTimer.RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolution];
        logger.info(`ohlcv.spec.js test_ohlcv_1m: tradeList[${i}] will be executed after ${timeToSleep} ms`);

        setTimeout(async () => {
          logger.info(`ohlcv.spec.js test_ohlcv_1m: execute trade list ${JSON.stringify(tradeList, null, 2)} ms`);
          await executeTradeList(tradeList);

          const currentStartTime = ohlcvTimer.getCurrentStartTime(timeResolution);
          const nextStartTIme = ohlcvTimer.getNextStartTime(currentStartTime, timeResolution);

          const currentMarketDataList = await beesV8.getOhlcvData('BTC_USDT', timeResolution, currentStartTime, nextStartTIme-1);
          const currentMarketData = currentMarketDataList && currentMarketDataList.length && currentMarketDataList[0];

          const expectedMarketData = expectedMarketDataList[i];
          logger.info(`ohlcv.spec.js test_ohlcv_1m: compare ${JSON.stringify(currentMarketData)} and ${JSON.stringify(expectedMarketData)}`);
          expect(isMarketDataSameAsExpect(currentMarketData, expectedMarketData)).to.be.equal(true);

          if(i === intervalTradeList.length -1) {
            await beesV8.stop();
            resolve();
          }
        }, timeToSleep);
      }
    }).then(done);
  }).timeout(15 * 60 * 1000);
});
