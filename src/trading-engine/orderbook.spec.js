// mocha unit tests of orderbook come here

const {describe, it} = require('mocha');
const { expect } = require('chai');

const beesV8 = require('./beesV8');
const {OrderEvent} = require('../resources/order/order.models');

function isSameOrder(order1, order2) {
  const zero = 0.000000000000000000001;
  //console.log(`compare ${orderEvent1._id} and ${orderEvent2._id}`);
  if (order1._id !== order2._id) return false;
  if (order1.type !== order2.type) return false;
  if (order1.side !== order2.side) return false;
  if (Math.abs(order1.limitPrice - order2.limitPrice) > zero) return false;
  if (Math.abs(order1.quantity - order2.quantity) > zero) return false;
  if (Math.abs(order1.filledQuantity - order2.filledQuantity) > zero) return false;
  if (order1.currency !== order2.currency) return false;
  if (order1.baseCurrency !== order2.baseCurrency) return false;
  return true;
}

describe('get the aggregated state of the order book', async () => {

  it('get aggregated state from the empty order book should be successful', async () => {

    beesV8.start();

    const state = await beesV8.getAggregatedStateOfOrderBook();
    expect(state).not.to.be.undefined;

    expect(state.asks.length).to.be.equal(0);

    expect(state.bids.length).to.be.equal(0);

    expect(Object.keys(beesV8.mapOfIdAndResolveFunction).length).to.be.equal(0);

    beesV8.stop();


  });

  it('get aggregated state from the order book with one side being empty should be successful', async () => {

    beesV8.start();

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    const state = await beesV8.getAggregatedStateOfOrderBook();

    expect(state).not.to.be.undefined;

    expect(state.bids.length).to.be.equal(1);

    expect(state.bids[0].price).to.be.equal(100);

    expect(state.bids[0].quantity).to.be.equal(300);

    expect(state.bids[0].filledQuantity).to.be.equal(0);

    expect(state.asks.length).to.be.equal(0);

    expect(Object.keys(beesV8.mapOfIdAndResolveFunction).length).to.be.equal(0);

    beesV8.stop();

  });

  it('get aggregated state from the order book with one side having more than 2 prices should be successful', async () => {

    beesV8.start();

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 150,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    const state = await beesV8.getAggregatedStateOfOrderBook();

    expect(state).not.to.be.undefined;

    expect(state.bids.length).to.be.equal(2);

    expect(state.bids[0].price).to.be.equal(100);

    expect(state.bids[1].quantity).to.be.equal(150);

    expect(state.asks.length).to.be.equal(0);

    expect(Object.keys(beesV8.mapOfIdAndResolveFunction).length).to.be.equal(0);

    beesV8.stop();

  });

  it('get aggregated state from the order book with 2 sides having more than 2 prices should be successful', async () => {

    beesV8.start();

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 150,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 600,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 500,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });

    const state = await beesV8.getAggregatedStateOfOrderBook();

    expect(state).not.to.be.undefined;

    expect(state.bids.length).to.be.equal(2);

    expect(state.bids[0].price).to.be.equal(100);

    expect(state.bids[1].quantity).to.be.equal(150);

    expect(state.asks.length).to.be.equal(2);

    expect(state.asks[0].price).to.be.equal(500);

    expect(state.asks[1].price).to.be.equal(600);

    expect(Object.keys(beesV8.mapOfIdAndResolveFunction).length).to.be.equal(0);

    beesV8.stop();

  });

});

// =====================================================================
//                        ORDER BOOK TEST
// =====================================================================

