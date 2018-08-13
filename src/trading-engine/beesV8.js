const { fork } = require('child_process');
const uuid = require('uuid/v4');
const { EVENT_GET_AGGREGATED_STATE, EVENT_GET_ORDERBOOK_STATE } = require('./orderbook');

const { logger } = global;

const config = require('../config');

const {open, publish, close} = require('../util/zeroMQpublisher');

async function sendMessage(message, topic) {
  return new Promise((resolve) => {
    setTimeout(() => { // [Tung]: why timeout of 1000 millisecond?
      publish(`${message}`, topic);
      resolve();
    }, 1000);
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
    logger.info(`BeesV8 for ${this.symbol} starts`);

    // start zero MQ
    if (config.isDev) open(); // [Tung]: why not start zeroMQ in app.listen() function in app.js? And conditional starting of zeroMQ only for DEV is wrong too, what is with PROD?

    this.orderbookChildProcess = fork('src/trading-engine/orderbook.js');

    this.orderbookChildProcess.on('message', (message) => {
      logger.info(`beesV8.js: receives message from orderboook-childprocess: ${JSON.stringify(message)}`);

      /**
       * [Tung]: events sent from orderbook-childprocess need to be handled in consistent way. In following if-block
       * you just check type of 'ORDER_BOOK_EVENT', so what is with other event types: 'GET_AGGREGATED_STATE', 'GET_ORDERBOOK_STATE'?
       * I know that the logic in this if-block is specific to 'ORDER_BOOK-EVENT', but at some abstract level the structure of
       * handling logic must be consistent for all event types -> always checking type of events in if-else-if-blocks.
       */
      if (message.type === 'ORDER_BOOK_EVENT') { // [Tung]: define type constant for events where they were emitted in orderbook.js, and use that constant here
        sendMessage(JSON.stringify(message), `Orderbook-${this.symbol}`).then(() => {
          logger.info(`beesV8.js: publishes orderbook event per zeroMQ to UI server: ${JSON.stringify(message)}`);
        });
      }

      /**
       * [Tung]: You don't check event type here, that means, you will do the same logic for all there event types sent from
       * orderbook childprocess, which can't work for events of type 'ORDER_BOOK_EVENT', which do not have id field. Tt is
       * accidentally the correct handling of 'ORDER_BOOK_EVENT', but as mentioned above, the structure of event handling logic
       * for all three event types must be somehow consistent  -> always checking type of events in if-else-if-blocks.
       */
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
    if (config.isDev) close();
  }

}

logger.info('starting the trading engine');
const beesV8 = new BeesV8();
logger.info('beesEX trading engine is up and ready');

module.exports = beesV8;
