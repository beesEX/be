const {logger} = global;

const { schema, TRANSACTION_TYPE } = require('./transaction.schema');
const constants = require('../app.constants');
const db = require('../db');

const service = db.createService(constants.DATABASE_DOCUMENTS.TRANSACTIONS, schema);

const CREDIT_AVAIL = [TRANSACTION_TYPE.DEPOSIT, TRANSACTION_TYPE.BUY, TRANSACTION_TYPE.RELEASED];
const DEBIT_AVAIL = [TRANSACTION_TYPE.WITHDRAW, TRANSACTION_TYPE.SELL, TRANSACTION_TYPE.LOCKED];
const CREDIT_TOTAL = [TRANSACTION_TYPE.DEPOSIT, TRANSACTION_TYPE.BUY];
const DEBIT_TOTAL = [TRANSACTION_TYPE.WITHDRAW, TRANSACTION_TYPE.SELL];

class TXService {
  /**
   * Returns the total balance for the given currency which the user owns. Note that the entire amount of this balance
   * is not available for trading, because some part of it might being locked by some open orders.
   *
   * @see getAvailableBalance to get available balance for trading
   *
   * @param {string} userId
   * @param {string} currency
   * @returns {Promise<number>} Promise of number representing the total balance
   */
  async getBalance(userId, currency) {
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

    let creditSum = 0;
    let debitSum = 0;
    if (credit.length > 0) creditSum = credit[0].sum;
    if (debit.length > 0) debitSum = debit[0].sum;
    const totalBalance = creditSum - debitSum;
    logger.info(`transaction.service.js getBalance(): userId=${userId} has total ${totalBalance} ${currency}`);

    return totalBalance;
  }

  /**
   * Returns the available balance for the given currency which the user owns. This balance is available for trading.
   * Note: that's not the total balance for the currency, because some part of it might being locked
   * by some open orders.
   *
   * @see getBalance to get total balance
   *
   * @param {string} userId
   * @param {string} currency
   * @returns {Promise<number>} Promise of number representing the balance available for trading
   */
  async getAvailableBalance(userId, currency) {
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
    let creditSum = 0;
    let debitSum = 0;
    if (credit.length > 0) creditSum = credit[0].sum;
    if (debit.length > 0) debitSum = debit[0].sum;
    const availableBalance = creditSum - debitSum;
    logger.info(`transaction.service.js getAvailableBalance(): userId=${userId} has ${availableBalance} ${currency} available for trading`);

    return availableBalance;
  }

  /**
   * Deposits an amount for the given currency account of the user.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param fromWallet external wallet address from which the amount was transfer
   * @returns {Promise<{Object}>} Promise of the tx record of the deposit
   */
  async deposit(userId, currency, amount, fromWallet) {
    const tx = { currency, type: TRANSACTION_TYPE.DEPOSIT, amount, fromWallet, createdAt: new Date(), userId };
    const depositTX = await service.create(tx);
    logger.info('transaction.service.js: deposit(): new deposit tx = ', JSON.stringify(depositTX));

    return depositTX;
  }

  /**
   * Transfers an amount of the given currency account of the user to an external wallet.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param toWallet external wallet address to which the amount should be transfer
   * @returns {Promise<{Object}>} Promise of the tx record of the withdraw
   */
  async withdraw(userId, currency, amount, toWallet) {
    const tx = { currency, type: TRANSACTION_TYPE.WITHDRAW, amount, toWallet, createdAt: new Date(), userId };
    const withdrawTX = await service.create(tx);
    logger.info('transaction.service.js: withdraw(): new withdraw tx = ', JSON.stringify(withdrawTX));

    return withdrawTX;
  }

  /**
   * Locks an amount of the given currency account of the user by an open order.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId id of a new order or updated order
   * @returns {Promise<{Object}>} Promise of the tx record of the fund lock
   */
  async lock(userId, currency, amount, orderId) {
    const tx = { currency, type: TRANSACTION_TYPE.LOCKED, amount, orderId, createdAt: new Date(), userId };
    const fundlockedTX = await service.create(tx);
    logger.info('transaction.service.js: lock(): new fund lock tx = ', JSON.stringify(fundlockedTX));

    return fundlockedTX;
  }

