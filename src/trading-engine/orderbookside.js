
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
    this.book = new SortedMap(); // [Tung]: bad naming, dung dat ten la 'book', em co the dat ten la orderMap, orderTree gi do thi dung hon
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
  removeOrder(order) { // [Tung]: leaky abstraction -> bad API design of underlying data structure, tat ca logics cua cai function nay dung ra phai thuc hien ben trong mysortedmap, vi day la trach nhiem cua underlying data structure
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
  updateQuantity(order) { // [Tung]: leaky abstraction -> bad API design of underlying data structure, tat ca logics cua cai function nay dung ra phai thuc hien ben trong mysortedmap, vi day la trach nhiem cua underlying data structure
    // TODO: QUESTION: need to put item to the end or not ??? NO, quantity changes do not change the matching priority

    const values = this.book.getValue(order.limitPrice);
    for (let i = 0; i < values.length; i += 1) {
      if (values[i]._id === order._id) {
        this.book.removeValueAndAddAtEnd(order.limitPrice, order, i, 1); // [Tung]: update quantity cua mot order dang nam tren so ko thay doi vi tri cua no o trong list!
        return;
      }
    }
  }

  /*
  Remove first order in the list and put the list on book at given priceLevel.
  If the list has only one element, them remove the priceLevel from the book completely.
  */
  removeHeadOrder(priceLevel) {
    this.book.removeValue(priceLevel, 0, 1); // [Tung]: leaky abstraction -> bad API design of underlying data structure, why the hell do i need to know what 0 and 1 are needed for?
  }

  /*
  order matching core logics. Try to match the given order against counter orders of the book side.
  */
  tryToMatch(order) {
    // NEW: optimize search time: one time for both price and order list of this price
    while (order.remainingQuantity() > ZERO) {
      const bestObj = this.bestPriceAndOrders(); // [Tung]: very bad naming, what is bestObj, what does bestObj.key, bestObj.value mean in this context?
      if (bestObj && order.fulfill(bestObj.key)) {
        // TODO: QUESTION: is this call by reference??? in JS it is always call by ref, if inputs are not primiteve types
        this.match(order, bestObj.key, bestObj.value); // [Tung]: very bad naming, what is bestObj?, what does bestObj.key, bestObj.value mean in this context?
      }
      else {
        return;
      }
    }

    //logger.info(`try to match ${JSON.stringify(order)} has been done`);
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
  Returns best available price level of counter orders - from point of the view
  of the order being processed.
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
  return the list of counter orders at the best price level - from point of the view
  of the order to be processed.
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
            in this list fulfill the limit price of the order being processed.
   */
  match(order, priceLevel, counterOrderList) {
    // NEW
    // get all order to match at once

    let i = 0;
    let tradedQuantity = 0.0;

    // find the last order in list which is matched only a part of remaining quantity
    for (; i < counterOrderList.length; i += 1) { // [Tung]: khong cong don tradedQuantity nhu the nay! Boi vi sau nay cho moi mot cai match giua 2 orders orderbook se phai sinh ra mot trade event ghi lai traded quantity da matched giua 2 orders do, de settlement module biet duong ma quyet toan
      if (tradedQuantity + counterOrderList[i].remainingQuantity() >= order.remainingQuantity()) break;
      tradedQuantity += counterOrderList[i].remainingQuantity();
    }

    if (i >= counterOrderList.length) { // match all order in list
      // remove this price level in book
      this.book.removeKey(priceLevel);
      // update remaining quantity of order
      order.setRemainingQuantity(order.remainingQuantity() - tradedQuantity); // [Tung]: remainingQuantity() la util function de access transient status cua order (quantity - filledQuantity), khong set value cho transient status bang mot setter truc tiep ma hay set value cua nhung original status (filledQuantity)
    }
    else {
      // update remaining quantity of this last order in list
      counterOrderList[i].setRemainingQuantity(counterOrderList[i].remainingQuantity() - (order.remainingQuantity() - tradedQuantity));
      // update book
      // - remove i first elements
      const newCounterOrderList = counterOrderList.splice(0, i);
      this.book.set(priceLevel, newCounterOrderList);
      order.setRemainingQuantity(0.0); // update remaining quantity of order [Tung]: remainingQuantity() la util function de access transient status cua order (quantity - filledQuantity), khong set value cho transient status bang mot setter truc tiep ma hay set value cua nhung original status (filledQuantity)
    }

    // [Tung]: dung doan code ma em commented out di, vi no moi la giai thuat dung. Nhin dong logger.info() ay, dong day sau nay se dc thay bang 1 dong sinh ra trade event de settlement module xu ly va thuc hien quyet toan

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

