const { fork } = require('child_process');

const { logger } = global;

/**
 * The trading engine of the beesEX platform.
 * Each order book instance will be run by a child process.
 */
class BeesV8 {
  constructor() {
    this.symbol = 'BTC_USDT'; // hardcode
  }

  /**
   * start the engine
   */
  start() {
    const options = {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    };
    this.orderbookChildProcess = fork('src/trading-engine/orderbook.js');
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
}

logger.info('starting the trading engine');
const beesV8 = new BeesV8();
logger.info('beesEX trading engine is up and ready');

module.exports = beesV8;
