/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */
const logger = require('../logger');
const {DATABASE_DOCUMENTS} = require('../app.constants');
const db = require('../db');
const balanceSchema = require('./balance.schema');

const Router = require('koa-router');
const txService = require('../wealth-management/transaction.service');
const beesV8 = require('../trading-engine/beesV8');

const balanceService = db.createService(DATABASE_DOCUMENTS.TRANSACTIONS, balanceSchema);

const router = new Router();

const reset = async (ctx) => {

  const arrayOfCollectionsToReset = [DATABASE_DOCUMENTS.TRADES, DATABASE_DOCUMENTS.TRANSACTIONS,
    DATABASE_DOCUMENTS.ORDERS, DATABASE_DOCUMENTS.OHLCV1M, DATABASE_DOCUMENTS.OHLCV5M, DATABASE_DOCUMENTS.OHLCV60M];

  const arrayOfPromises = [];

  arrayOfCollectionsToReset.forEach((collectioName) => {

    const service = db.createService(collectioName);

    arrayOfPromises.push(service.remove());


  });

  arrayOfPromises.push(beesV8.resetOrderBook());

  arrayOfPromises.push(beesV8.resetOhlcvAggregator());

  try{

    await Promise.all(arrayOfPromises);
    logger.debug('reset DB done');

    const userId = ctx.state.user._id.toString();

    let currency = 'BTC';

    let amount = 100000;

    const wallet = 'some test wallet address';

    await txService.deposit(userId, currency, amount, wallet);

    currency = 'USDT';

    amount = 650000000;

    await txService.deposit(userId, currency, amount, wallet);

    ctx.body = {};

  }
  catch(e){

    ctx.body = {

      error: {

        msg: e.message
      }

    };
  }


};

router.post('/reset', reset);

module.exports = router.routes();
