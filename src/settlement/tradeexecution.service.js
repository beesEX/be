const config = require('../config');
const {logger} = global;

const {REASON_OBJECT_TYPE, ORDER_BOOK_EVENT} = require('../trading-engine/orderbook.event');

const Transaction = require('../wealth-management/transaction.service');
const OrderService = require('../resources/order/order.service');

const settlementTrade = async (reasonObj, matchObj) => {
  const tradedPrice = matchObj.price;
  const { tradedQuantity } = matchObj;
  const tradedAmount = tradedQuantity * tradedPrice;

  if (reasonObj.side === 'BUY') {
    // release quote currency of reason user
    await Transaction.releaseByTrade(reasonObj.userId, reasonObj.baseCurrency, tradedAmount, reasonObj.orderId);
    // decrease quote currency of reason user
    await Transaction.sell(reasonObj.userId, reasonObj.baseCurrency, tradedAmount, reasonObj.orderId);
    // increase base currency of reason user
    await Transaction.buy(reasonObj.userId, reasonObj.currency, tradedQuantity, reasonObj.orderId);

    // release base currency of match user
    await Transaction.releaseByTrade(matchObj.userId, reasonObj.currency, tradedQuantity, matchObj.orderId);
    // decrease base base currency of match user
    await Transaction.sell(matchObj.userId, reasonObj.currency, tradedQuantity, matchObj.orderId);
    // increase quote currency of match user
    await Transaction.buy(matchObj.userId, reasonObj.baseCurrency, tradedAmount, matchObj.orderId);
  }
  else {
    // release base currency of reason user
    await Transaction.releaseByTrade(reasonObj.userId, reasonObj.currency, tradedQuantity, reasonObj.orderId);
    // decrease base base currency of reason user
    await Transaction.sell(reasonObj.userId, reasonObj.currency, tradedQuantity, reasonObj.orderId);
    // increase quote currency of reason user
    await Transaction.buy(reasonObj.userId,reasonObj.baseCurrency, tradedQuantity, reasonObj.orderId);

    // release quote currency of match user
    await Transaction.releaseByTrade(matchObj.userId, reasonObj.baseCurrency, tradedAmount, matchObj.orderId);
    // decrease quote currency of match user
    await Transaction.sell(matchObj.userId, reasonObj.baseCurrency, tradedAmount, matchObj.orderId);
    // increase base currency of match user
    await Transaction.buy(matchObj.userId, reasonObj.currency, tradedQuantity, matchObj.orderId);
  }
};

const executeTrades = async (orderbookEvent) => {
  logger.info(`tradeexecution.service.js executeTrades(): received orderbookEvent = ${JSON.stringify(orderbookEvent)}`);

  if (!orderbookEvent || !orderbookEvent.reason || orderbookEvent.type !== ORDER_BOOK_EVENT) {
    logger.error('tradeexecution.service.js executeTrades(): ERROR: unexpected type');
    throw new Error('Unexpected type of orderbookEvent');
  }

  const reasonObj = orderbookEvent.reason;
  const matchList = orderbookEvent.matches;

  const updateOrdersByMatchPromises = [];

  for (let i = 0; i < matchList.length; i += 1) {
    updateOrdersByMatchPromises.push(OrderService.updateOrdersByMatch(reasonObj, matchList[i]));
    updateOrdersByMatchPromises.push(settlementTrade(reasonObj, matchList[i]));
  }
  await Promise.all(updateOrdersByMatchPromises).catch((err) => { throw err; });

  logger.info('tradeexecution.service.js executeTrades(): Successfully traded');
  return true;
};

module.exports = {
  executeTrades,
};
