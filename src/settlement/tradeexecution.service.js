const logger = require('../logger');

const { idGenerator } = require('@paralect/node-mongo');

const {ORDER_BOOK_EVENT} = require('../trading-engine/orderbook.event');

const Transaction = require('../wealth-management/transaction.service');
const OrderService = require('../resources/order/order.service');
const tradeService = require('./trade.service');

const settlementTrade = async (reasonObj, matchObj) => {
  const { currency, baseCurrency } = reasonObj;
  const { price: tradedPrice, tradedQuantity } = matchObj;
  const tradedAmount = tradedQuantity * tradedPrice;

  if (reasonObj.side === 'BUY') {
    // release base currency of reason user
    await Transaction.releaseByTrade(reasonObj.userId, baseCurrency, tradedAmount, reasonObj.orderId);
    // decrease base currency of reason user
    await Transaction.sell(reasonObj.userId, baseCurrency, tradedAmount, reasonObj.orderId);
    // increase quote currency of reason user
    await Transaction.buy(reasonObj.userId, currency, tradedQuantity, reasonObj.orderId);

    // release quote currency of match user
    await Transaction.releaseByTrade(matchObj.userId, currency, tradedQuantity, matchObj.orderId);
    // decrease quote base currency of match user
    await Transaction.sell(matchObj.userId, currency, tradedQuantity, matchObj.orderId);
    // increase base currency of match user
    await Transaction.buy(matchObj.userId, baseCurrency, tradedAmount, matchObj.orderId);
  }
  else {
    // release quote currency of reason user
    await Transaction.releaseByTrade(reasonObj.userId, currency, tradedQuantity, reasonObj.orderId);
    // decrease quote base currency of reason user
    await Transaction.sell(reasonObj.userId, currency, tradedQuantity, reasonObj.orderId);
    // increase base currency of reason user
    await Transaction.buy(reasonObj.userId, baseCurrency, tradedAmount, reasonObj.orderId);

    // release base currency of match user
    await Transaction.releaseByTrade(matchObj.userId, baseCurrency, tradedAmount, matchObj.orderId);
    // decrease base currency of match user
    await Transaction.sell(matchObj.userId, baseCurrency, tradedAmount, matchObj.orderId);
    // increase quote currency of match user
    await Transaction.buy(matchObj.userId, currency, tradedQuantity, matchObj.orderId);
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

  for (let i = 0; i < matchList.length; i += 1) {

    await settlementTrade(reasonObj, matchList[i]);
    await OrderService.updateOrdersByMatch(reasonObj, matchList[i]);

    // trade object to record to DB
    const tradeObject = {
      _id: idGenerator.generate(),
      currency: reasonObj.currency,
      baseCurrency: reasonObj.baseCurrency,
      price: matchList[i].price,
      quantity: matchList[i].tradedQuantity,
      makerSide: (reasonObj.side === 'BUY') ? 'SELL' : 'BUY',
      buyerFeePercent: 0,
      buyerFeeCharged: 0,
      sellerFeePercent: 0,
      sellerFeeCharged: 0,
      createdAt: new Date(),
      executedAt: new Date(),
      matchedAt: matchList[i].matchedAt,
      buyOrderId: (reasonObj.side === 'BUY') ? reasonObj.orderId : matchList[i].orderId,
      sellOrderId: (reasonObj.side === 'BUY') ? matchList[i].orderId : reasonObj.orderId
    };

    tradeService.recordTrade(tradeObject);
  }

  logger.info('tradeexecution.service.js executeTrades(): Successfully traded');

  return true;
};

module.exports = {
  executeTrades,
};
