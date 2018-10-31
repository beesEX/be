// TODO: write unit test

// mocha unit tests of ohlcv aggregator come here

const {describe, it} = require('mocha');
const { expect } = require('chai');

const beesV8 = require('../trading-engine/beesV8');
const {OrderEvent} = require('../resources/order/order.models');
const {open, publish, close} = require('../util/zeroMQpublisher');

//TODO: need to lock write mode in DB
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

const makeTrade = async (price, quantity) => {
  const buyOrder = {
    _type: OrderEvent.LIMIT_PLACED_EVENT,
    _order: {
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

  it('test ohlcv 1m', async () => {

    // description:
    /*
    epoch 1: |
    - price: 6500, quantity: 1
    ohlcv1m: o:6500 h:6500 l:6500 c:6500 v:1
    ohlcv5m: o:6500 h:6500 l:6500 c:6500 v:1

    epoch 2: |
    - empty
    ohlcv1m: o:6500 h:6500 l:6500 c:6500 v:0
    ohlcv5m: o:6500 h:6500 l:6500 c:6500 v:1

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

    const epochList = [];
    epochList.push([
      {price: 6500, quantity: 1}
    ]);
    epochList.push([]);
    epochList.push([
      {price: 6510, quantity: 1},
      {price: 6520, quantity: 1}
    ]);
    epochList.push([
      {price: 6500, quantity: 1},
      {price: 6490, quantity: 1}
    ]);
    epochList.push([
      {price: 6510, quantity: 1},
      {price: 6490, quantity: 1},
      {price: 6520, quantity: 1}
    ]);
    epochList.push([
      {price: 6520, quantity: 1},
      {price: 6490, quantity: 1},
      {price: 6510, quantity: 1}
    ]);
    epochList.push([
      {price: 6490, quantity: 1},
      {price: 6520, quantity: 1},
      {price: 6500, quantity: 1}
    ]);
    epochList.push([
      {price: 6500, quantity: 1},
      {price: 6520, quantity: 1},
      {price: 6490, quantity: 1}
    ]);
    epochList.push([
      {price: 6500, quantity: 1},
      {price: 6520, quantity: 1},
      {price: 6505, quantity: 1},
      {price: 6490, quantity: 1},
      {price: 6510, quantity: 1}
    ]);
    epochList.push([
      {price: 6510, quantity: 1},
      {price: 6515, quantity: 1},
      {price: 6520, quantity: 1},
      {price: 6505, quantity: 1},
      {price: 6490, quantity: 1},
      {price: 6510, quantity: 1},
      {price: 6500, quantity: 1}
    ]);
    epochList.push([
      {price: 6490, quantity: 1},
      {price: 6515, quantity: 1},
      {price: 6520, quantity: 1},
      {price: 6505, quantity: 1},
      {price: 6490, quantity: 1}
    ]);
    epochList.push([
      {price: 6520, quantity: 1},
      {price: 6515, quantity: 1},
      {price: 6490, quantity: 1},
      {price: 6505, quantity: 1},
      {price: 6520, quantity: 1}
    ]);

    await beesV8.stop();
  });

});
