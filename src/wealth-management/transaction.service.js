const {logger} = global;

const { schema, TRANSACTION_TYPE } = require('./transaction.schema');
const constants = require('app.constants');
const db = require('db');

const service = db.createService(constants.DATABASE_DOCUMENTS.TRANSACTIONS, schema);

const CREDIT_AVAIL = [TRANSACTION_TYPE.DEPOSIT, TRANSACTION_TYPE.BUY, TRANSACTION_TYPE.RELEASED];
const DEBIT_AVAIL = [TRANSACTION_TYPE.WITHDRAW, TRANSACTION_TYPE.SELL, TRANSACTION_TYPE.LOCKED];
const CREDIT_TOTAL = [TRANSACTION_TYPE.DEPOSIT, TRANSACTION_TYPE.BUY];
const DEBIT_TOTAL = [TRANSACTION_TYPE.WITHDRAW, TRANSACTION_TYPE.SELL];


module.exports = {
  /**
   * Returns the total balance for the given currency which the user owns. Note that the entire amount of this balance
   * is not available for trading, because some part of it might being locked by some open orders.
   *
   * @see getAvailableBalance to get available balance for trading
   *
   * @param {string} userId
   * @param {string} currency
   * @returns {number} total balance
   */
  getBalance: async (userId, currency) => {
    const creditPromise = service.aggregate([
      {$match: {userId, currency, type: {$in: CREDIT_TOTAL}}},
      {$group: {_id: null, sum: {$sum: '$amount'}}},
      {$project: {_id: 0, sum: 1}}
    ]);

    const debitPromise = service.aggregate([
      {$match: {userId, currency, type: {$in: DEBIT_TOTAL}}},
      {$group: {_id: null, sum: {$sum: '$amount'}}},
      {$project: {_id: 0, sum: 1}}
    ]);

    const [credit, debit] = await Promise.all([creditPromise, debitPromise]);
    const totalBalance = credit.sum - debit.sum;
    logger.info(`transaction.service.js getBalance(): userId=${userId} has total ${totalBalance} ${currency}`);

    return totalBalance;
  },

  /**
   * Returns the available balance for the given currency which the user owns. This balance is available for trading.
   * Note: that's not the total balance for the currency, because some part of it might being locked
   * by some open orders.
   *
   * @see getBalance to get total balance
   *
   * @param {string} userId
   * @param {string} currency
   * @returns {number} balance available for trading
   */
  getAvailableBalance: async (userId, currency) => {
    const creditPromise = service.aggregate([
      {$match: {userId, currency, type: {$in: CREDIT_AVAIL}}},
      {$group: {_id: null, sum: {$sum: '$amount'}}},
      {$project: {_id: 0, sum: 1}}
    ]);

    const debitPromise = service.aggregate([
      {$match: {userId, currency, type: {$in: DEBIT_AVAIL}}},
      {$group: {_id: null, sum: {$sum: '$amount'}}},
      {$project: {_id: 0, sum: 1}}
    ]);

    const [credit, debit] = await Promise.all([creditPromise, debitPromise]);
    const availableBalance = credit.sum - debit.sum;
    logger.info(`transaction.service.js getAvailableBalance(): userId=${userId} has ${availableBalance} ${currency} available for trading`);

    return availableBalance;
  },

  /**
   * Deposits an amount for the given currency account of the user.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param fromWallet external wallet address from which the amount was transfer
   * @returns {transaction-obj} the tx record of the deposit
   */
  deposit: async (userId, currency, amount, fromWallet) => {
    const tx = { currency, type: TRANSACTION_TYPE.DEPOSIT, amount, fromWallet, createdAt: new Date(), userId };
    const depositTX = await service.create(tx);
    logger.info('transaction.service.js: deposit(): new deposit tx = ', JSON.stringify(depositTX));

    return depositTX;
  },

  /**
   * Transfers an amount of the given currency account of the user to an external wallet.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param toWallet external wallet address to which the amount should be transfer
   * @returns {transaction-obj} the tx record of the withdraw
   */
  withdraw: async (userId, currency, amount, toWallet) => {
    const tx = { currency, type: TRANSACTION_TYPE.WITHDRAW, amount, toWallet, createdAt: new Date(), userId };
    const withdrawTX = await service.create(tx);
    logger.info('transaction.service.js: withdraw(): new withdraw tx = ', JSON.stringify(withdrawTX));

    return withdrawTX;
  },

  /**
   * Locks an amount of the given currency account of the user by an open order.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId id of a new order or updated order
   * @returns {transaction-obj} the tx record of the fund lock
   */
  lock: async (userId, currency, amount, orderId) => {
    const tx = { currency, type: TRANSACTION_TYPE.LOCKED, amount, orderId, createdAt: new Date(), userId };
    const fundlockedTX = await service.create(tx);
    logger.info('transaction.service.js: lock(): new fund lock tx = ', JSON.stringify(fundlockedTX));

    return fundlockedTX;
  },

  /**
   * Releases an amount of the given currency account of the user, which has been locked before.
   *
   * @param userId
   * @param currency
   * @param amount
   * @returns {transaction-obj} the tx record of the fund release
   */
  release: async (userId, currency, amount) => {
    const tx = { currency, type: TRANSACTION_TYPE.RELEASED, amount, createdAt: new Date(), userId };
    const fundreleasedTX = await service.create(tx);
    logger.info('transaction.service.js: release(): new fund release tx = ', JSON.stringify(fundreleasedTX));

    return fundreleasedTX;
  },

  /**
   * Credits the traded amount for the given currency account of the user by a matched order.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId id of matched order for which the trade was executed
   * @returns {transaction-obj} the tx record of the fund credit
   */
  buy: async (userId, currency, amount, orderId) => {
    const tx = { currency, type: TRANSACTION_TYPE.BUY, amount, orderId, createdAt: new Date(), userId };
    const tradedTX = await service.create(tx);
    logger.info('transaction.service.js: buy(): new fund crediting by trade tx = ', JSON.stringify(tradedTX));

    return tradedTX;
  },

  /**
   * Debits the traded amount for the given currency account of the user by a matched order.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId id of matched order for which the trade was executed
   * @returns {transaction-obj} the tx record of the fund debit
   */
  sell: async (userId, currency, amount, orderId) => {
    const tx = { currency, type: TRANSACTION_TYPE.SELL, amount, orderId, createdAt: new Date(), userId };
    const tradedTX = await service.create(tx);
    logger.info('transaction.service.js: sell(): new fund debiting by trade tx = ', JSON.stringify(tradedTX));

    return tradedTX;
  },
};
