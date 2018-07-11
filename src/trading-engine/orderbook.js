const ZERO = 0.0000000000001;

module.exports = class OrderBook {
  constructor(askSide, bidSide) {
    this.asks = askSide; // BookSide containing SELL orders
    this.bids = bidSide; // BookSide containing BUY orders
  }

  /*
  processes new LIMIT order placed event
  */
  placeLimit(orderPlacedEvent) {
    const order = orderPlacedEvent.order;
    logger.info('processing new LIMIT order placed: `${JSON.stringify(order)}`');

    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
    if (order.remainingQuantity() > ZERO) {
      logger.info('${order.remainingQuantity()} remaining units of LIMIT order will be put on book');

      if (order.side === 'BUY') {
        this.asks.putOrderOnBook(order);
      }
      else { // SELL
        this.bids.putOrderOnBook(order);
      }
    }
  }

  /*
  processes new MARKET order placed event
  */
  placeMarket(orderPlacedEvent) {
    const order = orderPlacedEvent.order;
    logger.info('processing new MARKET order placed: `${JSON.stringify(order)}`');

    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }
    // remaining units of market order will not be put on book, gets just rejected.
    if (order.remainingQuantity() > ZERO) {
      logger.info('${order.remainingQuantity()} remaining units of MARKET order will be rejected');
    }
  }

  /*
  processes LIMIT order updated event
  */
  updateQuantity(orderUpdatedEvent) {
    const order = orderUpdatedEvent.order;
    logger.info('processing updated LIMIT order : `${JSON.stringify(order)}`');

    if (order.side === 'BUY') {
      this.asks.updateQuantity(order);
    }
    else { // SELL
      this.bids.updateQuantity(order);
    }
  }

  /*
  processes LIMIT order updated event, with limit price change
  */
  updateLimit(orderUpdatedEvent) {
    const order = orderUpdatedEvent.order;
    logger.info('processing updated LIMIT order with limit price change: `${JSON.stringify(order)}`');

    // remove existing order with old price from book
    if (order.side === 'BUY') {
      this.asks.removeOrder(order);
    }
    else { // SELL
      this.bids.removeOrder(order);
    }


    // process updated order like new placed order
    if (order.side === 'BUY') {
      this.asks.tryToMatch(order);
    }
    else { // SELL
      this.bids.tryToMatch(order);
    }

    // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
    if (order.remainingQuantity() > ZERO) {
      logger.info('${order.remainingQuantity()} remaining units of LIMIT order will be put on book');

      if (order.side === 'BUY') {
        this.asks.putOrderOnBook(order);
      }
      else { // SELL
        this.bids.putOrderOnBook(order);
      }
    }
  }

  /*
  processes LIMIT order canceled event
  */
  cancel(orderCanceledEvent) {
    const order = orderCanceledEvent.order;
    logger.info('processing LIMIT order canceled: `${JSON.stringify(order)}`');

    if (order.side === 'BUY') {
      this.asks.removeOrder(order);
    }
    else { // SELL
      this.bids.removeOrder(order);
    }
  }
};