describe('test event process of trading engine', async () => {

  // --------------------------------------------
  // test place limit event
  // --------------------------------------------

  it('test place limit event', async () => {

    // description:
    /*
    * The order of place limit event:
    * BUY p=100 q=150
    * BUY p=100 q=100
    * BUY p=10 q=15
    * BUY p=10 q=10
    * BUY p=100 q=15
    * BUY p=50 q=15
    *
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [150, 100, 15]
    * */


    beesV8.start();

    let orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState).not.to.be.undefined;
    // check name of book side
    expect(orderState.askSide.side).to.be.equal('ASK');
    expect(orderState.bidSide.side).to.be.equal('BID');
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    const orderEvent0 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 150,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent0);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(1);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    //expect(orderState.bidSide.orderMap[0].orders[0]).to.be.equal(orderEvent0._order);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);

    const orderEvent1 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 100,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent1);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(1);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    //expect(orderState.bidSide.orderMap[0].orders[0]).to.be.equal(orderEvent0._order);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    //expect(orderState.bidSide.orderMap[0].orders[1]).to.be.equal(orderEvent1._order);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent1._order)).to.be.equal(true);

    const orderEvent2 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 2,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 10,
        quantity: 15,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent2);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent1._order)).to.be.equal(true);

    const orderEvent3 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 3,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 10,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent3);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent1._order)).to.be.equal(true);

    const orderEvent4 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 4,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 100,
        quantity: 15,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };

    beesV8.processOrderEvent(orderEvent4);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[2], orderEvent4._order)).to.be.equal(true);

    const orderEvent5 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 5,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 50,
        quantity: 15,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent5);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);


    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [150, 100, 15]
    * */

    const orderEvent6 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 6,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 101,
        quantity: 1000,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent6);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [150, 100, 15]
    *
    * -> askSide:
    * 101: [1000]
    * */

    const orderEvent7 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 7,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 49,
        quantity: 65,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent7);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    orderEvent0._order.filledQuantity = 65.0;
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [85, 100, 15]
    *
    * -> askSide:
    * 101: [1000]
    * */


    const orderEvent8 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 8,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 100,
        quantity: 205,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent8);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    orderEvent8._order.filledQuantity = 200;
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    *
    * -> askSide:
    * 100: [5]
    * 101: [1000]
    * */


    const orderEvent9 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 9,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 10,
        quantity: 5,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent9);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    orderEvent5._order.filledQuantity = 5.0;
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [10]
    *
    * -> askSide:
    * 100: [5]
    * 101: [1000]
    * */

    const orderEvent10 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 10,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 10,
        quantity: 5,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent10);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    orderEvent5._order.filledQuantity = 10.0;
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [5]
    *
    * -> askSide:
    * 100: [5]
    * 101: [1000]
    * */

    const orderEvent11 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 11,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 100,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent11);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent11._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [5]
    *
    * -> askSide:
    * 100: [5, 20]
    * 101: [1000]
    * */

    const orderEvent12 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 12,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 1,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent12);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent11._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    /*
    * -> bidSide:
    *
    * -> askSide:
    * 100: [5, 20]
    * 101: [1000]
    * */

    const orderEvent13 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 13,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 101.00000001,
        quantity: 525,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent13);
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    orderEvent6._order.filledQuantity = 500;
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    /*
    * -> bidSide:
    *
    * -> askSide:
    * 101: [500]
    * */

    beesV8.stop();
  });


  // --------------------------------------------
  // test cancel order
  // --------------------------------------------

  it('test cancel order event', async () => {

    beesV8.start();

    // description:
    /* Firstly place some orders then cancel
    *
    * BUY p=40 q=10
    * BUY p=20 q=10
    * BUY p=30 q=10
    * BUY p=10 q=10
    * BUY p=30 q=20
    * BUY p=30 q=30
    * BUY p=40 q=20
    * BUY p=20 q=20
    * BUY p=40 q=30
    * BUY p=40 q=40
    *
    * -> bidSide:
    * 10: [10]
    * 20: [10, 20]
    * 30: [10, 20, 30]
    * 40: [10, 20, 30, 40]
    *
    * Do the same with SELL
    * */

    const orderEvent0 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent0);

    const orderEvent1 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent1);

    const orderEvent2 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 2,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent2);

    const orderEvent3 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 3,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 10,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent3);

    const orderEvent4 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 4,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent4);

    const orderEvent5 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 5,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent5);

    const orderEvent6 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 6,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent6);

    const orderEvent7 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 7,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent7);

    const orderEvent8 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 8,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent8);

    const orderEvent9 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 9,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 40,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent9);


    // description:
    /* Firstly place some orders then cancel
    *
    * 0 BUY p=40 q=10
    * 1 BUY p=20 q=10
    * 2 BUY p=30 q=10
    * 3 BUY p=10 q=10
    * 4 BUY p=30 q=20
    * 5 BUY p=30 q=30
    * 6 BUY p=40 q=20
    * 7 BUY p=20 q=20
    * 8 BUY p=40 q=30
    * 9 BUY p=40 q=40
    *
    * -> bidSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    *
    * */

    let orderState = await beesV8.getCurrentStateOfOrderBook();
    // check all order in book again for sure
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(4);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    // BEGIN CANCELING
    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent3._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent1._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent5._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 30: [2: 10, 4: 20]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent6._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 30: [2: 10, 4: 20]
    * 40: [0: 10, 8: 30, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent8._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 30: [2: 10, 4: 20]
    * 40: [0: 10, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent2._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 30: [4: 20]
    * 40: [0: 10, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent4._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 40: [0: 10, 9: 40]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent9._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * 40: [0: 10]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent0._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * 20: [7: 20]
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(1);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent7._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent7._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> bidSide:
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    // Place same order for ask side
    orderEvent0._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent0);
    orderEvent1._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent1);
    orderEvent2._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent2);
    orderEvent3._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent3);
    orderEvent4._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent4);
    orderEvent5._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent5);
    orderEvent6._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent6);
    orderEvent7._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent7);
    orderEvent8._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent8);
    orderEvent9._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent9);


    // description:
    /* Firstly place some orders then cancel
    *
    * 0 SELL p=40 q=10
    * 1 SELL p=20 q=10
    * 2 SELL p=30 q=10
    * 3 SELL p=10 q=10
    * 4 SELL p=30 q=20
    * 5 SELL p=30 q=30
    * 6 SELL p=40 q=20
    * 7 SELL p=20 q=20
    * 8 SELL p=40 q=30
    * 9 SELL p=40 q=40
    *
    * -> askSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    *
    * */

    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check all order in book again for sure
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(4);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent2._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(4);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent4._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(4);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent5._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent5._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(3);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent7._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 10: [3: 10]
    * 20: [1: 10]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(3);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent1._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 10: [3: 10]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent3._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent6._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 40: [0: 10, 8: 30, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[2], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent8._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 40: [0: 10, 9: 40]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent9._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * 40: [0: 10]
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.CANCELED_EVENT,
      _order: orderEvent0._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*
    * -> askSide:
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(0);

    beesV8.stop();
  });

  // --------------------------------------------------
  // test place market
  // --------------------------------------------------
  it('test place market event', async () => {
    beesV8.start();
    // description:
    /* Firstly place some orders then place sell market orders
    *
    * 0 BUY p=20 q=10
    * 1 BUY p=30 q=10
    * 2 BUY p=10 q=10
    * 3 BUY p=30 q=20
    * 4 BUY p=30 q=30
    * 5 BUY p=20 q=20
    *
    * -> bidSide:
    * 10: [10]
    * 20: [10, 20]
    * 30: [10, 20, 30]
    *
    * Do the same with SELL
    * */

    const orderEvent0 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent0);

    const orderEvent1 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent1);

    const orderEvent2 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 2,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent2);

    const orderEvent3 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 3,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 10,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent3);

    const orderEvent4 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 4,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent4);

    const orderEvent5 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 5,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent5);

    const orderEvent6 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 6,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent6);

    const orderEvent7 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 7,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent7);

    const orderEvent8 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 8,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent8);

    const orderEvent9 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 9,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 40,
        quantity: 40,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent9);


    // description:
    /* Firstly place some orders then market order of SELL
    *
    * 0 BUY p=40 q=10
    * 1 BUY p=20 q=10
    * 2 BUY p=30 q=10
    * 3 BUY p=10 q=10
    * 4 BUY p=30 q=20
    * 5 BUY p=30 q=30
    * 6 BUY p=40 q=20
    * 7 BUY p=20 q=20
    * 8 BUY p=40 q=30
    * 9 BUY p=40 q=40
    *
    * -> bidSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    *
    * */

    let orderState = await beesV8.getCurrentStateOfOrderBook();
    // check all order in book again for sure
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(4);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 10,
        type: 'MARKET',
        side: 'BUY',
        limitPrice: 10000,
        quantity: 100,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // nothing change
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(4);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.bidSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 11,
        type: 'MARKET',
        side: 'SELL',
        limitPrice: 10000,
        quantity: 100,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*-> bidSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * -> askSide: empty
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 12,
        type: 'MARKET',
        side: 'SELL',
        limitPrice: 1,
        quantity: 100000,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*-> bidSide: empty
    * -> askSide: empty
    * */
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    // Place same order for ask side
    orderEvent0._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent0);
    orderEvent1._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent1);
    orderEvent2._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent2);
    orderEvent3._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent3);
    orderEvent4._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent4);
    orderEvent5._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent5);
    orderEvent6._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent6);
    orderEvent7._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent7);
    orderEvent8._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent8);
    orderEvent9._order.side = 'SELL';
    beesV8.processOrderEvent(orderEvent9);


    // description:
    /* Firstly place some orders then cancel
    *
    * 0 SELL p=40 q=10
    * 1 SELL p=20 q=10
    * 2 SELL p=30 q=10
    * 3 SELL p=10 q=10
    * 4 SELL p=30 q=20
    * 5 SELL p=30 q=30
    * 6 SELL p=40 q=20
    * 7 SELL p=20 q=20
    * 8 SELL p=40 q=30
    * 9 SELL p=40 q=40
    *
    * -> askSide:
    * 10: [3: 10]
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    *
    * */

    // put also a SELL market order
    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 13,
        type: 'MARKET',
        side: 'SELL',
        limitPrice: 20,
        quantity: 5,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    // check all order in book again for sure
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(4);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 12,
        type: 'MARKET',
        side: 'BUY',
        limitPrice: 20,
        quantity: 5,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*-> askSide:
    * 10: [3: 5]
    * 20: [1: 10, 7: 20]
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * -> bidSide: empty
    * */
    orderEvent3._order.filledQuantity = 5;
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(4);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[3].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[3].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[3].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 13,
        type: 'MARKET',
        side: 'BUY',
        limitPrice: 200,
        quantity: 35,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*-> askSide:
    * 30: [2: 10, 4: 20, 5: 30]
    * 40: [0: 10, 6: 20, 8: 30, 9: 40]
    * -> bidSide: empty
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(30);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[2], orderEvent5._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[2], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[3], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 14,
        type: 'MARKET',
        side: 'BUY',
        limitPrice: 1,
        quantity: 80,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*-> askSide:
    * 40: [6: 10, 8: 30, 9: 40]
    * -> bidSide: empty
    * */
    orderEvent6._order.filledQuantity = 10;
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(40);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[2], orderEvent9._order)).to.be.equal(true);

    beesV8.processOrderEvent({
      _type: OrderEvent.MARKET_PLACED_EVENT,
      _order: {
        _id: 14,
        type: 'MARKET',
        side: 'BUY',
        limitPrice: 100,
        quantity: 800,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    /*-> askSide: empty
    * -> bidSide: empty
    * */
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    expect(orderState.askSide.orderMap.length).to.be.equal(0);

    beesV8.stop();
  });

  // --------------------------------------------
  // test update quantity
  // --------------------------------------------

  it('test update quantity event', async () => {
    beesV8.start();
    // description:
    /* Firstly place some orders then place update quantity
    *
    * 0 BUY p=20 q=10
    * 1 BUY p=30 q=10
    * 2 BUY p=10 q=10
    * 3 BUY p=30 q=20
    * 4 BUY p=30 q=30
    * 5 BUY p=20 q=20
    *
    * -> bidSide:
    * 10: [2: 10]
    * 20: [0: 10, 5: 20]
    * 30: [1: 10, 3: 20, 4: 30]
    *
    * Do the same with SELL
    * */

    const orderEvent0 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent0);

    const orderEvent1 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent1);

    const orderEvent2 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 2,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 10,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent2);

    const orderEvent3 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 3,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent3);

    const orderEvent4 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 4,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent4);

    const orderEvent5 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 5,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent5);

    /*-> bidSide:
    * 10: [2: 10]
    * 20: [0: 10, 5: 20]
    * 30: [1: 10, 3: 20, 4: 30]
    * */

    let orderState = await beesV8.getCurrentStateOfOrderBook();
    // check all order in book again for sure
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    orderEvent0._order.quantity *= 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: orderEvent0._order.quantity / 2,
      _order: orderEvent0._order
    });
    orderEvent1._order.quantity /= 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: -orderEvent1._order.quantity,
      _order: orderEvent1._order
    });
    orderEvent2._order.quantity += 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: 2,
      _order: orderEvent2._order
    });
    orderEvent3._order.quantity -= 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: -2,
      _order: orderEvent3._order
    });
    orderEvent4._order.quantity *= 4;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: (orderEvent4._order.quantity * 3) / 4,
      _order: orderEvent4._order
    });
    orderEvent5._order.quantity /= 4;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: -orderEvent5._order.quantity * 3,
      _order: orderEvent5._order
    });

    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    const orderEvent6 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 6,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 200,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent6);

    const orderEvent7 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 7,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 300,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent7);

    const orderEvent8 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 8,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 100,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent8);

    const orderEvent9 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 9,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 300,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent9);

    const orderEvent10 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 10,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 300,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent10);

    const orderEvent11 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 11,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 200,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent11);

    /*-> bidSide:
    * 10: [2: ?]
    * 20: [0: ?, 5: ?]
    * 30: [1: ?, 3: ?, 4: ?]
    *-> askSide:
    * 100: [8: 10]
    * 200: [6: 10, 11: 20]
    * 300: [7: 10, 9: 20, 10: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.askSide.orderMap.length).to.be.equal(3);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent11._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(300);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent9._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent10._order)).to.be.equal(true);

    orderEvent6._order.quantity += 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: 2,
      _order: orderEvent6._order
    });
    orderEvent7._order.quantity -= 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: -2,
      _order: orderEvent7._order
    });
    orderEvent8._order.quantity *= 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: orderEvent8._order.quantity / 2,
      _order: orderEvent8._order
    });
    orderEvent9._order.quantity /= 2;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: -orderEvent9._order.quantity,
      _order: orderEvent9._order
    });
    orderEvent10._order.quantity *= 3;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: (orderEvent10._order.quantity * 2) / 3,
      _order: orderEvent10._order
    });
    orderEvent11._order.quantity /= 3;
    beesV8.processOrderEvent({
      _type: OrderEvent.QUANTITY_UPDATED_EVENT,
      priceDelta: 0,
      qtyDelta: -orderEvent11._order.quantity * 2,
      _order: orderEvent11._order
    });
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.askSide.orderMap.length).to.be.equal(3);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent11._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[2].price).to.be.equal(300);
    expect(orderState.askSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[1], orderEvent9._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[2].orders[2], orderEvent10._order)).to.be.equal(true);

    // current state
    // ...

    // TODO: test cancel order by updating quantity : filledQuantity = 0 and filledQuantity != 0

    beesV8.stop();
  });

  // --------------------------------------------
  // test update limit price
  // --------------------------------------------
  
  it('test update limit event', async () => {
    beesV8.start();

    const orderEvent0 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 0,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent0);

    const orderEvent1 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 1,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent1);

    const orderEvent2 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 2,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 10,
        quantity: 10,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent2);

    const orderEvent3 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 3,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent3);

    const orderEvent4 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 4,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 30,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent4);

    const orderEvent5 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 5,
        type: 'LIMIT',
        side: 'BUY',
        limitPrice: 20,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent5);

    /*-> bidSide:
    * 10: [2: 10]
    * 20: [0: 10, 5: 20]
    * 30: [1: 10, 3: 20, 4: 30]
    * */

    let orderState = await beesV8.getCurrentStateOfOrderBook();
    // check all order in book again for sure
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    let priceDelta = 5.0 - orderEvent2._order.limitPrice;
    orderEvent2._order.limitPrice = 5.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent2._order
    });


    /*-> bidSide:
    * 5: [2: 10]
    * 20: [0: 10, 5: 20]
    * 30: [1: 10, 3: 20, 4: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(5);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    priceDelta = 25.0 - orderEvent2._order.limitPrice;
    orderEvent2._order.limitPrice = 25.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent2._order
    });

    /*-> bidSide:
    * 20: [0: 10, 5: 20]
    * 25: [2: 10]
    * 30: [1: 10, 3: 20, 4: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(25);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent4._order)).to.be.equal(true);

    priceDelta = 20.0 - orderEvent2._order.limitPrice;
    orderEvent2._order.limitPrice = 20.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent2._order
    });
    /*-> bidSide:
    * 20: [0: 10, 5: 20, 2: 10]
    * 30: [1: 10, 3: 20, 4: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[2], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[2], orderEvent4._order)).to.be.equal(true);

    priceDelta = 31.0 - orderEvent3._order.limitPrice;
    orderEvent3._order.limitPrice = 31.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent3._order
    });
    /*-> bidSide:
    * 20: [0: 10, 5: 20, 2: 10]
    * 30: [1: 10, 4: 30]
    * 31: [3: 20]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[2], orderEvent2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);

    priceDelta = 31.0 - orderEvent2._order.limitPrice;
    orderEvent2._order.limitPrice = 31.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent2._order
    });
    /*-> bidSide:
    * 20: [0: 10, 5: 20]
    * 30: [1: 10, 4: 30]
    * 31: [3: 20, 2: 10]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);

    priceDelta = 31.0 - orderEvent1._order.limitPrice;
    orderEvent1._order.limitPrice = 31.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent1._order
    });
    /*-> bidSide:
    * 20: [0: 10, 5: 20]
    * 30: [4: 30]
    * 31: [3: 20, 2: 10, 1: 10]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent1._order)).to.be.equal(true);

    priceDelta = 31.0 - orderEvent5._order.limitPrice;
    orderEvent5._order.limitPrice = 31.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent5._order
    });
    /*-> bidSide:
    * 20: [0: 10]
    * 30: [4: 30]
    * 31: [3: 20, 2: 10, 1: 10, 5: 20]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(4);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[3], orderEvent5._order)).to.be.equal(true);

    priceDelta = 10.0 - orderEvent1._order.limitPrice;
    orderEvent1._order.limitPrice = 10.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent1._order
    });
    /*-> bidSide:
    * 10: [1: 10]
    * 20: [0: 10]
    * 30: [4: 30]
    * 31: [3: 20, 2: 10, 5: 20]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(4);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(30);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[3].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[3].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[3].orders[2], orderEvent5._order)).to.be.equal(true);

    priceDelta = 10.0 - orderEvent4._order.limitPrice;
    orderEvent4._order.limitPrice = 10.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent4._order
    });
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [3: 20, 2: 10, 5: 20]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    const orderEvent6 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 6,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 200,
        quantity: 20,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent6);
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [3: 20, 2: 10, 5: 20]
    * ->askSide
    * 200: [6: 20]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    const orderEvent7 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 7,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 200,
        quantity: 50,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent7);
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [3: 20, 2: 10, 5: 20]
    * ->askSide
    * 200: [6: 20, 7: 50]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent7._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    const orderEvent8 = {
      _type: OrderEvent.LIMIT_PLACED_EVENT,
      _order: {
        _id: 8,
        type: 'LIMIT',
        side: 'SELL',
        limitPrice: 200,
        quantity: 30,
        filledQuantity: 0.0,
        currency: 'BTC',
        baseCurrency: 'USDT'
      }
    };
    beesV8.processOrderEvent(orderEvent8);
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [3: 20, 2: 10, 5: 20]
    * ->askSide
    * 200: [6: 20, 7: 50, 8: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent7._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[2], orderEvent8._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    priceDelta = 32.0 - orderEvent6._order.limitPrice;
    orderEvent6._order.limitPrice = 32.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent6._order
    });
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [3: 20, 2: 10, 5: 20]
    * ->askSide
    * 32: [6: 20]
    * 200: [7: 50, 8: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(32);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent7._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[1], orderEvent8._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    priceDelta = 32.0 - orderEvent8._order.limitPrice;
    orderEvent8._order.limitPrice = 32.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent8._order
    });
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [3: 20, 2: 10, 5: 20]
    * ->askSide
    * 32: [6: 20, 8: 30]
    * 200: [7: 50]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(32);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent6._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent7._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent3._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], orderEvent5._order)).to.be.equal(true);

    priceDelta = 2.0 - orderEvent6._order.limitPrice;
    orderEvent6._order.limitPrice = 2.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent6._order
    });
    /*-> bidSide:
    * 10: [1: 10, 4: 30]
    * 20: [0: 10]
    * 31: [2: 10, 5: 20]
    * ->askSide
    * 32: [8: 30]
    * 200: [7: 50]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(32);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(200);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], orderEvent7._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], orderEvent4._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(20);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], orderEvent0._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(31);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], orderEvent2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], orderEvent5._order)).to.be.equal(true);

    priceDelta = 1.0 - orderEvent7._order.limitPrice;
    orderEvent7._order.limitPrice = 1.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent7._order
    });
    /*-> bidSide:
    * 10: [4: 30]
    * ->askSide
    * 32: [8: 30]
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(32);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], orderEvent8._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(1);
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], orderEvent4._order)).to.be.equal(true);

    priceDelta = 100.0 - orderEvent4._order.limitPrice;
    orderEvent4._order.limitPrice = 100.0;
    beesV8.processOrderEvent({
      _type: OrderEvent.LIMIT_UPDATED_EVENT,
      priceDelta: priceDelta,
      qtyDelta: 0,
      _order: orderEvent4._order
    });
    /*-> bidSide: empty
    * -> askSide: empty
    * */
    orderState = await beesV8.getCurrentStateOfOrderBook();
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);
    beesV8.stop();
  });

  // --------------------------------------------
  // TODO: test combination of all event types
  // --------------------------------------------
  it('test combination of all event types', async () => {
    beesV8.start();

    // description:
    /*
    *
    *
    * */


    beesV8.stop();
  });

});