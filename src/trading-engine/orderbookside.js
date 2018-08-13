/**
 * One side of the order book ASK or BID, contains data structure to hold the orders of the side.
 *
 */
const config = require('../config');
const {createConsoleLogger} = require('@paralect/common-logger');

global.logger = createConsoleLogger({isDev: config.isDev});
const {logger} = global;

const OrderMap = require('./ordermap');
const OrderBookEvent = require('./orderbook.event');

const ZERO = 0.0000000000001;

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
    if (!this.orderMap.addOrder(order)) {
      logger.error('orderbookside.js putOrderOnBook(): ERROR when put order on book');
    }
  }

  /*
  remove order from book
  */
  removeOrder(order) {
    if (!this.orderMap.removeOrder(order)) {
      logger.error('orderbookside.js removeOrder(): ERROR when remove order from book');
    }
  }

  /*
  update quantity of existing order on book
  */
  updateQuantity(order) {
    // check if new quantity is valid
    const oldOrderElement = this.orderMap.getElementByOrder(order);
    if (oldOrderElement) {
      if (oldOrderElement.order.filledQuantity <= order.quantity) {
        return this.orderMap.updateOrderQuantity(order);
      }
      logger.error(`orderbookside.js updateQuantity(): ERROR: order id ${order._id} has new quantity ${order.quantity} < filled quantity ${oldOrderElement.order.filledQuantity}`);
      return null;
    }
    logger.error(`orderbookside.js updateQuantity(): ERROR: not found this order id ${order._id} at price ${order.limitPrice}`);
    return null;
  }

  /*
  order matching core logic. Try to match the given order against counter orders of the book side.
  */
  tryToMatch(order) {
    let matchingEventList = [];
    while (order.remainingQuantity() > ZERO) {
      const bestPriceLevel = this.bestPrice();
      if (bestPriceLevel && order.fulfill(bestPriceLevel)) {
        const tmpTradingEventList = this.match(order, bestPriceLevel);
        logger.debug(`orderbookside.js: tryToMatch(): tmpTradingEventList = ${JSON.stringify(tmpTradingEventList)}`);

        matchingEventList = matchingEventList.concat(tmpTradingEventList);
      }
      else break;
    }
    logger.debug(`orderbookside.js: tryToMatch(): matchingEventList = ${JSON.stringify(matchingEventList)}`);
    return matchingEventList;
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
    const matchingEventList = [];

    while (true) {
      const tmpLLOE = this.orderMap.getFirstElementOfPriceLevel(priceLevel);
      if (!tmpLLOE) break; // all orders at this price level are matched


      if (order.remainingQuantity() < tmpLLOE.order.remainingQuantity()) {
        // order will be fulfilled right now
        logger.info(`orderbookside.js: match(): Match id ${tmpLLOE.order._id} with trade quantity ${order.remainingQuantity()}`);

        const tradedQuantity = order.remainingQuantity();
        tmpLLOE.order.filledQuantity += tradedQuantity;
        order.filledQuantity = order.quantity;

        matchingEventList.push(OrderBookEvent.createNewMatchObject(tmpLLOE.order, tradedQuantity));
      }
      else {
        logger.info(`orderbookside.js: match(): Match id ${tmpLLOE.order._id} with trade quantity ${tmpLLOE.order.remainingQuantity()}`);

        const tradedQuantity = tmpLLOE.order.remainingQuantity();
        order.filledQuantity += tradedQuantity;
        tmpLLOE.order.filledQuantity = tmpLLOE.order.quantity;

        matchingEventList.push(OrderBookEvent.createNewMatchObject(tmpLLOE.order, tradedQuantity));
      }

      if (tmpLLOE.order.remainingQuantity() <= ZERO) {
        this.orderMap.removeOrder(tmpLLOE.order);
      }

      if (order.remainingQuantity() <= ZERO) break;
    }

    return matchingEventList;
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
