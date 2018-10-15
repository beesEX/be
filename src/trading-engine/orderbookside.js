const OrderMap = require('./ordermap');
const OrderBookEvent = require('./orderbook.event');

const {ZERO} = require('./../app.constants');

const logger = require('../logger');

/**
 * One side of the order book: ASK or BID, contains data structure to hold the orders of the side.
 */
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
      return false;
    }
    return true;
  }

  /*
  remove order from book
  */
  removeOrder(order) {
    if (!this.orderMap.removeOrder(order)) {
      logger.error('orderbookside.js removeOrder(): ERROR when remove order from book');
      return false;
    }
    return true;
  }

  getOrderByLimitPriceAndOrderId(limitPrice, orderId) {
    return this.orderMap.getOrderByLimitPriceAndOrderId(limitPrice, orderId);
  }

  /*
  update quantity of existing order on book
  */
  updateQuantity(order) {
    // check if new quantity is valid
    const oldOrder = this.getOrderByLimitPriceAndOrderId(order.limitPrice, order._id);
    if (oldOrder) {
      if (oldOrder.filledQuantity <= order.quantity) {
        return this.orderMap.updateOrderQuantity(order);
      }
      logger.error(`orderbookside.js updateQuantity(): ERROR: order id ${order._id} has new quantity ${order.quantity} < filled quantity ${oldOrder.filledQuantity}`);
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
    const ohlcvData = {};

    while (order.remainingQuantity() > ZERO) {
      const bestPriceLevel = this.bestPrice();
      if (bestPriceLevel && order.fulfill(bestPriceLevel)) {
        const tradingEvent = this.match(order, bestPriceLevel);
        logger.debug(`orderbookside.js: tryToMatch(): tradingEvent = ${JSON.stringify(tradingEvent)}`);

        matchingEventList = matchingEventList.concat(tradingEvent.matchingEventList);
        // update ohlcv data
        if (!ohlcvData.time) ohlcvData.time = new Date().getTime(); // [Tung] why don't use the timestamp of the first match of the first tradingEvent.matchingEventList?
        if (!ohlcvData.open) ohlcvData.open = bestPriceLevel;
        ohlcvData.close = bestPriceLevel;
        ohlcvData.high = ohlcvData.high ? Math.max(bestPriceLevel, ohlcvData.high) : bestPriceLevel;
        ohlcvData.low = ohlcvData.low ? Math.min(bestPriceLevel, ohlcvData.low) : bestPriceLevel;
        ohlcvData.volume = ohlcvData.volume ? (ohlcvData.volume + tradingEvent.volume) : tradingEvent.volume;
      }
      else break;
    }
    logger.debug(`orderbookside.js: tryToMatch(): matchingEventList = ${JSON.stringify(matchingEventList)}`);
    logger.debug(`orderbookside.js: tryToMatch(): ohlcvData = ${JSON.stringify(ohlcvData)}`);

    return {
      matchList: matchingEventList,
      ohlcvData: ohlcvData,
    };
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
    let volume = 0;

    while (true) {
      const tmpLLOE = this.orderMap.getFirstElementOfPriceLevel(priceLevel);
      if (!tmpLLOE) break; // all orders at this price level are matched

      const tradedQuantity = Math.min(order.remainingQuantity(), tmpLLOE.order.remainingQuantity());
      volume += tradedQuantity;
      logger.info(`orderbookside.js: match(): matches counter order id=${tmpLLOE.order._id} with trade quantity=${tradedQuantity}`);

      tmpLLOE.order.filledQuantity += tradedQuantity;
      order.filledQuantity += tradedQuantity;

      if (tmpLLOE.order.remainingQuantity() <= ZERO) tmpLLOE.order.filledQuantity = tmpLLOE.order.quantity;
      if (order.remainingQuantity() <= ZERO) order.filledQuantity = order.quantity;

      matchingEventList.push(OrderBookEvent.createNewMatchObject(tmpLLOE.order, tradedQuantity, tmpLLOE.order.remainingQuantity() <= ZERO));

      if (tmpLLOE.order.remainingQuantity() <= ZERO) this.orderMap.removeOrder(tmpLLOE.order);
      if (order.remainingQuantity() <= ZERO) break;
    }

    return {
      matchingEventList,
      volume,
    };
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
