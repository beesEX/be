// mocha unit tests of orderbook come here

const {describe, it} = require('mocha');
const expect = require('chai').expect;

const beesV8 = require('./beesV8');
const {OrderEvent} = require('../resources/order/order.models');

describe('get the aggregated state of the order book', async () => {

  it('get aggregated state from the empty order book should be successful', async () => {

    beesV8.start();

    const state = await beesV8.getAggregatedStateOfOrderBook();
    logger.info(`orderbook.spec.js: state ${JSON.stringify(state)}`);
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

describe('test all functions of trading engine', async () => {

  // only test place limit
  it('test place limit', async () => {

    // description:
    /*
    * The order of place limit event
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
    *
    * Then:
    * SELL p=101 q=1000
    * SELL p=49 q=65
    * SELL p=100 q=205
    * SELL p=10 q=5
    * SELL p=10 q=5
    * SELL p=100 q=20
    * SELL p=100 q=30
    *
    * -> bidSide:
    * 10: [5, 10]
    *
    * -> askSide:
    * 100: []
    * 101: []
    * */


    beesV8.start();

    let orderState = await beesV8.getOrderBookStateOfOrderBook();
    expect(orderState).not.to.be.undefined;
    // check name of book side
    expect(orderState.askSide.side).to.be.equal('ASK');
    expect(orderState.bidSide.side).to.be.equal('BID');
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    const order0 = {
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
    beesV8.processOrderEvent(order0);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(1);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    //expect(orderState.bidSide.orderMap[0].orders[0]).to.be.equal(order0._order);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order0._order)).to.be.equal(true);

    const order1 = {
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
    beesV8.processOrderEvent(order1);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(1);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    //expect(orderState.bidSide.orderMap[0].orders[0]).to.be.equal(order0._order);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order0._order)).to.be.equal(true);
    //expect(orderState.bidSide.orderMap[0].orders[1]).to.be.equal(order1._order);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order1._order)).to.be.equal(true);

    const order2 = {
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
    beesV8.processOrderEvent(order2);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], order1._order)).to.be.equal(true);

    const order3 = {
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
    beesV8.processOrderEvent(order3);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], order1._order)).to.be.equal(true);

    const order4 = {
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

    beesV8.processOrderEvent(order4);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[1], order1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[2], order4._order)).to.be.equal(true);

    const order5 = {
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
    beesV8.processOrderEvent(order5);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(0);
    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], order0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], order1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], order4._order)).to.be.equal(true);


    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [150, 100, 15]
    * */

    const order6 = {
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
    beesV8.processOrderEvent(order6);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], order0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], order1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], order4._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [150, 100, 15]
    *
    * -> askSide:
    * 101: [1000]
    * */

    const order7 = {
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
    beesV8.processOrderEvent(order7);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(3);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[2].price).to.be.equal(100);
    expect(orderState.bidSide.orderMap[2].orders.length).to.be.equal(3);
    order0._order.filledQuantity = 65.0;
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[0], order0._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[1], order1._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[2].orders[2], order4._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    * 100: [85, 100, 15]
    *
    * -> askSide:
    * 101: [1000]
    * */


    const order8 = {
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
    beesV8.processOrderEvent(order8);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    order8._order.filledQuantity = 200;
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [15]
    *
    * -> askSide:
    * 100: [5]
    * 101: [1000]
    * */


    const order9 = {
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
    beesV8.processOrderEvent(order9);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    order5._order.filledQuantity = 5.0;
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [10]
    *
    * -> askSide:
    * 100: [5]
    * 101: [1000]
    * */

    const order10 = {
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
    beesV8.processOrderEvent(order10);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order8._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    order5._order.filledQuantity = 10.0;
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [5]
    *
    * -> askSide:
    * 100: [5]
    * 101: [1000]
    * */

    const order11 = {
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
    beesV8.processOrderEvent(order11);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], order11._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(2);
    // check element(s) inside order book side
    expect(orderState.bidSide.orderMap[0].price).to.be.equal(10);
    expect(orderState.bidSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[0], order2._order)).to.be.equal(true);
    expect(isSameOrder(orderState.bidSide.orderMap[0].orders[1], order3._order)).to.be.equal(true);
    expect(orderState.bidSide.orderMap[1].price).to.be.equal(50);
    expect(orderState.bidSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.bidSide.orderMap[1].orders[0], order5._order)).to.be.equal(true);

    /*
    * -> bidSide:
    * 10: [15, 10]
    * 50: [5]
    *
    * -> askSide:
    * 100: [5, 20]
    * 101: [1000]
    * */

    const order12 = {
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
    beesV8.processOrderEvent(order12);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(2);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(100);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(2);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order8._order)).to.be.equal(true);
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[1], order11._order)).to.be.equal(true);
    expect(orderState.askSide.orderMap[1].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[1].orders.length).to.be.equal(1);
    expect(isSameOrder(orderState.askSide.orderMap[1].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    /*
    * -> bidSide:
    *
    * -> askSide:
    * 100: [5, 20]
    * 101: [1000]
    * */

    const order13 = {
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
    beesV8.processOrderEvent(order13);
    orderState = await beesV8.getOrderBookStateOfOrderBook();
    // check length of book side
    expect(orderState.askSide.orderMap.length).to.be.equal(1);
    expect(orderState.askSide.orderMap[0].price).to.be.equal(101);
    expect(orderState.askSide.orderMap[0].orders.length).to.be.equal(1);
    order6._order.filledQuantity = 500;
    expect(isSameOrder(orderState.askSide.orderMap[0].orders[0], order6._order)).to.be.equal(true);

    expect(orderState.bidSide.orderMap.length).to.be.equal(0);

    /*
    * -> bidSide:
    *
    * -> askSide:
    * 101: [500]
    * */

    beesV8.stop();
  });


});

function isSameOrder(order1, order2) {
  const zero = 0.000000000000000000001;
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