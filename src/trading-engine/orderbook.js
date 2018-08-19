const OrderBookSide = require('./orderbookside');
const OrderBookEvent = require('./orderbook.event');

const {Order, OrderEvent, OrderPlacedEvent, MarketOrderPlacedEvent, OrderQuantityUpdatedEvent, OrderLimitUpdatedEvent, OrderCanceledEvent} = require('../resources/order/order.models');

// using later
const config = require('../config');

const {logger} = global;

const ZERO = 0.0000000000001;

/**
 * Limit Order Book performs order matching after principals of price/time priority
 * matching algorithm.
 */
class OrderBook {
  constructor(symbol, askSide, bidSide) {
    this.symbol = symbol; // e.g 'BTC_USDT'
    this.asks = askSide; // BookSide containing SELL orders
    this.bids = bidSide; // BookSide containing BUY orders

    // TODO: load all orders in DB of this symbol and save in to order book side
  }

  /**
   * checks the order event and dispatches it to appropriate function which processes it.
   * @param {Object} event: serialized object with same structure of original OrderEvent-object sent by beesV8 in parent process
   */
  processOrderEvent(event) {
    logger.info(`orderbook.js processOrderEvent(): receices order event: ${JSON.stringify(event)}`);
    const order = new Order(event._order);
    const orderSymbol = `${event._order.currency}_${event._order.baseCurrency}`;
    if (orderSymbol !== this.symbol) {
      logger.warn(`orderbook.js processOrderEvent(): currency pair of order event ${orderSymbol} not matches that of order book ${this.symbol}`);
      return null;
    }
    let orderbookEvent = null;
    if (event._type === OrderEvent.LIMIT_PLACED_EVENT) orderbookEvent = this.placeLimit(new OrderPlacedEvent(order));
    else if (event._type === OrderEvent.MARKET_PLACED_EVENT) orderbookEvent = this.placeMarket(new MarketOrderPlacedEvent(order));
    else if (event._type === OrderEvent.LIMIT_UPDATED_EVENT) orderbookEvent = this.updateLimit(new OrderLimitUpdatedEvent(order, event.oldQuantity, event.oldPrice));
    else if (event._type === OrderEvent.QUANTITY_UPDATED_EVENT) orderbookEvent = this.updateQuantity(new OrderQuantityUpdatedEvent(order, event.oldQuantity, event.oldPrice));
    else if (event._type === OrderEvent.CANCELED_EVENT) orderbookEvent = this.cancel(new OrderCanceledEvent(order));
    else logger.warn(`orderbook.js processOrderEvent(): unknown event type ${event._type} will be rejected`);
    return orderbookEvent;
  }

  /**
   * processes new LIMIT order placed event
   * @param {Object} orderPlacedEvent: OrderPlacedEvent object
   */
  placeLimit(orderPlacedEvent) {
    const {order} = orderPlacedEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderPlacedEvent);

    logger.info(`orderbook.js placeLimit(): processing new LIMIT order placed: ${JSON.stringify(order)}`);

    let matchingEventList = [];

    if (order.side === 'BUY') {
      matchingEventList = this.asks.tryToMatch(order);
    }
    else { // SELL
      matchingEventList = this.bids.tryToMatch(order);
    }

