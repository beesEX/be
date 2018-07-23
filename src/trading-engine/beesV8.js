const { fork } = require('child_process');
const uuid = require('uuid/v4');
const { EVENT_GET_AGGREGATED_STATE } = require('./orderbook');

const { logger } = global;

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

  async getAggregatedStateOfOrderBook(currency, baseCurrency) {

    //TODO use currency, baseCurrency to decide which order book should be used
    const messageId = uuid();

    const message = {

      _type: EVENT_GET_AGGREGATED_STATE,

      id: messageId

    }

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
