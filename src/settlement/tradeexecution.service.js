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
    await Transaction.releaseByTrade(reasonObj.userId, reasonObj.currency, tradedAmount, reasonObj.orderId); // [Tung]: for BUY order, release the baseCurrency, take a look at placeOrder() in order service to know how fund has been locked
    // decrease quote currency of reason user
    await Transaction.sell(reasonObj.userId, reasonObj.currency, tradedAmount, reasonObj.orderId); // [Tung]: for BUY order, sell the baseCurrency, baseCurrency is what you used to place the BUY order.
    // increase base currency of reason user
    await Transaction.buy(reasonObj.userId, reasonObj.baseCurrency, tradedQuantity, reasonObj.orderId); // [Tung]: for BUY order, buy the currency, currency is what you want to buy with the BUY order

    // release base currency of match user
    await Transaction.releaseByTrade(matchObj.userId, reasonObj.baseCurrency, tradedQuantity, matchObj.orderId); // [Tung]: for SELL order, release currency, take a look at placeOrder() in order service to know how fund has been locked
    // decrease base base currency of match user
    await Transaction.sell(matchObj.userId, reasonObj.baseCurrency, tradedQuantity, matchObj.orderId); // [Tung]: for SELL order, sell the currency, currency is what you used to place the SELL order.
    // increase quote currency of match user
    await Transaction.buy(matchObj.userId, reasonObj.currency, tradedAmount, matchObj.orderId); // [Tung]: for SELL order, buy the baseCurrency, baseCurrency is what you want to receive with the SELL order
  }
  else {
    // release base currency of reason user
    await Transaction.releaseByTrade(reasonObj.userId, reasonObj.baseCurrency, tradedQuantity, reasonObj.orderId);
    // decrease base base currency of reason user
    await Transaction.sell(reasonObj.userId, reasonObj.baseCurrency, tradedQuantity, reasonObj.orderId);
    // increase quote currency of reason user
    await Transaction.buy(reasonObj.userId,reasonObj.currency, tradedQuantity, reasonObj.orderId);

    // release quote currency of match user
    await Transaction.releaseByTrade(matchObj.userId, reasonObj.currency, tradedAmount, matchObj.orderId);
    // decrease quote currency of match user
    await Transaction.sell(matchObj.userId, reasonObj.currency, tradedAmount, matchObj.orderId);
    // increase base currency of match user
    await Transaction.buy(matchObj.userId, reasonObj.baseCurrency, tradedQuantity, matchObj.orderId);
  }
};

const executeTrades = async (orderbookEvent) => {
  logger.info(`tradeexecution.service.js executeTrades(): received orderbookEvent = ${JSON.stringify(orderbookEvent)}`);

  if (!orderbookEvent || !orderbookEvent.reason || orderbookEvent.type !== ORDER_BOOK_EVENT) {
    logger.error('tradeexecution.service.js executeTrades(): ERROR: unexpected type');
    return false; // [Tung]: throw an Error obj instead of returning false, mix of return types (Object in success case, false if failed) is a bad practice in error handling, because the caller could not handle the returned value consistently, does false represent a regular answer or something has failed? Therefor always throw an error for exception cases!
  } // [Tung]: you can code error handling logic in low level components such as ordermap etc. like you want, but at least at higher level components (service, controller) the above error handling rule should be followed!

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
