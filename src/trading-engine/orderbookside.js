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
    this.orderMap.addOrder(order);
  }

  /*
  remove order from book
  */
  removeOrder(order) {
    this.orderMap.removeOrder(order);
  }

  /*
  update quantity of existing order on book
  */
  updateQuantity(order) {
    this.orderMap.updateOrderQuantity(order);
  }

  /*
  order matching core logic. Try to match the given order against counter orders of the book side.
  */
  tryToMatch(order) {
    while (order.remainingQuantity() > ZERO) {
      const bestPriceLevel = this.bestPrice();
      if (bestPriceLevel && order.fulfill(bestPriceLevel)) {
        this.match(order, bestPriceLevel);
      }

      return;
    }
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
    while (true) {
      const tmpLLOE = this.orderMap.getFirstElementOfPriceLevel(priceLevel);
      if (!tmpLLOE) break; // all orders at this price level are matched

      if (order.remainingQuantity() < tmpLLOE.order.remainingQuantity()) {
        // order will be fulfilled right now
        logger.info(`orderbookside.js: match(): Match id ${tmpLLOE.order._id} with trade quantity ${order.remainingQuantity()}`);
        tmpLLOE.order.filledQuantity += order.remainingQuantity();
        order.filledQuantity = order.quantity;
      }
      else {
        logger.info(`orderbookside.js: match(): Match id ${tmpLLOE.order._id} with trade quantity ${tmpLLOE.order.remainingQuantity()}`);
        order.filledQuantity += tmpLLOE.order.remainingQuantity();
        tmpLLOE.order.filledQuantity = tmpLLOE.order.quantity;
      }

      if (tmpLLOE.order.remainingQuantity() <= ZERO) {
        this.orderMap.removeOrder(tmpLLOE.order);
      }

      if (order.remainingQuantity() <= ZERO) break;
    }
  }

  getAggregatedState() {
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

function sumOver(propertyName, orderLinkedList) {
  let currentLinkedListElement = orderLinkedList.head;
  let sum = 0;

  while (currentLinkedListElement) {
    sum += currentLinkedListElement.order[propertyName];
    currentLinkedListElement = currentLinkedListElement.next;
  }

  return sum;

}
