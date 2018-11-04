const logger = require('../logger');

const { schema, TRANSACTION_TYPE } = require('./transaction.schema');
const constants = require('../app.constants');
const db = require('../db');

const service = db.createService(constants.DATABASE_DOCUMENTS.TRANSACTIONS, schema);

const CREDIT_AVAIL = [TRANSACTION_TYPE.DEPOSIT, TRANSACTION_TYPE.BUY, TRANSACTION_TYPE.RELEASED];
const DEBIT_AVAIL = [TRANSACTION_TYPE.WITHDRAW, TRANSACTION_TYPE.SELL, TRANSACTION_TYPE.LOCKED];
const CREDIT_TOTAL = [TRANSACTION_TYPE.DEPOSIT, TRANSACTION_TYPE.BUY];
const DEBIT_TOTAL = [TRANSACTION_TYPE.WITHDRAW, TRANSACTION_TYPE.SELL];

const { ZERO } = constants;

class TXService {
  constructor() {
    this._creditTotalSumMap = new Map();
    this._debitTotalSumMap = new Map();
    this._creditAvailSumMap = new Map();
    this._debitAvailSumMap = new Map();
  }

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

    let creditSum = 0;
    let debitSum = 0;
    const [credit, debit] = await Promise.all([creditPromise, debitPromise]);
    if (credit.length > 0) creditSum = credit[0].sum;
    if (debit.length > 0) debitSum = debit[0].sum;

    const totalBalance = creditSum - debitSum;

    if (totalBalance < 0) {
      logger.error(`transaction.service.js getBalance(): system book kepping calculations had errors; ${currency} account of userId=${userId} has negative total balance!`);
      throw new Error('system bookkepping calculations had errors: negative total balance!');
    }

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

    let creditSum = 0;
    let debitSum = 0;
    const [credit, debit] = await Promise.all([creditPromise, debitPromise]);
    if (credit.length > 0) creditSum = credit[0].sum;
    if (debit.length > 0) debitSum = debit[0].sum;

    const availableBalance = creditSum - debitSum;

    if (availableBalance < 0) {
      logger.error(`transaction.service.js getAvailableBalance(): system book kepping calculations had errors; ${currency} account of userId=${userId} has negative available balance!`);
      throw new Error('system bookkepping calculations had errors: negative available balance!');
    }

    logger.info(`transaction.service.js getAvailableBalance(): userId=${userId} has ${availableBalance} ${currency} available for trading`);

