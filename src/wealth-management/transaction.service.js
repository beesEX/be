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
  }
};
