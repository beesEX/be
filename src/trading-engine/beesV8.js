const {fork} = require('child_process');
const uuid = require('uuid/v4');
const {
  ORDER_BOOK_READY_EVENT,
  GET_AGGREGATED_STATE_EVENT,
  GET_ORDERBOOK_STATE_EVENT,
  ORDER_BOOK_EVENT,
  ORDER_BOOK_RESET
} = require('./orderbook.event');

const {GET_OHLCV_DATA_EVENT, OHLCV_AGGREGATOR_RESET} = require('../app.constants');

const logger = require('../logger');
const requestNamespace = require('../config/requestNamespace');

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
class BeesV8{
  constructor() {
    this.symbol = 'BTC_USDT'; // hardcode
    this.mapOfIdAndResolveFunction = {};
    this._starterCallback = undefined;
    this.listOfReadyOrderbook = {};
  }

  /**
   * start the engine
   */
  start() {
    logger.info(`beesV8.js: start(): beesV8 trading engine for ${this.symbol} starts...`);

    this.orderbookChildProcess = fork('src/trading-engine/orderbook.js');

    const originalSendFn = this.orderbookChildProcess.send;

    this.orderbookChildProcess.send = (message) => {
      message.requestId = requestNamespace.get('requestId');
      originalSendFn.call(this.orderbookChildProcess, message);
    };

    const handleMessage = (message) => {
      requestNamespace.set('requestId', message.requestId);
      logger.info(`beesV8.js: receives message from orderboook-childprocess: ${JSON.stringify(message)}`);

      let resolveFunction = this.mapOfIdAndResolveFunction[message.id];

      switch(message.type) {

        case ORDER_BOOK_READY_EVENT:

          logger.info(`beesV8.js: start(): beesV8 trading engine for ${message.symbol} started successfully`);
          this.listOfReadyOrderbook[message.symbol] = true;
          this._starterCallback();

          break;

        case ORDER_BOOK_EVENT:
        case ORDER_BOOK_RESET:
        case OHLCV_AGGREGATOR_RESET:

          if(resolveFunction) {
            resolveFunction(message);
            delete this.mapOfIdAndResolveFunction[message.id];
          }

          // publishes orderbook event to UI per zeroMQ if success
          if(message.reason) {
            zmqPublish(JSON.stringify(message), `Orderbook-${this.symbol}`).then(() => {
              logger.info(`beesV8.js: publishes orderbook event per zeroMQ to UI server: \n ${JSON.stringify(message, null, 2)}`);
            });
          }

          break;

        case GET_ORDERBOOK_STATE_EVENT:
        case GET_AGGREGATED_STATE_EVENT:

          if(resolveFunction) {
            resolveFunction(message.state);
            delete this.mapOfIdAndResolveFunction[message.id];
          }

          break;

        case GET_OHLCV_DATA_EVENT:

          if(resolveFunction) {
            resolveFunction(message.data);
            delete this.mapOfIdAndResolveFunction[message.id];
          }

          break;

        default:
          logger.error(`beesV8.js: unknown message type ${JSON.stringify(message.type)}`);
      }

    };

    // bind on-message event handler to CLS namespace
    this.orderbookChildProcess.on('message', requestNamespace.bind(handleMessage));

    return new Promise((resolve) => {
      this._starterCallback = resolve;
    });
  }

  isReadyFor(symbol) {
    return this.listOfReadyOrderbook[symbol];
  }

  /**
   * accept order events and send them to appropriate order book child process
   * which then process them. order service calls this function to send order events
   * to trading engine.
   * @param {Object} event: OrderEvent object to be sent to order book child process
   */
  processOrderEvent(event) {
    logger.info(`beesV8.js processOrderEvent(): received order event = ${JSON.stringify(event)}`);

    const messageId = uuid();
    event.id = messageId;
    this.orderbookChildProcess.send(event);

    return new Promise((resolve) => {
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
    if(symbol !== this.symbol) {
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

    return new Promise((resolve) => {
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
    if(symbol !== this.symbol) {
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

    return new Promise((resolve) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });
  }

  async getOhlcvData(symbol, resolution, from, to) {
    if(symbol !== this.symbol) {
      logger.warn('beesV8.js getOhlcvData(): receives unknown currency pair symbol=', symbol);
      return null;
    }

    const messageId = uuid();
    const message = {
      type: GET_OHLCV_DATA_EVENT,
      resolution,
      from,
      to,
      id: messageId
    };

    logger.info(`beesV8.js getOhlcvData(): sends request to ohlcv Aggregator ${symbol}`);
    this.orderbookChildProcess.send(message);

    return new Promise((resolve) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });
  }

  resetOhlcvAggregator() {

    const messageId = uuid();

    const message = {

      type: OHLCV_AGGREGATOR_RESET,
      id: messageId

    };

    this.orderbookChildProcess.send(message);

    return new Promise((resolve) => {
      this.mapOfIdAndResolveFunction[messageId] = resolve;
    });

  }

  resetOrderBook() {

    const messageId = uuid();

    const message = {
      type: ORDER_BOOK_RESET,
      id: messageId
    };

    this.orderbookChildProcess.send(message);

    return new Promise((resolve) => {
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
