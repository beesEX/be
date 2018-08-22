global.logger = require('../../logger');

const {describe, it} = require('mocha');
const { expect } = require('chai');
const userFactory = require('../../resources/user/user.factory');
const orderService = require('./order.service');
const txService = require('../../wealth-management/transaction.service');
const beesV8 = require('../../trading-engine/beesV8');
const {open, close} = require('../../util/zeroMQpublisher');
const db = require('../../db');
const constants = require('../../app.constants');
const orderSchema = require('./order.schema');


const {logger} = global;

describe('place new LIMIT order', () => {
  let userId;

  before(() => {
    logger.info('----- BEFORE -----');


    return new Promise(async (resolve) => {
      const user = await userFactory.verifiedUser();
      userId = user._id.toString();


      // open zeroMQ
      open();

      beesV8.start();

      resolve(true);
    });
  });

  after(async () => {
    await db.get(constants.DATABASE_DOCUMENTS.USERS).drop();
    await db.get(constants.DATABASE_DOCUMENTS.TRANSACTIONS).drop();
    await db.get(constants.DATABASE_DOCUMENTS.ORDERS).drop();

    // close zeroMQ
    close();

    beesV8.stop();
  });

  it('placing LIMIT BUY order with enough fund on baseCurrency account should be successful', async () => {
    await txService.deposit(userId, 'USDT', 6001, 'test wallet');

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
    logger.info(`------- new place order=${JSON.stringify(placeOrder)}`);

    expect(placeOrder._id).not.to.be.undefined;
    expect(placeOrder.status).to.be.equal(orderSchema.ORDER_STATUS.PLACED);

    const available = await txService.getAvailableBalance(userId, 'USDT');
    expect(available).to.be.equal(1);
  });
});
