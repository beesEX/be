
/**
 * One side of the order book ASK or BID, contains data structure to hold the orders of the side.
 *
 */
const { logger } = global;

const OrderMap = require('./ordermap');

const ZERO = 0.0000000000001;

module.exports = class OrderBookSide {
  constructor(side) {
    this.side = side; // 'ASK' or 'BID'
    this.orderMap = new OrderMap();
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
  order matching core logics. Try to match the given order against counter orders of the book side.
  */
  tryToMatch(order) {
    while (order.remainingQuantity() > ZERO) {
      const bestPriceLevel = this.bestPrice();
      if (bestPriceLevel && order.fulfill(bestPriceLevel)) {
        this.match(order, bestPriceLevel);
      }
      else {
        return;
      }
    }

    //logger.info(`try to match ${JSON.stringify(order)} has been done`);
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
    else { // this.side ==='BID'
      return this.orderMap.getMaxPriceLevel();
    }
  }

  /**
   order matching core logics
   @param order - to be processed order
   @param priceLevel - matched price
   */
  match(order, priceLevel) {
    while (true) {
      const tmpLLOE = this.orderMap.getFirstElementOfPriceLevel(priceLevel);
      if (!tmpLLOE) break; // all orders at this price level are matched

      if (order.remainingQuantity() < tmpLLOE.order.remainingQuantity()) {
        // order will be fulfilled right now
        console.log('orderbookside.js: match(): Match id', tmpLLOE.order._id, 'with trade quantity', order.remainingQuantity());
        tmpLLOE.order.filledQuantity += order.remainingQuantity();
        order.filledQuantity = order.quantity;
      }
      else {
        console.log('orderbookside.js: match(): Match id', tmpLLOE.order._id, 'with trade quantity', tmpLLOE.order.remainingQuantity());
        order.filledQuantity += tmpLLOE.order.remainingQuantity();
        tmpLLOE.order.filledQuantity = tmpLLOE.order.quantity;
      }

      if (tmpLLOE.order.remainingQuantity() <= ZERO) {
        this.orderMap.removeOrder(tmpLLOE.order);
      }

      if (order.remainingQuantity() <= ZERO) break;
    }
  }
};

