const config = require('../config');
const {logger} = global;

const {REASON_OBJECT_TYPE, ORDER_BOOK_EVENT} = require('../trading-engine/orderbook.event');

const Transaction = require('../wealth-management/transaction.service');
const OrderService = require('../resources/order/order.service');

module.exports = {
  executeTrades: async (orderbookEvent) => {
    /*
    This function does all needed settlement operations to actually execute the trade,
    like debit or credit participating accounts (calling buy(), sell() of transaction service )
    and realease locked fund (release() of transaction service) for
    the tradedQuantity - by calling transaction service
    and update the orders in DB accordingly - by calling order service.

    It also needs to use order service to update participating orders of each match,


    * */

    orderbookEvent = JSON.parse(orderbookEvent);

    logger.info(`tradeexecution.service.js executeTrades(): received orderbookEvent = ${JSON.stringify(orderbookEvent)}`);

    if (!orderbookEvent || !orderbookEvent.reason || orderbookEvent.type !== ORDER_BOOK_EVENT) {
      logger.info(`tradeexecution.service.js executeTrades(): ERROR: unexpected type`);
      return false;
    }

    const reasonObj = orderbookEvent.reason;
    const matchList = orderbookEvent.matches;
    const isReasonObjFilledCompletely = orderbookEvent.filledCompletely;

    if (orderbookEvent.reason.type === REASON_OBJECT_TYPE.CANCELED) {
      // need user Id in each match object and reason object
      //await Transaction.release()
    }

    for (let i = 0; i < matchList.length; i += 1) {
      const status = await OrderService.updateOrdersbyMatch(reasonObj, matchList[i], i === matchList.length - 1 && isReasonObjFilledCompletely);
      if (!status) {
        logger.error(`tradeexecution.service.js executeTrades(): ----- ERROR: ------ RACE CONDITION ------`);
      }
      else {
        // call transaction service

      }
    }
    return true;

  },

};
