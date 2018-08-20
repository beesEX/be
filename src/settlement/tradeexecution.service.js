const config = require('../config');
const {logger} = global;

const {REASON_OBJECT_TYPE, ORDER_BOOK_EVENT} = require('../trading-engine/orderbook.event');

const Transaction = require('../wealth-management/transaction.service');
const OrderService = require('../resources/order/order.service');

module.exports = {
  executeTrades: async (orderbookEvent) => {
    logger.info(`tradeexecution.service.js executeTrades(): received orderbookEvent = ${JSON.stringify(orderbookEvent)}`);

    if (!orderbookEvent || !orderbookEvent.reason || orderbookEvent.type !== ORDER_BOOK_EVENT) {
      logger.info(`tradeexecution.service.js executeTrades(): ERROR: unexpected type`);
      return false;
    }

    const reasonObj = orderbookEvent.reason;
    const matchList = orderbookEvent.matches;
    const isReasonObjFilledCompletely = orderbookEvent.filledCompletely;

    for (let i = 0; i < matchList.length; i += 1) {
      const status = await OrderService.updateOrdersbyMatch(reasonObj, matchList[i], i === matchList.length - 1 && isReasonObjFilledCompletely);
      if (!status) {
        logger.error(`tradeexecution.service.js executeTrades(): ----- ERROR: ------ RACE CONDITION ------`);
      }
      else {
        const tradePrice = matchList[i].price;
        const tradeQuantity = matchList[i].tradedQuantity

        // call transaction service
        if (reasonObj.side === 'BUY') {
          // release quote currency of reason user
          await Transaction.release(reasonObj.userId, reasonObj.currency, tradeQuantity * tradePrice);
          // decrease quote currency of reason user
          await Transaction.sell(reasonObj.userId, reasonObj.currency, tradeQuantity * tradePrice, reasonObj.orderId);
          // increase base currency of reason user
          await Transaction.buy(reasonObj.userId, reasonObj.baseCurrency, tradeQuantity, reasonObj.orderId);

          // release base currency of match user
          await Transaction.release(matchList[i].userId, matchList[i].baseCurrency, tradeQuantity);
          // decrease base base currency of match user
          await Transaction.sell(matchList[i].userId, matchList[i].baseCurrency, tradeQuantity, matchList[i].orderId);
          // increase quote currency of match user
          await Transaction.buy(matchList[i].userId, matchList[i].currency, tradeQuantity * tradePrice, matchList[i].orderId);
        }
        else {
          // release base currency of reason user
          await Transaction.release(reasonObj.userId, reasonObj.baseCurrency, tradeQuantity);
          // decrease base base currency of reason user
          await Transaction.sell(reasonObj.userId, reasonObj.baseCurrency, tradeQuantity, reasonObj.orderId);
          // increase quote currency of reason user
          await Transaction.buy(reasonObj.userId,reasonObj.currency, tradeQuantity, reasonObj.orderId);

          // release quote currency of match user
          await Transaction.release(matchList[i].userId, matchList[i].currency, tradeQuantity * tradePrice);
          // decrease quote currency of match user
          await Transaction.sell(matchList[i].userId, matchList[i].currency, tradeQuantity * tradePrice, matchList[i].orderId);
          // increase base currency of match user
          await Transaction.buy(matchList[i].userId, matchList[i].baseCurrency, tradeQuantity, matchList[i].orderId);
        }
      }
    }

    if (reasonObj.type === REASON_OBJECT_TYPE.CANCELED) {
      if (reasonObj.quantity > reasonObj.filledQuantity ) {
        await Transaction.release(reasonObj.userId, reasonObj.baseCurrency, reasonObj.quantity - reasonObj.filledQuantity);
      }
      else if (reasonObj.quantity < reasonObj.filledQuantity) {
        logger.error(`tradeexecution.service.js executeTrades(): ERROR: reasonObj.quantity = ${reasonObj.quantity} < reasonObj.filledQuantity = ${reasonObj.filledQuantity}`);
        return false;
      }
      else {
        logger.info(`tradeexecution.service.js executeTrades(): reasonObj.quantity = reasonObj.filledQuantity = ${reasonObj.filledQuantity}`);
      }
    }
    else if (reasonObj.type === REASON_OBJECT_TYPE.UPDATED) {
      if (reasonObj.quantity !== reasonObj.oldQuantity) {
        // update quantity
        if (reasonObj.quantity > reasonObj.filledQuantity) {
          if (reasonObj.quantity > reasonObj.oldQuantity) {
            await Transaction.lock(reasonObj.userId, reasonObj.baseCurrency, reasonObj.quantity - reasonObj.oldQuantity);
          }
          else {
            await Transaction.release(reasonObj.userId, reasonObj.baseCurrency, reasonObj.oldQuantity - reasonObj.quantity);
          }
        }
        else if (reasonObj.quantity < reasonObj.filledQuantity) {
          logger.error(`tradeexecution.service.js executeTrades(): ERROR: reasonObj.quantity = ${reasonObj.quantity} < reasonObj.filledQuantity = ${reasonObj.filledQuantity}`);
          return false;
        }
        else {
          logger.info(`tradeexecution.service.js executeTrades(): reasonObj.quantity = reasonObj.filledQuantity = ${reasonObj.filledQuantity}`);
        }
      }
    }
    return true;
  },

};
