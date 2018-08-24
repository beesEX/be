global.logger = require('../../logger');

const sleep = require('../../tests/sleep');
const {describe, it} = require('mocha');
const { expect } = require('chai');
const db = require('../../db');
const userFactory = require('../../resources/user/user.factory');

const {open, close} = require('../../util/zeroMQpublisher');
const beesV8 = require('../../trading-engine/beesV8');
const txService = require('../../wealth-management/transaction.service');
const orderService = require('./order.service');


const constants = require('../../app.constants');
const orderSchema = require('./order.schema');

describe('place new LIMIT order', () => {
  let userId;

  before(async () => {
    const user = await userFactory.verifiedUser();
    userId = user._id.toString();

    // open zeroMQ
    open();
  });

  after(async () => {
    await db.get(constants.DATABASE_DOCUMENTS.USERS).drop();
    await db.get(constants.DATABASE_DOCUMENTS.TRANSACTIONS).drop();
    await db.get(constants.DATABASE_DOCUMENTS.ORDERS).drop();

    // close zeroMQ
    close();
  });

  beforeEach(async () => {
    await db.get(constants.DATABASE_DOCUMENTS.TRANSACTIONS).remove();
    await db.get(constants.DATABASE_DOCUMENTS.ORDERS).remove();

    txService.invalidateBalancesCache();

    await beesV8.start();
  });

  afterEach(async () => {
    beesV8.stop();
  });

  it('placing LIMIT BUY order with enough fund on baseCurrency account should be successful', async () => {
    await txService.deposit(userId, 'USDT', 6001, 'test wallet');
    const availableBalance = await txService.getAvailableBalance(userId, 'USDT');
    expect(availableBalance).to.be.equal(6001);
    const balance = await txService.getBalance(userId, 'USDT');
    expect(balance).to.be.equal(6001);

    const order = {
      type: 'LIMIT',
      side: 'BUY',
      currency: 'BTC',
      baseCurrency: 'USDT',
      quantity: 1,
      filledQuantity: 0.0,
      limitPrice: 6000,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId
    };
    const placeOrder = await orderService.placeOrder(order);
    expect(placeOrder._id).not.to.be.undefined;
    expect(placeOrder.status).to.be.equal(orderSchema.ORDER_STATUS.PLACED);

    const available = await txService.getAvailableBalance(userId, 'USDT');
    expect(available).to.be.equal(1);

    const txArray = await txService.getTransactions(userId, 'USDT');
    expect(txArray.length).to.be.equal(2);
  });

  it('placing LIMIT SELL order with enough fund covering on currency account should be successful', async () => {
    await txService.deposit(userId, 'BTC', 2, 'test wallet');
    const availableBalance = await txService.getAvailableBalance(userId, 'BTC');
    expect(availableBalance).to.be.equal(2);
    const balance = await txService.getBalance(userId, 'BTC');
    expect(balance).to.be.equal(2);

    const order = {
      type: 'LIMIT',
      side: 'SELL',
      currency: 'BTC',
      baseCurrency: 'USDT',
      quantity: 1,
      filledQuantity: 0.0,
      limitPrice: 6000,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId
    };
    const placeOrder = await orderService.placeOrder(order);
    expect(placeOrder._id).not.to.be.undefined;
    expect(placeOrder.status).to.be.equal(orderSchema.ORDER_STATUS.PLACED);

    const available = await txService.getAvailableBalance(userId, 'BTC');
    expect(available).to.be.equal(1);

    const txArray = await txService.getTransactions(userId, 'BTC');
    expect(txArray.length).to.be.equal(2);
  });

  it('placing LIMIT BUY order with not enough fund covering on baseCurreny account should fail', async () => {
    const availablePrecondition = await txService.getAvailableBalance(userId, 'USDT');
    expect(availablePrecondition).to.be.equal(0);
    const balancePrecondition = await txService.getBalance(userId, 'USDT');
    expect(balancePrecondition).to.be.equal(0);

    await txService.deposit(userId, 'USDT', 5999, 'test wallet');
    const availableBalance = await txService.getAvailableBalance(userId, 'USDT');
    expect(availableBalance).to.be.equal(5999);
    const balance = await txService.getBalance(userId, 'USDT');
    expect(balance).to.be.equal(5999);

    const order = {
      type: 'LIMIT',
      side: 'BUY',
      currency: 'BTC',
      baseCurrency: 'USDT',
      quantity: 1,
      filledQuantity: 0.0,
      limitPrice: 6000,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId
    };
    try {
      await orderService.placeOrder(order);
    } catch (err) {
      expect(err.message).to.be.equal('not enought fund available');
    }

    const availableBalanceAfter = await txService.getAvailableBalance(userId, 'USDT');
    expect(availableBalanceAfter).to.be.equal(5999);
  });

  it('placing LIMIT SELL order with not enough fund covering on curreny account should fail', async () => {
    const availablePrecondition = await txService.getAvailableBalance(userId, 'BTC');
    expect(availablePrecondition).to.be.equal(0);
    const balancePrecondition = await txService.getBalance(userId, 'BTC');
    expect(balancePrecondition).to.be.equal(0);

    await txService.deposit(userId, 'BTC', 1, 'test wallet');
    const availableBalance = await txService.getAvailableBalance(userId, 'BTC');
    expect(availableBalance).to.be.equal(1);
    const balance = await txService.getBalance(userId, 'BTC');
    expect(balance).to.be.equal(1);

    const order = {
      type: 'LIMIT',
      side: 'SELL',
      currency: 'BTC',
      baseCurrency: 'USDT',
      quantity: 1.1,
      filledQuantity: 0.0,
      limitPrice: 6000,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId
    };

    try {
      await orderService.placeOrder(order);
    } catch (err) {
      expect(err.message).to.be.equal('not enought fund available');
    }

    const availableBalanceAfter = await txService.getAvailableBalance(userId, 'BTC');
    expect(availableBalanceAfter).to.be.equal(1);
  });

  it('matched orders of same user should not change his balance on currency and baseCurrency accounts', async () => {
    const availablePreconditionBTC = await txService.getAvailableBalance(userId, 'BTC');
    expect(availablePreconditionBTC).to.be.equal(0);
    const balancePreconditionBTC = await txService.getBalance(userId, 'BTC');
    expect(balancePreconditionBTC).to.be.equal(0);
    const availablePreconditionUSDT = await txService.getAvailableBalance(userId, 'USDT');
    expect(availablePreconditionUSDT).to.be.equal(0);
    const balancePreconditionUSDT = await txService.getBalance(userId, 'USDT');
    expect(balancePreconditionUSDT).to.be.equal(0);

    await txService.deposit(userId, 'BTC', 5, 'test wallet');
    await txService.deposit(userId, 'USDT', 5, 'test wallet');

    const orderBUY = {
      type: 'LIMIT',
      side: 'BUY',
      currency: 'BTC',
      baseCurrency: 'USDT',
      quantity: 1,
      filledQuantity: 0.0,
      limitPrice: 1,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId
    };
    await orderService.placeOrder(orderBUY);

    const orderSELL = {
      type: 'LIMIT',
      side: 'SELL',
      currency: 'BTC',
      baseCurrency: 'USDT',
      quantity: 1,
      filledQuantity: 0.0,
      limitPrice: 1,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      userId
    };
    await orderService.placeOrder(orderSELL);

    await sleep(1500);

    const availableBalanceAfterBTC = await txService.getAvailableBalance(userId, 'BTC');
    expect(availableBalanceAfterBTC).to.be.equal(5);

    const availableBalanceAfterUSDT = await txService.getAvailableBalance(userId, 'USDT');
    expect(availableBalanceAfterUSDT).to.be.equal(5);
  });
});
