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
   * returns symbol string of the currency pair. e.g. 'BTC_USDT'
   */
  symbol() {
    return `${this.currency}_${this.baseCurrency}`;
  }

  /**
   * return number of units that remain unfilled.
   * @returns {number}
   */
  remainingQuantity() { return this.quantity - this.filledQuantity; }
}

class OrderEvent {
  constructor(orderFromModel) {
    this._order = orderFromModel;
    this._type = undefined;
  }
  get order() { return this._order; }
  get type() { return this._type; }

  static get LIMIT_PLACED_EVENT() { return 'OrderPlacedEvent'; }
  static get MARKET_PLACED_EVENT() { return 'MarketOrderPlacedEvent'; }
  static get QUANTITY_UPDATED_EVENT() { return 'OrderQuantityUpdatedEvent'; }
  static get LIMIT_UPDATED_EVENT() { return 'OrderLimitUpdatedEvent'; }
  static get CANCELED_EVENT() { return 'OrderCanceledEvent'; }
}

class OrderPlacedEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    super._type = OrderEvent.LIMIT_PLACED_EVENT;
  }
}

class OrderUpdatedEvent extends OrderEvent {
  constructor(orderFromModel, oldQuantity, oldPrice) {
    super(orderFromModel);
    this.oldQuantity = oldQuantity;
    this.oldPrice = oldPrice;
  }
}

class MarketOrderPlacedEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    super._type = OrderEvent.MARKET_PLACED_EVENT;
  }
}

class OrderQuantityUpdatedEvent extends OrderUpdatedEvent {
  constructor(orderFromModel, oldQuantity, oldPrice) {
    super(orderFromModel, oldQuantity, oldPrice);
    super._type = OrderEvent.QUANTITY_UPDATED_EVENT;
  }
}

class OrderLimitUpdatedEvent extends OrderUpdatedEvent {
  constructor(orderFromModel, oldQuantity, oldPrice) {
    super(orderFromModel, oldQuantity, oldPrice);
    super._type = OrderEvent.LIMIT_UPDATED_EVENT;
  }
}

class OrderCanceledEvent extends OrderEvent {
  constructor(orderFromModel) {
    super(orderFromModel);
    super._type = OrderEvent.CANCELED_EVENT;
  }
}

module.exports = {
  Order,
  OrderEvent,
  OrderPlacedEvent,
  MarketOrderPlacedEvent,
  OrderQuantityUpdatedEvent,
  OrderLimitUpdatedEvent,
  OrderCanceledEvent,
};
