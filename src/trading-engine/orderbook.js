const OrderBookSide = require('./orderbookside');
const { OrderEvent } = require('../resources/order/order.models');
const config = require('../config');
const { createConsoleLogger } = require('@paralect/common-logger');

global.logger = createConsoleLogger({ isDev: config.isDev });
const { logger } = global;


/**
 * Limit Order Book performs order matching after principals of price/time priority
 * matching algorithm.
 */
class OrderBook {
  constructor(symbol, askSide, bidSide) {
    this.symbol = symbol; // e.g 'BTC_USDT'
    this.asks = askSide; // BookSide containing SELL orders
    this.bids = bidSide; // BookSide containing BUY orders
  }

  /**
   * checks the order event and dispatches it to appropriate function which processes it.
   * @param event - OrderEvent
   */
  processOrderEvent(event) {
    logger.info(`receices order event: ${event}`);
    if (event.order.symbol() !== this.symbol) {
      logger.warn(`currency pair of order event ${event.order.symbol()} not matches that of order book ${this.symbol}`);
      return;
    }
    if (event.type === OrderEvent.LIMIT_PLACED_EVENT) this.placeLimit(event);
    else if (event.type === OrderEvent.MARKET_PLACED_EVENT) this.placeMarket(event);
    else if (event.type === OrderEvent.LIMIT_UPDATED_EVENT) this.updateLimit(event);
    else if (event.type === OrderEvent.QUANTITY_UPDATED_EVENT) this.updateQuantity(event);
    else if (event.type === OrderEvent.CANCELED_EVENT) this.cancel(event);
    else logger.warn(`unknown event type will be rejected: ${event}`);
  }

  /*
  processes new LIMIT order placed event
  */
  placeLimit(orderPlacedEvent) {
    const { order } = orderPlacedEvent;
    logger.info(`processing new LIMIT order placed: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
    if (order.remainingQuantity() > 0) {
      logger.info(`${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

      if (order.side === 'BUY') {
        this.bids.putOrderOnBook(order);
      }
      else { // SELL
        this.asks.putOrderOnBook(order);
      }
    }
  }

  /*
  processes new MARKET order placed event
  */
  placeMarket(orderPlacedEvent) {
    const { order } = orderPlacedEvent;
    if (order.type !== 'MARKET') {
      logger.info(`received order ${order} is not a MARKET order and will be rejected`);
      return;
    }
    logger.info(`processing new MARKET order placed: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // remaining units of market order will not be put on book, gets just rejected.
    if (order.remainingQuantity() > 0) {
      logger.info(`${order.remainingQuantity()} remaining units of MARKET order will be rejected`);
    }
  }

  /*
  processes LIMIT order updated event
  */
  updateQuantity(orderUpdatedEvent) {
    const { order } = orderUpdatedEvent;
    logger.info(`processing updated LIMIT order : ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.bids.updateQuantity(order);
    }
    else { // SELL
      this.asks.updateQuantity(order);
    }
  }

  /*
  processes LIMIT order updated event, with limit price change
  */
  updateLimit(orderUpdatedEvent) {
    const { order } = orderUpdatedEvent;
    logger.info(`processing updated LIMIT order with limit price change: ${JSON.stringify(order)}`);

    // remove existing order with old price from book
    if (order.side === 'BUY') {
      this.bids.removeOrder(order);
    }
    else { // SELL
      this.asks.removeOrder(order);
    }


    // process updated order like new placed order
    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
    if (order.remainingQuantity() > 0) {
      logger.info(`${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

      if (order.side === 'BUY') {
        this.bids.putOrderOnBook(order);
      }
      else { // SELL
        this.asks.putOrderOnBook(order);
      }
    }
  }

  /*
  processes LIMIT order canceled event
  */
  cancel(orderCanceledEvent) {
    const { order } = orderCanceledEvent;
    logger.info(`processing LIMIT order canceled: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.bids.removeOrder(order);
    }
    else { // SELL
      this.asks.removeOrder(order);
    }
  }
}

// create an order book instance here, hardcode for currency pair BTC_USDT.
const askSide = new OrderBookSide('ASK');
const bidSide = new OrderBookSide('BID');
const orderbook = new OrderBook('BTC_USDT', askSide, bidSide);
logger.info(`${orderbook.symbol} orderbook is ready to accept events`);

// Order Book receives order events from parent process
process.on('message', (event) => {
  orderbook.processOrderEvent(event);
});
