const { fork } = require('child_process');
const uuid = require('uuid/v4');
const { EVENT_GET_AGGREGATED_STATE, EVENT_GET_ORDERBOOK_STATE } = require('./orderbook');

const { logger } = global;
/*
const {publish, close} = require('../util/zeroMQpublisher');

async function sendMessage(message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      publish(`${message}`, 'world');
      resolve();
    }, 1000);
  });
}
*/

/**
 * The trading engine of the beesEX platform.
 * Each order book instance will be run by a child process.
 */
class BeesV8 {
  constructor() {
    this.symbol = 'BTC_USDT'; // hardcode
    this.mapOfIdAndResolveFunction = {};
  }

  /**
   * start the engine
   */
  start() {
    this.orderbookChildProcess = fork('src/trading-engine/orderbook.js');

    this.orderbookChildProcess.on('message', (message) => {
      logger.info(`beesV8.js: receives message from orderboook-childprocess: ${JSON.stringify(message)}`);

      //if (message.type === 'ORDER_BOOK_EVENT') sendMessage(message).then(() => {close();});

      const resolveFunction = this.mapOfIdAndResolveFunction[message.id];
      if (resolveFunction) {
        resolveFunction(message.state);
        delete this.mapOfIdAndResolveFunction[message.id];
      }
    });
  }

  /**
   * accept order events and send them to appropriate order book child process
   * which then process them. order service calls this function to send order events
   * to trading engine.
   * @param event
   */
  processOrderEvent(event) {
    logger.info('beesV8.js processOrderEvent(): receives order event = ', JSON.stringify(event));
    this.orderbookChildProcess.send(event);
  }

  /**
   * Retrieves the current volume-aggregated state of the order book of the given symbol.
   *
   * @param symbol currency pair symbol of the order book
   * @returns {Promise<*>}
   */
  async getAggregatedStateOfOrderBook(symbol) {
    if (symbol !== this.symbol) {
      logger.warn('beesV8.js getAggregatedStateOfOrderBook(): receives unknown currency pair symbol=', symbol);
      return null;
    }

    const messageId = uuid();
    const message = {
      type: EVENT_GET_AGGREGATED_STATE,
      id: messageId
    };

    this.orderbookChildProcess.send(message);

    return new Promise((resolve, reject) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });
  }

  /**
   * Retrieves the current state of the order book of the given symbol.
   *
   * @param symbol currency pair symbol of the order book
   * @returns {Promise<*>}
   */
  async getCurrentStateOfOrderBook(symbol) {
    if (symbol !== this.symbol) {
      logger.warn('beesV8.js getCurrentStateOfOrderBook(): receives unknown currency pair symbol=', symbol);
      return null;
    }

    const messageId = uuid();
    const message = {
      type: EVENT_GET_ORDERBOOK_STATE,
      id: messageId
    };

    this.orderbookChildProcess.send(message);

    return new Promise((resolve, reject) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });
  }

  /**
   * stop the engine
   */
  stop() {

    this.orderbookChildProcess.kill();

  }

}

logger.info('starting the trading engine');
const beesV8 = new BeesV8();
logger.info('beesEX trading engine is up and ready');

module.exports = beesV8;
