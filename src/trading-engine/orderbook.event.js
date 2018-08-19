const {createConsoleLogger} = require('@paralect/common-logger');
const config = require('../config');

global.logger = createConsoleLogger({isDev: config.isDev});
const {logger} = global;

const {OrderEvent} = require('../resources/order/order.models');

const EVENT_GET_AGGREGATED_STATE = 'GET_AGGREGATED_STATE';
const EVENT_GET_ORDERBOOK_STATE = 'GET_ORDERBOOK_STATE';
const ORDER_BOOK_EVENT = 'ORDER_BOOK_EVENT';
const EVENT_GET_ORDERBOOK_EVENT = 'EVENT_GET_ORDERBOOK_EVENT';

const REASON_OBJECT_TYPE = {
  PLACED: 'PLACED',
  UPDATED: 'UPDATED',
  CANCELED: 'CANCELED'
};

module.exports = {

  EVENT_GET_AGGREGATED_STATE,
  EVENT_GET_ORDERBOOK_STATE,
  EVENT_GET_ORDERBOOK_EVENT,
  ORDER_BOOK_EVENT,

  REASON_OBJECT_TYPE,

  createNewMatchObject: (order, tradedQuantity, isFilledCompletely) => {
    return {
      orderId: order._id,
      price: order.limitPrice,
      quantity: order.quantity,
      tradedQuantity,
      filledCompletely: isFilledCompletely
    };
  },

  createNewReasonObject: (originalOrderEvent) => {
    const orderEvent = originalOrderEvent;

    if (orderEvent._type === OrderEvent.LIMIT_PLACED_EVENT || orderEvent._type === OrderEvent.MARKET_PLACED_EVENT) {
      return {
        type: REASON_OBJECT_TYPE.PLACED,
        orderId: orderEvent._order._id,
        side: orderEvent._order.side,
        price: (orderEvent._type === OrderEvent.MARKET_PLACED_EVENT) ? null : orderEvent._order.limitPrice,
        quantity: orderEvent._order.quantity
      };
    }
    else if (orderEvent._type === OrderEvent.CANCELED_EVENT) {
      return {
        type: REASON_OBJECT_TYPE.CANCELED,
        orderId: orderEvent._order._id,
        side: orderEvent._order.side,
        price: orderEvent._order.limitPrice,
        quantity: orderEvent._order.quantity,
        filledQuantity: orderEvent._order.filledQuantity
      };
    }
    else if (orderEvent._type === OrderEvent.QUANTITY_UPDATED_EVENT || orderEvent._type === OrderEvent.LIMIT_UPDATED_EVENT) {
      return {
        type: REASON_OBJECT_TYPE.UPDATED,
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

  createNewOrderbookEvent: (symbol, reason, matchingEvent, isFilledCompletely) => {
    return {
      type: ORDER_BOOK_EVENT,
      symbol,
      reason,
      matches: matchingEvent || [],
      filledCompletely: isFilledCompletely || false,
      timestamp: new Date()
    };
  },

};