    return availableBalance;
  }

  /**
   * Updates the four internal SUM maps according to type of the given tx. The four maps act as cache to accelerate
   * the calculating of balance and available balance of user's currency accounts.
   *
   * @param {object} tx: transaction record needs to be accumulated to the four internal map
   * @private
   */
  _updateBalances(tx) {
    const key = tx.userId + tx.currency;
    const {type, amount} = tx;

    if (CREDIT_AVAIL.includes(type)) {
      if (type === TRANSACTION_TYPE.RELEASED) {
        const availableCreditSum = this._creditAvailSumMap.get(key);
        if (availableCreditSum !== undefined) {
          this._creditAvailSumMap.set(key, availableCreditSum + amount);
        }
      }
      else {
        const availableCreditSum = this._creditAvailSumMap.get(key);
        if (availableCreditSum !== undefined) {
          this._creditAvailSumMap.set(key, availableCreditSum + amount);
        }

        const totalCreditSum = this._creditTotalSumMap.get(key);
        if (totalCreditSum !== undefined) {
          this._creditTotalSumMap.set(key, totalCreditSum + amount);
        }
      }
    } else if (DEBIT_AVAIL.includes(type)) {
      if (type === TRANSACTION_TYPE.LOCKED) {
        const availableDebitSum = this._debitAvailSumMap.get(key);
        if (availableDebitSum !== undefined) {
          this._debitAvailSumMap.set(key, availableDebitSum + amount);
        }
      }
      else {
        const availableDebitSum = this._debitAvailSumMap.get(key);
        if (availableDebitSum !== undefined) {
          this._debitAvailSumMap.set(key, availableDebitSum + amount);
        }

        const totalDebitSum = this._debitTotalSumMap.get(key);
        if (totalDebitSum !== undefined) {
          this._debitTotalSumMap.set(key, totalDebitSum + amount);
        }
      }
    }
  }

  /**
   * clear all cached user's currency balances
   * @private
   */
  invalidateBalancesCache() {
    this._creditTotalSumMap = new Map();
    this._debitTotalSumMap = new Map();
    this._creditAvailSumMap = new Map();
    this._debitAvailSumMap = new Map();
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

    this._updateBalances(depositTX);
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

    this._updateBalances(withdrawTX);
    logger.info('transaction.service.js: withdraw(): new withdraw tx = ', JSON.stringify(withdrawTX));

    return withdrawTX;
  }

  /**
   * Releases the remaining locked fund amount of an order, if any.
   * This function is intended to be called when order gets canceled or when has been matched completely.
   * Just fire-n-forget, caller does not expect anything coming from this function.
   *
   * @param userId
   * @param currency
   * @param orderId
   * @returns {Promise<{undefined}>} Promise of nothing
   */
  async releaseLockedFund(userId, currency, orderId) {
    const fundLockQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.LOCKED, orderId });
    const fundReleaseQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.RELEASED, orderId });

    const [fundLockQuery, fundReleaseQuery] = await Promise.all([fundLockQueryPromise, fundReleaseQueryPromise]);

    let totalLockedAmount = 0;
    for (let i = 0; i < fundLockQuery.results.length; i += 1) {
      totalLockedAmount += fundLockQuery.results[i].amount;
    }

    let totalReleasedAmount = 0;
    for (let i = 0; i < fundReleaseQuery.results.length; i += 1) {
      totalReleasedAmount += fundReleaseQuery.results[i].amount;
    }

    const remainingLockedAmount = totalLockedAmount - totalReleasedAmount;
    if (remainingLockedAmount < -ZERO) {
      throw new Error(`system has released more fund than locked amount for orderId=${orderId}!!!; remaing locked fund amount = ${remainingLockedAmount}`);
    }

    if (remainingLockedAmount > 0) {
      const tx = { currency, type: TRANSACTION_TYPE.RELEASED, amount: remainingLockedAmount, createdAt: new Date(), userId, orderId };
      const fundreleasedTX = await service.create(tx);
      this._updateBalances(fundreleasedTX);
      logger.info('transaction.service.js: releaseLockedFund(): release remaining locked fund tx = ', JSON.stringify(fundreleasedTX));
    }
  }

  /**
   * Checks whether remaining locked fund amount of an order can cover the new required amount, if not, locks
   * the additional amount.
   *
   * This function is intended to be called before order gets updated as precondition
   *
   * @param {string} userId
   * @param {string} currency
   * @param {number} amount: fund amount required by the to be updated order
   * @param orderId: id of order which should be updated
   * @returns {Promise<{boolean}>} Promise of boolean value, true if fund locking check was successful
   */
  async checkAndLockAdditionalFund(userId, currency, amount, orderId) {
    const fundLockQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.LOCKED, orderId });
    const fundReleaseQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.RELEASED, orderId });

    const [fundLockQuery, fundReleaseQuery] = await Promise.all([fundLockQueryPromise, fundReleaseQueryPromise]);

    let totalLockedAmount = 0;
    for (let i = 0; i < fundLockQuery.results.length; i += 1) {
      totalLockedAmount += fundLockQuery.results[i].amount;
    }

    let totalReleasedAmount = 0;
    for (let i = 0; i < fundReleaseQuery.results.length; i += 1) {
      totalReleasedAmount += fundReleaseQuery.results[i].amount;
    }

    const remainingLockedAmount = totalLockedAmount - totalReleasedAmount;
    if (remainingLockedAmount < 0) {
      throw new Error(`system has released more fund than locked amount for orderId=${orderId}!!!`);
    }

    if (remainingLockedAmount >= 0 && amount > remainingLockedAmount) {
      const additionalAmount = amount - remainingLockedAmount;
      const available = await this.getAvailableBalance(userId, currency);
      if (available < additionalAmount) {
        throw new Error('not enough fund covering needed to lock the additional required amount');
      }

      const tx = { currency, type: TRANSACTION_TYPE.LOCKED, amount: additionalAmount, createdAt: new Date(), userId, orderId };
      const fundLockTX = service.create(tx);
      this._updateBalances(fundLockTX);
      logger.info(`transaction.service.js: checkAndLockAdditionalFund(): locks additional fund amount required by order update tx=${JSON.stringify(fundLockTX)}`);
    }

    logger.info('transaction.service.js: checkAndLockAdditionalFund(): remaining locked fund covers the new required amount, no need to lock additional fund');
    return true;
  }


  /**
   * Releases over locked amount of the remaining locked fund of the order, if any.
   *
   * @param {string} userId
   * @param {string} currency
   * @param {number} amount: the actual required fund amount of the order
   * @param {string} orderId
   * @returns {Promise<{undefined}>} Promise of nothing
   */
  async releaseOverlockedFund(userId, currency, amount, orderId) {
    const fundLockQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.LOCKED, orderId });
    const fundReleaseQueryPromise = service.find({ userId, currency, type: TRANSACTION_TYPE.RELEASED, orderId });

    const [fundLockQuery, fundReleaseQuery] = await Promise.all([fundLockQueryPromise, fundReleaseQueryPromise]);

    let totalLockedAmount = 0;
    for (let i = 0; i < fundLockQuery.results.length; i += 1) {
      totalLockedAmount += fundLockQuery.results[i].amount;
    }

    let totalReleasedAmount = 0;
    for (let i = 0; i < fundReleaseQuery.results.length; i += 1) {
      totalReleasedAmount += fundReleaseQuery.results[i].amount;
    }

    const remainingLockedAmount = totalLockedAmount - totalReleasedAmount;
    if (remainingLockedAmount < 0) {
      throw new Error(`system has released more fund than locked amount for orderId=${orderId}!!!`);
    }

    if (remainingLockedAmount > amount) {
      const overlockedAmount = remainingLockedAmount - amount;
      const tx = { currency, type: TRANSACTION_TYPE.RELEASED, amount: overlockedAmount, createdAt: new Date(), userId, orderId };
      const fundReleasedTX = await service.create(tx);
      this._updateBalances(fundReleasedTX);
      logger.info(`transaction.service.js: releaseOverlockedFund(): release overlocked fund tx = ${JSON.stringify(fundReleasedTX)}`);
    }
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

    this._updateBalances(fundreleasedTX);
    logger.info(`transaction.service.js: releaseByTrade(): fund release by trade tx = ${JSON.stringify(fundreleasedTX)}`);

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

    this._updateBalances(tradedTX);
    logger.info(`transaction.service.js: buy(): new fund crediting by trade tx = ${JSON.stringify(tradedTX)}`);

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

    this._updateBalances(tradedTX);
    logger.info(`transaction.service.js: sell(): new fund debiting by trade tx = ${JSON.stringify(tradedTX)}`);

    return tradedTX;
  }

  /**
   * Retrieves all transactions of the given currency account of the user
   *
   * @param userId
   * @param currency
   * @returns {Promise<Array<{transaction-obj}>>} Promise of array of 100 last inserted tx records
   */
  async getTransactions(userId, currency) {
    const findQuery = await service.find({ userId, currency }, { sort: { createdAt: -1 }, page: 1, perPage: 100 });
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
      const tx = { currency, type: TRANSACTION_TYPE.LOCKED, amount, orderId, createdAt: new Date(), userId };
      const fundlockedTX = await service.create(tx);
      if (fundlockedTX) {
        this._updateBalances(fundlockedTX);
        logger.info(`transaction.service.js checkFundAndLock(): successful locked ${amount} ${currency} of userId=${userId} for orderId=${orderId}`);
        return true;
      }
    }

    logger.info(`transaction.service.js checkFundAndLock(): fund covering not enough; could not lock ${amount} ${currency} of userId=${userId} for orderId=${orderId}`);
    return false;
  }
}

const txService = new TXService();

module.exports = txService;
