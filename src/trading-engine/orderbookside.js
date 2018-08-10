/**
 * One side of the order book ASK or BID, contains data structure to hold the orders of the side.
 *
 */
const config = require('../config');
const {createConsoleLogger} = require('@paralect/common-logger');

global.logger = createConsoleLogger({isDev: config.isDev});
const {logger} = global;

const OrderMap = require('./ordermap');

const ZERO = 0.0000000000001;
let EventId = 0; // TODO: Is it optimal?

const TRADING_EVENT_TYPE = {
  VOLUME_ADDED_EVENT: 'VOLUME_ADDED_EVENT',
  VOLUME_REMOVED_EVENT: 'VOLUME_REMOVED_EVENT',
  ORDER_MATCHED_EVENT: 'ORDER_MATCHED_EVENT'
};

module.exports = class OrderBookSide {
  constructor(side) {
    this.side = side; // 'ASK' or 'BID'
    this.orderMap = new OrderMap();
  }

  // only use for testing
  getState() {
    return {
      side: this.side,
      orderMap: this.orderMap.getState()
    };
  }

  /*
  put order on book
  */
  putOrderOnBook(order) {
    if (this.orderMap.addOrder(order)) {
      // return VOLUME_ADDED_EVENT
      return {
        type: TRADING_EVENT_TYPE.VOLUME_ADDED_EVENT,
        id: EventId++,
        symbol: 'BTC_USDT',
        price: order.limitPrice,
        quantityAdded: order.remainingQuantity(),
        timestamp: new Date(),
      };
    }
    return null;
  }

  /*
  remove order from book
  */
  removeOrder(order) {
    if (this.orderMap.removeOrder(order)) {
      // return VOLUME_REMOVED_EVENT
      return {
        type: TRADING_EVENT_TYPE.VOLUME_REMOVED_EVENT,
        id: EventId++,
        symbol: 'BTC_USDT',
        price: order.limitPrice,
        quantityRemoved: order.remainingQuantity(),
        timestamp: new Date(),
      };
    }
    return null;
  }

  /*
  update quantity of existing order on book
  */
  updateQuantity(order) {
    // check if new quantity is valid
    const oldOrderElement = this.orderMap.getElementByOrder(order);
    if (oldOrderElement) {
      const differenceQuantity = oldOrderElement.order.quantity - order.quantity;
      if (differenceQuantity <= ZERO || oldOrderElement.order.remainingQuantity() >= differenceQuantity){
        if (this.orderMap.updateOrderQuantity(order)) {
          if (differenceQuantity <= ZERO) {
            // return VOLUME_ADDED_EVENT
            return {
              type: TRADING_EVENT_TYPE.VOLUME_ADDED_EVENT,
              id: EventId++,
              symbol: 'BTC_USDT',
              price: order.limitPrice,
              quantityAdded: Math.abs(differenceQuantity),
              timestamp: new Date(),
            };
          }
          else {
            // return VOLUME_REMOVED_EVENT
            return {
              type: TRADING_EVENT_TYPE.VOLUME_REMOVED_EVENT,
              id: EventId++,
              symbol: 'BTC_USDT',
              price: order.limitPrice,
              quantityRemoved: Math.abs(differenceQuantity),
              timestamp: new Date(),
            };
          }
        }
      }
    }
    return null;
  }

  /*
  order matching core logic. Try to match the given order against counter orders of the book side.
  */
  tryToMatch(order) {
    const tradingEventList = [];
    while (order.remainingQuantity() > ZERO) {
      const bestPriceLevel = this.bestPrice();
      if (bestPriceLevel && order.fulfill(bestPriceLevel)) {
        const tmpTradingEventList = this.match(order, bestPriceLevel);
        if (tmpTradingEventList.length > 0) tradingEventList.concat(tmpTradingEventList);
      }
      else break;
    }
    return tradingEventList;
  }

  /*
  Returns best available price level of counter orders - from point of the view
  of the order being processed.
  For BUY order: minimum asked price
  For SELL order: maximum bid price
  */
  bestPrice() {
    if (this.side === 'ASK') {
      return this.orderMap.getMinPriceLevel();
    }
    // this.side === 'BID'
    return this.orderMap.getMaxPriceLevel();
  }

  /**
   order matching core logic
   @param order - to be processed order
   @param priceLevel - matched price
   */
  match(order, priceLevel) {

    const tradingEventList = [];

    while (true) {
      const tmpLLOE = this.orderMap.getFirstElementOfPriceLevel(priceLevel);
      if (!tmpLLOE) break; // all orders at this price level are matched

      //logger.info(`orderbookside.js: match(): found ${JSON.stringify(tmpLLOE.order)}`);

      if (order.remainingQuantity() < tmpLLOE.order.remainingQuantity()) {
        // order will be fulfilled right now
        logger.info(`orderbookside.js: match(): Match id ${tmpLLOE.order._id} with trade quantity ${order.remainingQuantity()}`);

        // add ORDER_MATCHED_EVENT
        /*
        tradingEventList.push({
          type: TRADING_EVENT_TYPE.ORDER_MATCHED_EVENT,
          id: EventId++,
          symbol: 'BTC_USDT',
          price: priceLevel,
          buyOrderId: (this.side === 'BID') ? tmpLLOE.order._id : order._id,
          sellOrderId: (this.side === 'BID') ? order._id : tmpLLOE.order._id,
          quantity: order.remainingQuantity(),
          makerSide: (this.side === 'BID') ? 'BUY' : 'SELL',
          timestamp: new Date(),
        });
        */
        tmpLLOE.order.filledQuantity += order.remainingQuantity();
        order.filledQuantity = order.quantity;
      }
      else {
        logger.info(`orderbookside.js: match(): Match id ${tmpLLOE.order._id} with trade quantity ${tmpLLOE.order.remainingQuantity()}`);

        // add ORDER_MATCHED_EVENT
        /*
        tradingEventList.push({
          type: TRADING_EVENT_TYPE.ORDER_MATCHED_EVENT,
          id: EventId++,
          symbol: 'BTC_USDT',
          price: priceLevel,
          buyOrderId: (this.side === 'BID') ? tmpLLOE.order._id : order._id,
          sellOrderId: (this.side === 'BID') ? order._id : tmpLLOE.order._id,
          quantity: tmpLLOE.order.remainingQuantity(),
          makerSide: (this.side === 'BID') ? 'BUY' : 'SELL',
          timestamp: new Date(),
        });
        */

        order.filledQuantity += tmpLLOE.order.remainingQuantity();
        tmpLLOE.order.filledQuantity = tmpLLOE.order.quantity;
      }

      if (tmpLLOE.order.remainingQuantity() <= ZERO) {
        this.orderMap.removeOrder(tmpLLOE.order);
      }

      if (order.remainingQuantity() <= ZERO) break;
    }

    return tradingEventList;
  }

  getAggregatedState() {
    function sumOver(propertyName, orderLinkedList) {
      let currentLinkedListElement = orderLinkedList.head;
      let sum = 0;

      while (currentLinkedListElement) {
        sum += currentLinkedListElement.order[propertyName];
        currentLinkedListElement = currentLinkedListElement.next;
      }

      return sum;
    }

    const arrayOfAggregatedStateByPrice = [];

    this.orderMap.priceLevelSet.forEach((price) => {

      const stateByPrice = {
        price
      };

      const orderLinkedList = this.orderMap.mapOfPriceAndOrderLinkedList[price];
      stateByPrice.quantity = sumOver('quantity', orderLinkedList);
      stateByPrice.filledQuantity = sumOver('filledQuantity', orderLinkedList);
      arrayOfAggregatedStateByPrice.push(stateByPrice);

    });

    return arrayOfAggregatedStateByPrice;

  }

};
