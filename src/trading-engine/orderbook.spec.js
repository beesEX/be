// mocha unit tests of orderbook come here

const {describe, it} = require('mocha');
const expect = require('chai').expect;

const beesV8 = require('./beesV8');
const {OrderEvent} = require('../resources/order/order.models');

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
