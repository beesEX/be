const logger = require('../logger');

global.logger = logger;

const OrderBookSide = require('./orderbookside');
const OrderBookEvent = require('./orderbook.event');
const OrderService = require('../resources/order/order.service');

const {Order, OrderEvent, OrderPlacedEvent, MarketOrderPlacedEvent, OrderQuantityUpdatedEvent, OrderLimitUpdatedEvent, OrderCanceledEvent} = require('../resources/order/order.models');

const TradeExecutionService = require('../settlement/tradeexecution.service');
const ohlcvAggregator = require('../marketdata/ohlcvAggregator');

const requestNamespace = require('../config/requestNamespace');

const {ZERO} = require('./../app.constants');


/**
 * Limit Order Book performs order matching after principals of price/time priority
 * matching algorithm.
 */
class OrderBook {
  constructor(symbol, askSide, bidSide) {
    this.symbol = symbol; // e.g 'BTC_USDT'
    this.asks = askSide; // BookSide containing SELL orders
    this.bids = bidSide; // BookSide containing BUY orders

    const readyEvent = {
      type: OrderBookEvent.ORDER_BOOK_READY_EVENT,
      symbol: this.symbol,
    };

    // load all active orders for this symbol in DB
    logger.info(`orderbook.js constructor(): initiating order book of symbol=${JSON.stringify(this.symbol)} ...`);
    OrderService.getActiveOrdersOfSymbol(this.symbol).then(async (activeOrderLists) => {
      if (activeOrderLists) {
        for (let i = 0; i < activeOrderLists.length; i += 1) {
          logger.info(`orderbook.js constructor(): loaded order=${JSON.stringify(activeOrderLists[i])}`);
          const toBeLoadedOrder = new Order(activeOrderLists[i]);
          if (toBeLoadedOrder.side === 'BUY') {
            this.bids.putOrderOnBook(toBeLoadedOrder);
          }
          else { // SELL
            this.asks.putOrderOnBook(toBeLoadedOrder);
          }
        }
      }
      // initialize OHLCV aggregator
      await ohlcvAggregator.init();
      logger.info('orderbook.js constructor(): finished initializing OHLCV Aggregator');

      process.send(readyEvent);
    });
  }

  /**
   * checks the order event and dispatches it to appropriate function which processes it.
   * @param {Object} event: serialized object with same structure of original OrderEvent-object sent by beesV8 in
   *         parent process
   */
  processOrderEvent(event) {
    logger.info(`orderbook.js processOrderEvent(): receices order event: ${JSON.stringify(event)}`);
    const order = new Order(event._order);
    const orderSymbol = `${event._order.currency}_${event._order.baseCurrency}`;

    if (orderSymbol !== this.symbol) {
      logger.warn(`orderbook.js processOrderEvent(): currency pair of order event ${orderSymbol} not matches that of order book ${this.symbol}`);
      return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
    }

    let orderbookEvent = null;
    if (event._type === OrderEvent.LIMIT_PLACED_EVENT) orderbookEvent = this.placeLimit(new OrderPlacedEvent(order));
    else if (event._type === OrderEvent.MARKET_PLACED_EVENT) orderbookEvent = this.placeMarket(new MarketOrderPlacedEvent(order));
    else if (event._type === OrderEvent.LIMIT_UPDATED_EVENT) orderbookEvent = this.updateLimit(new OrderLimitUpdatedEvent(order, event.oldQuantity, event.oldPrice));
    else if (event._type === OrderEvent.QUANTITY_UPDATED_EVENT) orderbookEvent = this.updateQuantity(new OrderQuantityUpdatedEvent(order, event.oldQuantity, event.oldPrice));
    else if (event._type === OrderEvent.CANCELED_EVENT) orderbookEvent = this.cancel(new OrderCanceledEvent(order));
    else logger.warn(`orderbook.js processOrderEvent(): unknown event type ${event._type} will be rejected`);
    if (!orderbookEvent) return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null,null, null);
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

    let matchingEvent = null;

    if (order.side === 'BUY') {
      matchingEvent = this.asks.tryToMatch(order);
    }
    else { // SELL
      matchingEvent = this.bids.tryToMatch(order);
    }

