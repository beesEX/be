const {createConsoleLogger} = require('@paralect/common-logger');
const config = require('../config');
global.logger = createConsoleLogger({isDev: config.isDev});
const {logger} = global;

const {OrderEvent} = require('../resources/order/order.models');

const ZERO = 0.0000000000001;

const REASON_OBJECT_TYPE = {
  PLACED: 'PLACED',
  UPDATED: 'UPDATED',
  CANCELED: 'CANCELED'
};

module.exports = {

  REASON_OBJECT_TYPE,

  createNewMatchObject : function (order, tradedQuantity) {
    return {
      orderId: order._id,
      price: order.limitPrice,
      tradedQuantity: tradedQuantity,
      filledCompletely: order.remainingQuantity() <= ZERO
    };
  },
  
  createNewReasonObject : function (originalOrderEvent) {
    const orderEvent = JSON.parse(JSON.stringify(originalOrderEvent));

    if (orderEvent._type === OrderEvent.LIMIT_PLACED_EVENT || orderEvent._type === OrderEvent.MARKET_PLACED_EVENT) {
      return {
        type: 'PLACED',
        orderId: orderEvent._order._id,
        side: orderEvent._order.side,
        price: (orderEvent._type === OrderEvent.MARKET_PLACED_EVENT) ? null : orderEvent._order.limitPrice,
        quantity: orderEvent._order.quantity
      };
    }
    else if (orderEvent._type === OrderEvent.CANCELED_EVENT) {
      return {
        type: 'CANCELED',
        orderId: orderEvent._order._id,
        side: orderEvent._order.side,
        price: orderEvent._order.limitPrice,
        quantity: orderEvent._order.quantity,
        filledQuantity: orderEvent._order.filledQuantity
      };
    }
    else if (orderEvent._type === OrderEvent.QUANTITY_UPDATED_EVENT || orderEvent._type === OrderEvent.LIMIT_UPDATED_EVENT) {
      return {
        type: 'UPDATED',
        orderId: orderEvent._order._id,
        side: orderEvent._order.side,
        price: orderEvent._order.limitPrice,
        oldPrice: orderEvent.oldPrice,
        quantity: orderEvent._order.quantity,
        oldQuantity: orderEvent.oldQuantity,
        filledQuantity: orderEvent._order.filledQuantity
      };
    }

    logger.error('orderbook.event.js createNewReasonObject(): ERROR: unknown event type');
    return null;
  },
  
  createNewOrderbookEvent: function (symbol, reason, matchingEvent, isFilledCompletely) {
    return {
      type: 'ORDER_BOOK_EVENT',
      symbol: symbol,
      reason: reason,
      matches: matchingEvent || [],
      filledCompletely: isFilledCompletely || false,
      timestamp: new Date()
    };
  },

};