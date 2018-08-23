const { fork } = require('child_process');
const uuid = require('uuid/v4');
const {
  GET_AGGREGATED_STATE_EVENT,
  GET_ORDERBOOK_STATE_EVENT,
  ORDER_BOOK_EVENT
} = require('./orderbook.event');

const { logger } = global;

//const config = require('../config');

const zeroMQ = require('../util/zeroMQpublisher');

async function zmqPublish(message, topic) {
  return new Promise((resolve) => {
    zeroMQ.publish(`${message}`, topic);
    resolve();
  });
}

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
    logger.info(`beesV8.js: start(): beesV8 trading engine for ${this.symbol} starts...`);

    this.orderbookChildProcess = fork('src/trading-engine/orderbook.js');

    this.orderbookChildProcess.on('message', (message) => {
      logger.info(`beesV8.js: receives message from orderboook-childprocess: ${JSON.stringify(message)}`);

      if (message.type === ORDER_BOOK_EVENT) {
        const resolveFunction = this.mapOfIdAndResolveFunction[message.id];
        if (resolveFunction) {
          resolveFunction(message);
          delete this.mapOfIdAndResolveFunction[message.id];
        }

        // publishes orderbook event to UI per zeroMQ if success
        if (message.reason) {
          zmqPublish(JSON.stringify(message), `Orderbook-${this.symbol}`).then(() => {
            logger.info(`beesV8.js: publishes orderbook event per zeroMQ to UI server: \n ${JSON.stringify(message, null, 2)}`);
          });
        }
      }
      else if (message.type === GET_ORDERBOOK_STATE_EVENT || message.type === GET_AGGREGATED_STATE_EVENT) {
        const resolveFunction = this.mapOfIdAndResolveFunction[message.id];
        if (resolveFunction) {
          resolveFunction(message.state);
          delete this.mapOfIdAndResolveFunction[message.id];
        }
      }
      else {
        logger.error(`beesV8.js: unknown message type ${JSON.stringify(message.type)}`);
      }
    });

    logger.info(`beesV8.js: start(): beesV8 trading engine for ${this.symbol} started successfully`);
  }

  /**
   * accept order events and send them to appropriate order book child process
   * which then process them. order service calls this function to send order events
   * to trading engine.
   * @param {Object} event: OrderEvent object to be sent to order book child process
   */
  processOrderEvent(event) {
    logger.info('beesV8.js processOrderEvent(): sends to order book child process order event = ', JSON.stringify(event));

    const messageId = uuid();
    event.id = messageId;
    this.orderbookChildProcess.send(event);

    return new Promise((resolve, reject) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });
  }

  /**
   * Retrieves the current volume-aggregated state of the order book of the given symbol.
   *
   * @param {string} symbol: currency pair symbol of the order book
   * @returns {Promise<Object>} Promise of object representing the current volume-aggregated state of the order book
   */
  async getAggregatedStateOfOrderBook(symbol) {
    if (symbol !== this.symbol) {
      logger.warn('beesV8.js getAggregatedStateOfOrderBook(): receives unknown currency pair symbol=', symbol);
      return null;
    }

    const messageId = uuid();
    const message = {
      type: GET_AGGREGATED_STATE_EVENT,
      id: messageId
    };

    logger.info(`beesV8.js getAggregatedStateOfOrderBook(): sends request to child process of order book ${symbol}`);
    this.orderbookChildProcess.send(message);

    return new Promise((resolve, reject) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });
  }

  /**
   * Retrieves the current state of the order book of the given symbol.
   *
   * @param {string} symbol: currency pair symbol of the order book, e.g 'BTC_USDT'
   * @returns {Promise<{Object}>} Promise of object representing the current state of the order book
   */
  async getCurrentStateOfOrderBook(symbol) {
    if (symbol !== this.symbol) {
      logger.warn('beesV8.js getCurrentStateOfOrderBook(): receives unknown currency pair symbol=', symbol);
      return null;
    }

    const messageId = uuid();
    const message = {
      type: GET_ORDERBOOK_STATE_EVENT,
      id: messageId
    };

    logger.info(`beesV8.js getCurrentStateOfOrderBook(): sends request to child process of order book ${symbol}`);
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
    logger.info(`beesV8.js: start(): beesV8 trading engine for ${this.symbol} has been stopped`);
  }

}

const beesV8 = new BeesV8();

module.exports = beesV8;