    // if the order could not be filled completely, put the remaining qty on book
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js placeLimit(): ${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);
      
      if (order.side === 'BUY') {
        if (!this.bids.putOrderOnBook(order)) return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null,null, null);
      }
      else { // SELL
        if (!this.asks.putOrderOnBook(order)) return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
      }
    }

    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, matchingEvent && matchingEvent.matchList, matchingEvent && matchingEvent.ohlcvData, order.remainingQuantity() <= ZERO);
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
      return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
    }
    logger.info(`orderbook.js placeMarket(): processing new MARKET order placed: ${JSON.stringify(order)}`);

    let matchingEvent = null;
    if (order.side === 'BUY') {
      matchingEvent = this.asks.tryToMatch(order);
    }
    else { // SELL
      matchingEvent = this.bids.tryToMatch(order);
    }

    // remaining units of market order will not be put on book, gets just rejected.
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js placeMarket(): ${order.remainingQuantity()} remaining units of MARKET order will be rejected`);
    }
    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, matchingEvent && matchingEvent.matchList, matchingEvent && matchingEvent.ohlcvData, order.remainingQuantity() <= ZERO);
  }

  /**
   * processes LIMIT order updated event, only quantity has changed
   * @param {Object} orderUpdatedEvent: OrderQuantityUpdatedEvent object
   */
  updateQuantity(orderUpdatedEvent) {
    const {order} = orderUpdatedEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderUpdatedEvent);

    logger.info(`orderbook.js updateQuantity(): processing updated LIMIT order : ${JSON.stringify(order)}`);

    let updatedOrder = null;

    if (order.side === 'BUY') {
      updatedOrder = this.bids.updateQuantity(order);
    }
    else { // SELL
      updatedOrder = this.asks.updateQuantity(order);
    }

    if (updatedOrder) return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, null, null, updatedOrder.remainingQuantity() <= ZERO);
    logger.error(`orderbook.js updateQuantity(): failed to update event ${JSON.stringify(orderUpdatedEvent)}`);
    return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
  }

  /**
   * processes LIMIT order updated event, with limit price change
   * @param {Object} orderUpdatedEvent: OrderLimitUpdatedEvent object
   */
  updateLimit(orderUpdatedEvent) {
    const {order} = orderUpdatedEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderUpdatedEvent);

    logger.info(`orderbook.js updateLimit(): processing updated LIMIT order with limit price change: ${JSON.stringify(order)}`);

    // check: fillQuantity of orderUpdatedEvent and order on book should be the same before processing can proceed
    let oldOrder = null;
    if (order.side === 'BUY') {
      oldOrder = this.bids.getOrderByLimitPriceAndOrderId(orderUpdatedEvent.oldPrice, order._id);
    }
    else { // SELL
      oldOrder = this.asks.getOrderByLimitPriceAndOrderId(orderUpdatedEvent.oldPrice, order._id);
    }
    logger.info(`orderbook.js updateLimit(): old Order on book = ${JSON.stringify(oldOrder)}`);
    if (!oldOrder) {
      logger.error('orderbook.js updateLimit(): ERROR: not found this order to update');
      return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
    }
    if (oldOrder.filledQuantity !== order.filledQuantity) {
      logger.error(`orderbook.js updateLimit(): ERROR: old filled quantity=${oldOrder.filledQuantity} != new filled quantity=${order.filledQuantity}`);
      return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
    }

    // remove existing order with old price from book
    let isRemoved = false;
    if (order.side === 'BUY') {
      isRemoved = this.bids.removeOrder(oldOrder);
    }
    else { // SELL
      isRemoved = this.asks.removeOrder(oldOrder);
    }
    if (!isRemoved) {
      logger.error('orderbook.js updateLimit(): ERROR: unable to remove order before updating limit price');
      return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null);
    }

    let matchingEvent = null;
    // process updated order like new placed order
    if (order.side === 'BUY') {
      matchingEvent = this.asks.tryToMatch(order);
    }
    else { // SELL
      matchingEvent = this.bids.tryToMatch(order);
    }

    // if the order could not be filled completely, put the remaining qty on book
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js updateLimit(): ${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

      let isPut = false;
      if (order.side === 'BUY') {
        isPut = this.bids.putOrderOnBook(order);
      }
      else { // SELL
        isPut = this.asks.putOrderOnBook(order);
      }
      if (!isPut) {
        logger.error('orderbook.js updateLimit(): ERROR: unable to put on order book side');
        return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
      }
    }

    return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, matchingEvent && matchingEvent.matchList, matchingEvent && matchingEvent.ohlcvData, order.remainingQuantity() <= ZERO);

  }

  /**
   * processes LIMIT order canceled event
   * @param {Object} orderCanceledEvent: OrderCanceledEvent object
   */
  cancel(orderCanceledEvent) {
    const {order} = orderCanceledEvent;
    const reasonObject = OrderBookEvent.createNewReasonObject(orderCanceledEvent);

    logger.info(`orderbook.js cancel(): processing LIMIT order canceled: ${JSON.stringify(order)}`);

    let isCanceled = false;
    if (order.side === 'BUY') {
      isCanceled = this.bids.removeOrder(order);
    }
    else { // SELL
      isCanceled = this.asks.removeOrder(order);
    }

    if (isCanceled) return OrderBookEvent.createNewOrderbookEvent(this.symbol, reasonObject, null, null, order.remainingQuantity() <= ZERO);

    logger.error('orderbook.js cancel(): unable to cancel order');
    return OrderBookEvent.createNewOrderbookEvent(this.symbol, null, null, null, null);
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

// Order Book event handling logic for events received from parent process, sent by beesV8.js
const handleMessage = (event) => {
  requestNamespace.set('requestId', event.requestId);
  switch (event.type) {
    case OrderBookEvent.GET_AGGREGATED_STATE_EVENT: {
      logger.debug(`orderbook.js: received a message from parent process of type ${OrderBookEvent.GET_AGGREGATED_STATE_EVENT}`);

      const state = orderbook.getAggregatedState();
      process.send({
        id: event.id,
        type: OrderBookEvent.GET_AGGREGATED_STATE_EVENT,
        state
      });

      break;
    }
    case OrderBookEvent.GET_ORDERBOOK_STATE_EVENT: {
      logger.debug(`orderbook.js: received a message from parent process of type ${OrderBookEvent.GET_ORDERBOOK_STATE_EVENT}`);

      const state = orderbook.getOrderBookState();
      process.send({
        id: event.id,
        type: OrderBookEvent.GET_ORDERBOOK_STATE_EVENT,
        state
      });

      break;
    }
    default: {
      const listOfOrderEventType = [];
      listOfOrderEventType.push(OrderEvent.LIMIT_PLACED_EVENT);
      listOfOrderEventType.push(OrderEvent.MARKET_PLACED_EVENT);
      listOfOrderEventType.push(OrderEvent.LIMIT_UPDATED_EVENT);
      listOfOrderEventType.push(OrderEvent.QUANTITY_UPDATED_EVENT);
      listOfOrderEventType.push(OrderEvent.CANCELED_EVENT);

      if(listOfOrderEventType.indexOf(event._type) >= 0) {
        logger.debug(`orderbook.js: received a message from parent process of type ${event._type}`);
        const orderbookEvent = orderbook.processOrderEvent(event);

        // send order book event to settlement module
        if (orderbookEvent && orderbookEvent.reason) TradeExecutionService.executeTrades(orderbookEvent);

        // send ohlcvData to ohlcvAggreagtor
        if (orderbookEvent.ohlcvData && orderbookEvent.ohlcvData.time) ohlcvAggregator.collectOhlcvTradeData(orderbookEvent.ohlcvData);

        // send order book event back to parent process
        orderbookEvent.id = event.id;
        process.send(orderbookEvent);
      }
      break;
    }
  }
};
process.on('message', (event) => {
  logger.debug(`orderbook.js: received a message = ${JSON.stringify(event)}`);
  const handle = requestNamespace.bind(handleMessage);

  handle(event);

});

const originalProcessSendFn = process.send;

process.send = (message) => {

  message.requestId = requestNamespace.get('requestId');

  originalProcessSendFn.call(process, message);

};
