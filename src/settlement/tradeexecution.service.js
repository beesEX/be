const {logger} = global;

const {ORDER_BOOK_EVENT} = require('../trading-engine/orderbook.event');

const Transaction = require('../wealth-management/transaction.service');
const OrderService = require('../resources/order/order.service');

const settlementTrade = async (reasonObj, matchObj) => {
  const { currency, baseCurrency } = reasonObj;
  const { price: tradedPrice, tradedQuantity } = matchObj;
  const tradedAmount = tradedQuantity * tradedPrice;

  const transactionProcesses = [];

  if (reasonObj.side === 'BUY') {
    // release quote currency of reason user
    transactionProcesses.push(Transaction.releaseByTrade(reasonObj.userId, baseCurrency, tradedAmount, reasonObj.orderId));
    // decrease quote currency of reason user
    transactionProcesses.push(Transaction.sell(reasonObj.userId, baseCurrency, tradedAmount, reasonObj.orderId));
    // increase base currency of reason user
    transactionProcesses.push(Transaction.buy(reasonObj.userId, currency, tradedQuantity, reasonObj.orderId));

    // release base currency of match user
    transactionProcesses.push(Transaction.releaseByTrade(matchObj.userId, currency, tradedQuantity, matchObj.orderId));
    // decrease base base currency of match user
    transactionProcesses.push(Transaction.sell(matchObj.userId, currency, tradedQuantity, matchObj.orderId));
    // increase quote currency of match user
    transactionProcesses.push(Transaction.buy(matchObj.userId, baseCurrency, tradedAmount, matchObj.orderId));
  }
  else {
    // release base currency of reason user
    transactionProcesses.push(Transaction.releaseByTrade(reasonObj.userId, currency, tradedQuantity, reasonObj.orderId));
    // decrease base base currency of reason user
    transactionProcesses.push(Transaction.sell(reasonObj.userId, currency, tradedQuantity, reasonObj.orderId));
    // increase quote currency of reason user
    transactionProcesses.push(Transaction.buy(reasonObj.userId, baseCurrency, tradedQuantity, reasonObj.orderId));

    // release quote currency of match user
    transactionProcesses.push(Transaction.releaseByTrade(matchObj.userId, baseCurrency, tradedAmount, matchObj.orderId));
    // decrease quote currency of match user
    transactionProcesses.push(Transaction.sell(matchObj.userId, baseCurrency, tradedAmount, matchObj.orderId));
    // increase base currency of match user
    transactionProcesses.push(Transaction.buy(matchObj.userId, currency, tradedQuantity, matchObj.orderId));
  }

  return Promise.all(transactionProcesses);
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
