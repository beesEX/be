
/**
 * One side of the order book ASK or BID, contains data structure to hold the orders of the side.
 *
 */
const { logger } = global;

const SortedMap = require('./mysortedmap');

const ZERO = 0.0000000000001;

module.exports = class OrderBookSide {
  constructor(side) {
    this.side = side; // 'ASK' or 'BID'
    this.book = new SortedMap();
  }

  /*
  put order on book
  */
  putOrderOnBook(order) {
    this.book.addAtEnd(order.limitPrice, order);
  }

  /*
  remove order from book
  */
  removeOrder(order) {
    const values = this.book.getValue(order.limitPrice);
    for (let i = 0; i < values.length; i += 1) {
      if (values[i]._id === order._id) {
        this.book.removeValue(order.limitPrice, i, 1);
        return;
      }
    }
  }

  /*
  update quantity of existing order on book
  */
  updateQuantity(order) {

    // TODO: QUESTION: need to put item to the end or not ??? (currently YES)

    const values = this.book.getValue(order.limitPrice);
    for (let i = 0; i < values.length; i += 1) {
      if (values[i]._id === order._id) {
        this.book.removeValueAndAddAtEnd(order.limitPrice, order, i, 1);
        return;
      }
    }
  }

  /*remove first order in the list and put the list on book at given priceLevel.
  If the list has only one element, them remove the priceLevel from the book completely.*/
  removeHeadOrder(priceLevel) {
    this.book.removeValue(priceLevel, 0, 1);
  }

  /*
  order matching core logics. Try to match the given order against counter orders of the book side.
  */
  tryToMatch(order) {
    // NEW: optimize search time: one time for both price and order list of this price
    while (order.remainingQuantity() > ZERO) {
      const bestObj = this.bestPriceAndOrders();
      if (bestObj && order.fulfill(bestObj.key)) {

        // TODO: QUESTION: is this call by reference??? (currently think - YES)
        this.match(order, bestObj.key, bestObj.value);
      }
      else {
        return;
      }
    }

    logger.info(`try to match ${JSON.stringify(order)} has been done`);
  }

  bestPriceAndOrders() {
    if (this.side === 'ASK') {
      return this.book.getFirstKeyValue();
    }
    else { // this.side ==='BID'
      return this.book.getLastKeyValue();
    }
  }

  /*
  return best available price level of counter orders - from point of the view of the order to be processed.
  For BUY order: minimum asked price
  For SELL order: maximum bid price
  */
  bestPrice() {
    if (this.side === 'ASK') {
      return this.book.getFirstKey();
    }
    else { // this.side ==='BID'
      return this.book.getLastKey();
    }
  }

  /*
  return the list of counter orders at the best price level - from point of the view of the order to be processed.
  For BUY order: minimum asked price
  For SELL order: maximum bid price
  */
  ordersOfBestPrice() {
    if (this.side === 'ASK') {
      return this.book.getFirstValue();
    }
    else { // this.side ==='BID'
      return this.book.getLastValue();
    }
  }

  /**
   order matching core logics
   @param order - to be processed order
   @param priceLevel - matched price
   @param counterOrderList - list of orders of same price level waiting on book for matching. Orders
   in in this fulfill the limtit price of the order to be processed.
   */
  match(order, priceLevel, counterOrderList) {
    // NEW
    // get all order to match at once

    let i = 0;
    let tradedQuantity = 0.0;

    // find the last order in list which is matched only a part of remaining quantity
    for (; i < counterOrderList.length; i += 1) {
      if (tradedQuantity + counterOrderList[i].remainingQuantity() >= order.remainingQuantity()) break;
      tradedQuantity += counterOrderList[i].remainingQuantity();
    }

    if (i >= counterOrderList.length) { // match all order in list
      // remove this price level in book
      this.book.removeKey(priceLevel);
      // update remaining quantity of order
      order.setRemainingQuantity(order.remainingQuantity() - tradedQuantity);
    }
    else {
      // update remaining quantity of this last order in list
      counterOrderList[i].setRemainingQuantity(counterOrderList[i].remainingQuantity() - (order.remainingQuantity() - tradedQuantity));
      // update book
      // - remove i first elements
      const newCounterOrderList = counterOrderList.splice(0, i);
      this.book.set(priceLevel, newCounterOrderList);
      order.setRemainingQuantity(0.0); // update remaining quantity of order
    }

    /*
    while(counterOrderList.length>0 && order.remainingQuantity()>ZERO) {

      let headOrder = counterOrderList[0]; // counter order dau tien trong list se dc match trc
      let tradedQuantity;

      if (order.remainingQuantity() < headOrder.remainingQuantity()) { // remaining = quantity - filledQuantity
        tradedQuantity = order.remainingQuantity();
        // update order.filledQuantity va headOrder.filledQuantity
        headOrder.setRemainingQuantity(headOrder.remainingQuantity() - tradedQuantity);
        this.updateQuantity(headOrder);
        order.setRemainingQuantity(0.0);
      }
      else {
        tradedQuantity = headOrder.remainingQuantity();
        // update order.filledQuantity
        order.setRemainingQuantity(order.remainingQuantity() - tradedQuantity);
        // remove headOrder from order book:
        this.removeHeadOrder(priceLevel);
      }

      logger.info('matched `${tradedQuantity}` unit(s) of `${JSON.stringify(order)}` against `${JSON.stringify(headOrder)}` for `${priceLevel}` at ${new Date()}');
    }
    */
  }
};