  /**
   * Releases the remaining locked fund amount of an order.
   * This function is intended to be called when order gets updated or canceled.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId
   * @returns {Promise<{Object}>} Promise of the tx record if success
   */
  async releaseLockedFund(userId, currency, orderId) {
    const fundLockQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.LOCKED, orderId });
    const fundReleaseQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.RELEASED, orderId });

    const [fundLockQuery, fundReleaseQuery] = await Promise.all([fundLockQueryPromise, fundReleaseQueryPromise]);

    if (fundLockQuery.results.length === 0) {
      throw new Error('no fund locked for the orderId=', orderId);
    }
    if (fundLockQuery.results.length > 1) {
      throw new Error('there are more than one fund lock tx found for the orderId=', orderId);
    }
    const totalLockedAmount = fundLockQuery.results[0].amount;

    let totalReleasedAmount = 0;
    for (let i = 0; i < fundReleaseQuery.results.length; i += 1) {
      totalReleasedAmount += fundReleaseQuery.results[i].amount;
    }

    const remainingLockedAmount = totalLockedAmount - totalReleasedAmount;
    if (remainingLockedAmount < 0) {
      throw new Error(`system has released more fund than locked amount for orderId=${orderId}!!!`);
    }

    const tx = { currency, type: TRANSACTION_TYPE.RELEASED, remainingLockedAmount, createdAt: new Date(), userId, orderId };
    const fundreleasedTX = await service.create(tx);
    logger.info('transaction.service.js: releaseLockedFund(): release remaining locked fund tx = ', JSON.stringify(fundreleasedTX));

    return fundreleasedTX;
  }

  /**
   * Releases an amount of the given currency account of the user for a matched order, whose fund has been locked before.
   * This function is intended to be called while executing trades of matched orders.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId
   * @return {Promise<{Object}>} Promise of the tx record if success
   */
  async releaseByTrade(userId, currency, amount, orderId) {
    const tx = { currency, type: TRANSACTION_TYPE.RELEASED, amount, createdAt: new Date(), userId, orderId };
    const fundreleasedTX = await service.create(tx);
    logger.info('transaction.service.js: releaseByTrade(): fund release by trade tx = ', JSON.stringify(fundreleasedTX));

    return fundreleasedTX;
  }

  /**
   * Credits the traded amount for the given currency account of the user by a matched order.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId id of matched order for which the trade was executed
   * @returns {transaction-obj} the tx record of the fund credit
   */
  async buy(userId, currency, amount, orderId) {
    const tx = { currency, type: TRANSACTION_TYPE.BUY, amount, orderId, createdAt: new Date(), userId };
    const tradedTX = await service.create(tx);
    logger.info('transaction.service.js: buy(): new fund crediting by trade tx = ', JSON.stringify(tradedTX));

    return tradedTX;
  }

  /**
   * Debits the traded amount for the given currency account of the user by a matched order.
   *
   * @param userId
   * @param currency
   * @param amount
   * @param orderId id of matched order for which the trade was executed
   * @returns {Promise<{Object}>} Promise of the tx record of the fund debit
   */
  async sell(userId, currency, amount, orderId) {
    const tx = { currency, type: TRANSACTION_TYPE.SELL, amount, orderId, createdAt: new Date(), userId };
    const tradedTX = await service.create(tx);
    logger.info('transaction.service.js: sell(): new fund debiting by trade tx = ', JSON.stringify(tradedTX));

    return tradedTX;
  }

  /**
   * Retrieves all transactions of the given currency account of the user
   *
   * @param userId
   * @param currency
   * @returns {Promise<Array<{transaction-obj}>>} Promise of array of found tx records
   */
  async getTransactions(userId, currency) {
    const findQuery = await service.find({ userId, currency }, { sort: { createdAt: -1 } });
    logger.info(`transaction.service.js getTransactions(): retrieves transactions for ${currency} account of userId=${userId} found ${findQuery.results.length} transaction(s)`);
    return findQuery.results;
  }

  /**
   * Checks fund and lock if available balance of user can cover the required amount.
   * @param {string} userId
   * @param {string} currency
   * @param {number} amount
   * @param {string} orderId: monk-generated id of the order, for which the required amount of fund should be locked
   * @returns {Promise<boolean>} true, if fund was locked successful, otherwise false
   */
  async checkFundAndLock(userId, currency, amount, orderId) {
    const available = await this.getAvailableBalance(userId, currency);
    if (available >= amount) {
      const lockFundTX = await this.lock(userId, currency, amount, orderId);
      if (lockFundTX) {
        logger.info(`transaction.service.js checkFundAndLock(): successful locked ${amount} ${currency} of userId=${userId} for orderId=${orderId}`);
        return true;
      }
    }

    logger.info(`transaction.service.js checkFundAndLock(): could not lock ${amount} ${currency} of userId=${userId} for orderId=${orderId}`);
    return false;
  }
}

const txService = new TXService();

module.exports = txService;