    // if the order could not be filled completely, put the remaining qty on book
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js placeLimit(): ${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

      if (order.side === 'BUY') {
        this.bids.putOrderOnBook(order);
      }
      else { // SELL
        this.asks.putOrderOnBook(order);
      }
    }

    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, matchingEventList, order.remainingQuantity() <= ZERO);
  }

  /**
   * processes new MARKET order placed event
   * @param {Object} orderPlacedEvent: MarketOrderPlacedEvent object
   */
  placeMarket(orderPlacedEvent) {
    const {order} = orderPlacedEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderPlacedEvent);

    if (order.type !== 'MARKET') {
      logger.info(`orderbook.js placeMarket(): received order ${order} is not a MARKET order and will be rejected`);
      return null;
    }
    logger.info(`orderbook.js placeMarket(): processing new MARKET order placed: ${JSON.stringify(order)}`);

    let matchingEventList = [];
    if (order.side === 'BUY') {
      matchingEventList = this.asks.tryToMatch(order);
    }
    else { // SELL
      matchingEventList = this.bids.tryToMatch(order);
    }

    // remaining units of market order will not be put on book, gets just rejected.
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js placeMarket(): ${order.remainingQuantity()} remaining units of MARKET order will be rejected`);
    }

    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, matchingEventList, order.remainingQuantity() <= ZERO);
  }

  /**
   * processes LIMIT order updated event, only quantity has changed
   * @param {Object} orderUpdatedEvent: OrderQuantityUpdatedEvent object
   */
  updateQuantity(orderUpdatedEvent) {
    const {order} = orderUpdatedEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderUpdatedEvent);

    logger.info(`orderbook.js updateQuantity(): processing updated LIMIT order : ${JSON.stringify(order)}`);

    let isSuccessfullyUpdated;

    if (order.side === 'BUY') {
      isSuccessfullyUpdated = this.bids.updateQuantity(order);
      if (isSuccessfullyUpdated && order.remainingQuantity() <= ZERO) this.bids.removeOrder(order);
    }
    else { // SELL
      isSuccessfullyUpdated = this.asks.updateQuantity(order);
      if (isSuccessfullyUpdated && order.remainingQuantity() <= ZERO) this.asks.removeOrder(order);
    }

    if (isSuccessfullyUpdated) return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, null, order.remainingQuantity() <= ZERO);
    logger.error(`orderbook.js updateQuantity(): failed to update event ${JSON.stringify(orderUpdatedEvent)}`);
    return null;
  }

  /**
   * processes LIMIT order updated event, with limit price change
   * @param {Object} orderUpdatedEvent: OrderLimitUpdatedEvent object
   */
  updateLimit(orderUpdatedEvent) {
    const {order} = orderUpdatedEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderUpdatedEvent);

    logger.info(`orderbook.js updateLimit(): processing updated LIMIT order with limit price change: ${JSON.stringify(order)}`);

    const oldOrder = new Order(JSON.parse(JSON.stringify(order)));
    oldOrder.limitPrice = orderUpdatedEvent.oldPrice;

    // remove existing order with old price from book
    if (order.side === 'BUY') {
      this.bids.removeOrder(oldOrder);
    }
    else { // SELL
      this.asks.removeOrder(oldOrder);
    }

    let matchingEventList = [];
    // process updated order like new placed order
    if (order.side === 'BUY') {
      matchingEventList = this.asks.tryToMatch(order);
    }
    else { // SELL
      matchingEventList = this.bids.tryToMatch(order);
    }

    // if the order could not be filled completely, put the remaining qty on book
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js updateLimit(): ${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

      if (order.side === 'BUY') {
        this.bids.putOrderOnBook(order);
      }
      else { // SELL
        this.asks.putOrderOnBook(order);
      }
    }

    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, matchingEventList, order.remainingQuantity() <= ZERO);
  }

  /**
   * processes LIMIT order canceled event
   * @param {Object} orderCanceledEvent: OrderCanceledEvent object
   */
  cancel(orderCanceledEvent) {
    const {order} = orderCanceledEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderCanceledEvent);

    logger.info(`orderbook.js cancel(): processing LIMIT order canceled: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.bids.removeOrder(order);
    }
    else { // SELL
      this.asks.removeOrder(order);
    }

    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, null, order.remainingQuantity() <= ZERO);
  }

  /**
   * @return {Object} current volume-aggregated state of order book
   */
  getAggregatedState() {

    const state = {};
    state.symbol = this.symbol;
    state.asks = this.asks.getAggregatedState();
    state.bids = this.bids.getAggregatedState();

    return state;

  }

  /**
   * @return {Object} current state of order book
   */
  getOrderBookState() {

    const orderState = {};
    orderState.symbol = this.symbol;
    orderState.askSide = this.asks.getState();
    orderState.bidSide = this.bids.getState();

    return orderState;
  }
}

// create an order book instance here, hardcode for currency pair BTC_USDT.
const askSide = new OrderBookSide('ASK');
const bidSide = new OrderBookSide('BID');
const orderbook = new OrderBook('BTC_USDT', askSide, bidSide);
logger.info(`orderbook.js: ${orderbook.symbol} orderbook is ready to accept events`);

// Order Book event handling logic for events received from parent process, sent by beesV8.js
process.on('message', (event) => {
  switch (event.type) {
    case OrderBookEvent.EVENT_GET_AGGREGATED_STATE: {
      logger.debug(`orderbook.js: received a message from parent process of type ${OrderBookEvent.EVENT_GET_AGGREGATED_STATE}`);

      const state = orderbook.getAggregatedState();
      process.send({
        id: event.id,
        type: OrderBookEvent.EVENT_GET_AGGREGATED_STATE,
        state
      });

      break;
    }
    case OrderBookEvent.EVENT_GET_ORDERBOOK_STATE: {
      logger.debug(`orderbook.js: received a message from parent process of type ${OrderBookEvent.EVENT_GET_ORDERBOOK_STATE}`);

      const state = orderbook.getOrderBookState();
      process.send({
        id: event.id,
        type: OrderBookEvent.EVENT_GET_ORDERBOOK_STATE,
        state
      });

      break;
    }
    default: {
      const orderbookEvent = orderbook.processOrderEvent(event.orderEvent);
      // send order book event back to parent process
      process.send({
        id: event.id,
        type: OrderBookEvent.ORDER_BOOK_EVENT,
        orderbookEvent
      });
    }
  }
});
