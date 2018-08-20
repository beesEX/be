const config = require('../config');
const {logger} = global;

const {REASON_OBJECT_TYPE, ORDER_BOOK_EVENT} = require('../trading-engine/orderbook.event');

const Transaction = require('../wealth-management/transaction.service');
const OrderService = require('../resources/order/order.service');

module.exports = {
  executeTrades: async (orderbookEvent) => {
    logger.info(`tradeexecution.service.js executeTrades(): received orderbookEvent = ${JSON.stringify(orderbookEvent)}`);

    if (!orderbookEvent || !orderbookEvent.reason || orderbookEvent.type !== ORDER_BOOK_EVENT) {
      logger.info('tradeexecution.service.js executeTrades(): ERROR: unexpected type');
      return false;
    }

    const reasonObj = orderbookEvent.reason;
    const matchList = orderbookEvent.matches;
    const isReasonObjFilledCompletely = orderbookEvent.filledCompletely;

    for (let i = 0; i < matchList.length; i += 1) { // wait for all async calls in each for-iteration with await Promise.all([array-of-Promise-to-wait]), these async calls do not need to wait for each other in sequence like you do, they can be executed in parallel, we just want to wait for all of them coming back at the end.
      const status = await OrderService.updateOrdersbyMatch(reasonObj, matchList[i], i === matchList.length - 1 && isReasonObjFilledCompletely); // [Tung]: change API of updateOrdersByMatch as commented, the last boolean expression is very odd, i needed 30sec to understand what you want to express with it :-), isReasonObjFilledCompletely is intended to be used in UI
      if (!status) {
        logger.error('tradeexecution.service.js executeTrades(): ----- ERROR: ------ RACE CONDITION ------');
      }
      else {
        const tradePrice = matchList[i].price; // [Tung]: const tradedPrice
        const tradeQuantity = matchList[i].tradedQuantity; // [Tung]: const tradedQuantity
        // const tradedAmount = tradedQuantity * tradedPrice; // and use it below, instead recalculating it again and again
        // call transaction service
        if (reasonObj.side === 'BUY') {
          // release quote currency of reason user
          await Transaction.release(reasonObj.userId, reasonObj.currency, tradeQuantity * tradePrice); // [Tung]: for BUY order, release the baseCurrency, take a look at placeOrder() in order service to know how fund has been locked
          // decrease quote currency of reason user
          await Transaction.sell(reasonObj.userId, reasonObj.currency, tradeQuantity * tradePrice, reasonObj.orderId); // [Tung]: for BUY order, sell the baseCurrency, baseCurrency is what you used to place the BUY order.
          // increase base currency of reason user
          await Transaction.buy(reasonObj.userId, reasonObj.baseCurrency, tradeQuantity, reasonObj.orderId); // [Tung]: for BUY order, buy the currency, currency is what you want to buy with the BUY order

          // release base currency of match user
          await Transaction.release(matchList[i].userId, reasonObj.baseCurrency, tradeQuantity); // [Tung]: for SELL order, release currency, take a look at placeOrder() in order service to know how fund has been locked
          // decrease base base currency of match user
          await Transaction.sell(matchList[i].userId, reasonObj.baseCurrency, tradeQuantity, matchList[i].orderId); // [Tung]: for SELL order, sell the currency, currency is what you used to place the SELL order.
          // increase quote currency of match user
          await Transaction.buy(matchList[i].userId, reasonObj.currency, tradeQuantity * tradePrice, matchList[i].orderId); // [Tung]: for SELL order, buy the baseCurrency, baseCurrency is what you want to receive with the SELL order
        }
        else {
          // release base currency of reason user
          await Transaction.release(reasonObj.userId, reasonObj.baseCurrency, tradeQuantity);
          // decrease base base currency of reason user
          await Transaction.sell(reasonObj.userId, reasonObj.baseCurrency, tradeQuantity, reasonObj.orderId);
          // increase quote currency of reason user
          await Transaction.buy(reasonObj.userId,reasonObj.currency, tradeQuantity, reasonObj.orderId);

          // release quote currency of match user
          await Transaction.release(matchList[i].userId, reasonObj.currency, tradeQuantity * tradePrice);
          // decrease quote currency of match user
          await Transaction.sell(matchList[i].userId, reasonObj.currency, tradeQuantity * tradePrice, matchList[i].orderId);
          // increase base currency of match user
          await Transaction.buy(matchList[i].userId, reasonObj.baseCurrency, tradeQuantity, matchList[i].orderId);
        }
      }
    }

    if (reasonObj.type === REASON_OBJECT_TYPE.CANCELED) { // [Tung]: logic in this if-block does not belong here, it belongs to cancelOrder() in order service, but just remove, i will do it in my task
      if (reasonObj.quantity > reasonObj.filledQuantity) {
        await Transaction.release(reasonObj.userId, reasonObj.baseCurrency, reasonObj.quantity - reasonObj.filledQuantity);
      }
      else if (reasonObj.quantity < reasonObj.filledQuantity) {
        logger.error(`tradeexecution.service.js executeTrades(): ERROR: reasonObj.quantity = ${reasonObj.quantity} < reasonObj.filledQuantity = ${reasonObj.filledQuantity}`);
        return false;
      }
    }
    else if (reasonObj.type === REASON_OBJECT_TYPE.UPDATED) { // [Tung]: logic in this elseif-block does not belong here, it belongs to updateOrderByUser() in order service, but just remove, i will do it in my task
      if (reasonObj.quantity !== reasonObj.oldQuantity) {
        // update quantity
        if (reasonObj.quantity >= reasonObj.filledQuantity) {
          if (reasonObj.quantity > reasonObj.oldQuantity) {
            await Transaction.lock(reasonObj.userId, reasonObj.baseCurrency, reasonObj.quantity - reasonObj.oldQuantity);
          }
          else if (reasonObj.quantity < reasonObj.oldQuantity) {
            await Transaction.release(reasonObj.userId, reasonObj.baseCurrency, reasonObj.oldQuantity - reasonObj.quantity);
          }
        }
        else {
          logger.error(`tradeexecution.service.js executeTrades(): ERROR: reasonObj.quantity = ${reasonObj.quantity} < reasonObj.filledQuantity = ${reasonObj.filledQuantity}`);
          return false;
        }
      }
    }
    return true; // [Tung]: no log message signaling trade execution of order book event was successful?
  },

};
