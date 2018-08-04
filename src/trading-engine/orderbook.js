const OrderBookSide = require('./orderbookside');
const {Order, OrderEvent, OrderPlacedEvent, MarketOrderPlacedEvent, OrderQuantityUpdatedEvent, OrderLimitUpdatedEvent, OrderCanceledEvent} = require('../resources/order/order.models');
const config = require('../config');
const {createConsoleLogger} = require('@paralect/common-logger');

global.logger = createConsoleLogger({isDev: config.isDev});
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
  }

  /**
   * checks the order event and dispatches it to appropriate function which processes it.
   * @param event - OrderEvent
   */
  processOrderEvent(event) {
    logger.info(`orderbook.js processOrderEvent(): receices order event: ${JSON.stringify(event)}`);

    const order = new Order(event._order);
    const orderSymbol = `${event._order.currency}_${event._order.baseCurrency}`;
    if (orderSymbol !== this.symbol) {
      logger.warn(`orderbook.js processOrderEvent(): currency pair of order event ${orderSymbol} not matches that of order book ${this.symbol}`);
      return;
    }
    if (event._type === OrderEvent.LIMIT_PLACED_EVENT) this.placeLimit(new OrderPlacedEvent(order));
    else if (event._type === OrderEvent.MARKET_PLACED_EVENT) this.placeMarket(new MarketOrderPlacedEvent(order));
    else if (event._type === OrderEvent.LIMIT_UPDATED_EVENT) this.updateLimit(new OrderLimitUpdatedEvent(order));
    else if (event._type === OrderEvent.QUANTITY_UPDATED_EVENT) this.updateQuantity(new OrderQuantityUpdatedEvent(order));
    else if (event._type === OrderEvent.CANCELED_EVENT) this.cancel(new OrderCanceledEvent(order));
    else logger.warn(`orderbook.js processOrderEvent(): unknown event type ${event._type} will be rejected`);

    //this.showBook();
  }

  /*
  processes new LIMIT order placed event
  */
  placeLimit(orderPlacedEvent) {
    const {order} = orderPlacedEvent;
    logger.info(`orderbook.js placeLimit(): processing new LIMIT order placed: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
    if (order.remainingQuantity() > 0) {
      logger.info(`orderbook.js placeLimit(): ${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

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
    const {order} = orderPlacedEvent;
    if (order.type !== 'MARKET') {
      logger.info(`orderbook.js placeMarket(): received order ${order} is not a MARKET order and will be rejected`);
      return;
    }
    logger.info(`orderbook.js placeMarket(): processing new MARKET order placed: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // remaining units of market order will not be put on book, gets just rejected.
    if (order.remainingQuantity() > ZERO) {
      logger.info(`orderbook.js placeMarket(): ${order.remainingQuantity()} remaining units of MARKET order will be rejected`);
    }
  }

  /*
  processes LIMIT order updated event
  */
  updateQuantity(orderUpdatedEvent) {
    const {order} = orderUpdatedEvent;
    logger.info(`orderbook.js updateQuantity(): processing updated LIMIT order : ${JSON.stringify(order)}`);

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
    const {order} = orderUpdatedEvent;
    logger.info(`orderbook.js updateLimit(): processing updated LIMIT order with limit price change: ${JSON.stringify(order)}`);

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
      logger.info(`orderbook.js updateLimit(): ${order.remainingQuantity()} remaining units of LIMIT order will be put on book`);

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
    const {order} = orderCanceledEvent;
    logger.info(`orderbook.js cancel(): processing LIMIT order canceled: ${JSON.stringify(order)}`);

    if (order.side === 'BUY') {
      this.bids.removeOrder(order);
    }
    else { // SELL
      this.asks.removeOrder(order);
    }
  }

  getAggregatedState() {

    const state = {};
    state.asks = this.asks.getAggregatedState();
    state.bids = this.bids.getAggregatedState();

    return state;

  }

  getOrderBookState() {

    const orderState = {};
    orderState.symbol = this.symbol;
    orderState.askSide = this.asks.getState();
    orderState.bidSide = this.bids.getState();

    return orderState;
  }

  seeDetails(orderbookside){
    const book = orderbookside.orderMap;
    const keyArr = book.priceLevelSet.toArray();

    keyArr.map((val) => {
      //logger.info(`At price ${val}`);
      console.log('At price '+val);

      let LLOE = book.getFirstElementOfPriceLevel(val);
      while (LLOE){
        //logger.info(`id: ${LLOE.order._id}   quan: ${LLOE.order.quantity}   filled: ${LLOE.order.filledQuantity}`);
        console.log('id:',LLOE.order._id,'   quan:',LLOE.order.quantity, '   filled:',LLOE.order.filledQuantity);
        LLOE = LLOE.next;
      }

      return val;
    });
  }

  showBook(){
    //logger.info(' ==== BID_Book ==== ');
    console.log(' ==== BID_Book ==== ');
    this.seeDetails(this.bids);
    //logger.info(' ==== ASK_Book ==== ');
    console.log(' ==== ASK_Book ==== ');
    this.seeDetails(this.asks);
  }

}

// create an order book instance here, hardcode for currency pair BTC_USDT.
const askSide = new OrderBookSide('ASK');
const bidSide = new OrderBookSide('BID');
const orderbook = new OrderBook('BTC_USDT', askSide, bidSide);
logger.info(`orderbook.js: ${orderbook.symbol} orderbook is ready to accept events`);

// Order Book receives order events from parent process
process.on('message', (event) => {
  switch (event._type) {
    case EVENT_GET_AGGREGATED_STATE:
      logger.debug(`orderbook.js: received a message of type ${EVENT_GET_AGGREGATED_STATE}`);
      const state = orderbook.getAggregatedState();
      process.send({
        id: event.id,
        type: EVENT_GET_AGGREGATED_STATE,
        state
      });

      break;

    case EVENT_GET_ORDERBOOK_STATE:
      logger.debug(`orderbook.js: received a message of type ${EVENT_GET_ORDERBOOK_STATE}`);
      const orderState = orderbook.getOrderBookState();
      //logger.info(`orderbook.js: state ${JSON.stringify(orderState)}`);
      process.send({
        id: event.id,
        type: EVENT_GET_ORDERBOOK_STATE,
        orderState
      });

      break;

    default:
      orderbook.processOrderEvent(event);
  }
});

const EVENT_GET_AGGREGATED_STATE = 'GET_AGGREGATED_STATE';

const EVENT_GET_ORDERBOOK_STATE = 'GET_ORDERBOOK_STATE';

module.exports = {

  EVENT_GET_AGGREGATED_STATE,
  EVENT_GET_ORDERBOOK_STATE,

};
