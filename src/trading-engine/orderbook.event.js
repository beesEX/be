const logger = require('../logger');

const {OrderEvent} = require('../resources/order/order.models');

const ORDER_BOOK_READY_EVENT = 'ORDER_BOOK_READY_EVENT';
const GET_AGGREGATED_STATE_EVENT = 'GET_AGGREGATED_STATE';
const GET_ORDERBOOK_STATE_EVENT = 'GET_ORDERBOOK_STATE';
const ORDER_BOOK_EVENT = 'ORDER_BOOK_EVENT';
// TODO: new event to get ohlcv data

const REASON_OBJECT_TYPE = {
  PLACED: 'PLACED',
  UPDATED: 'UPDATED',
  CANCELED: 'CANCELED'
};

module.exports = {

  ORDER_BOOK_READY_EVENT,
  GET_AGGREGATED_STATE_EVENT,
  GET_ORDERBOOK_STATE_EVENT,
  ORDER_BOOK_EVENT,

  REASON_OBJECT_TYPE,

  createNewMatchObject: (order, tradedQuantity, isFilledCompletely) => {
    return {
      orderId: order._id.toString(),
      userId: order.userId,
      price: order.limitPrice,
      quantity: order.quantity,
      tradedQuantity,
      filledCompletely: isFilledCompletely,
      matchedAt: new Date()
    };
  },

  createNewReasonObject: (originalOrderEvent) => {
    const orderEvent = originalOrderEvent;

    if (orderEvent._type === OrderEvent.LIMIT_PLACED_EVENT || orderEvent._type === OrderEvent.MARKET_PLACED_EVENT) {
      return {
        type: REASON_OBJECT_TYPE.PLACED,
        orderId: orderEvent._order._id,
        userId: orderEvent._order.userId,
        side: orderEvent._order.side,
        currency: orderEvent._order.currency,
        baseCurrency: orderEvent._order.baseCurrency,
        price: (orderEvent._type === OrderEvent.MARKET_PLACED_EVENT) ? null : orderEvent._order.limitPrice,
        quantity: orderEvent._order.quantity
      };
    }
    else if (orderEvent._type === OrderEvent.CANCELED_EVENT) {
      return {
        type: REASON_OBJECT_TYPE.CANCELED,
        orderId: orderEvent._order._id,
        userId: orderEvent._order.userId,
        side: orderEvent._order.side,
        currency: orderEvent._order.currency,
        baseCurrency: orderEvent._order.baseCurrency,
        price: orderEvent._order.limitPrice,
        quantity: orderEvent._order.quantity,
        filledQuantity: orderEvent._order.filledQuantity
      };
    }
    else if (orderEvent._type === OrderEvent.QUANTITY_UPDATED_EVENT || orderEvent._type === OrderEvent.LIMIT_UPDATED_EVENT) {
      return {
        type: REASON_OBJECT_TYPE.UPDATED,
        orderId: orderEvent._order._id,
        userId: orderEvent._order.userId,
        side: orderEvent._order.side,
        currency: orderEvent._order.currency,
        baseCurrency: orderEvent._order.baseCurrency,
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

  createNewOrderbookEvent: (symbol, reason, matchingEvent, ohlcvData, isFilledCompletely) => {
    return {
      type: ORDER_BOOK_EVENT,
      symbol,
      reason,
      ohlcvData,
      matches: matchingEvent || [],
      filledCompletely: isFilledCompletely || false,
      timestamp: new Date()
    };
  },

};
