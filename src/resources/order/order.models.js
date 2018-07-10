class Order {
  constructor(orderObjFromDB) {
    this._id = orderObjFromDB._id;
    this.type = orderObjFromDB.type;
    this.side = orderObjFromDB.side;
    this.currency = orderObjFromDB.currency;
    this.baseCurrency = orderObjFromDB.baseCurrency;
    this.limitPrice = orderObjFromDB.limitPrice;
    this.quantity = orderObjFromDB.quantity;
    this.filledQuantity = orderObjFromDB.filledQuantity;
    this.status = orderObjFromDB.status;
    this.createdAt = orderObjFromDB.createdAt;
    this.lastUpdatedAt = orderObjFromDB.lastUpdatedAt;
    this.userId = orderObjFromDB.userId;
  }

  /**
   * checks whether the given price fulfills the limit price of the order
   * @param price
   * @returns {boolean}
   */
  fulfill(price) {
    if (this.type === 'MARKET') return true;
    else if (this.type === 'LIMIT') {
      if (this.side === 'BUY') {
        return this.limitPrice >= price;
      }
      return this.limitPrice <= price;
    }
    return false;
  }

  /**
   * returns symbol string of the currency pair. e.g. 'BTC/USDT'
   */
  symbol() {
    return `${this.currency}/${this.baseCurrency}`;
  }
}

class OrderEvent {
  constructor(orderFromModel) {
    this.order = orderFromModel;
  }
  static PLACED_EVENT = 'OrderPlacedEvent';
  static QUANTITY_UPDATED_EVENT = 'OrderQuantityUpdatedEvent';
  static LIMIT_UPDATED_EVENT = 'OrderLimitUpdatedEvent';
  static CANCELED_EVENT = 'OrderCanceledEvent';
}

class OrderPlacedEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    this.type = OrderEvent.PLACED_EVENT;
  }
}

class OrderQuantityUpdatedEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    this.type = OrderEvent.QUANTITY_UPDATED_EVENT;
  }
}

class OrderLimitUpdatedEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    this.type = OrderEvent.LIMIT_UPDATED_EVENT;
  }
}

class OrderCanceledEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    this.type = OrderEvent.CANCELED_EVENT;
  }
}

module.exports = {
  Order, OrderPlacedEvent, OrderQuantityUpdatedEvent, OrderLimitUpdatedEvent, OrderCanceledEvent,
};
