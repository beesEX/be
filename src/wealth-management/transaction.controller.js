const txService = require('./transaction.service');

const { logger } = global;

// GET /finance/status/:currency
exports.status = async (ctx) => {
  const userId = ctx.state.user._id.toString();
  const { currency } = ctx.params;

  logger.info(`transaction.controller.js status(): retrieves finance status of ${currency} account of userId=${userId}`);

  const txPromise = txService.getTransactions(userId, currency);
  const balancePromise = txService.getBalance(userId, currency);
  const availablePromise = txService.getAvailableBalance(userId, currency);
  const [txList, balance, available] = await Promise.all([txPromise, balancePromise, availablePromise]);

  ctx.body = { balance, available, txList };
};

// GET /finance/transactions/:currency
exports.transactions = async (ctx) => {
  logger.info(`transaction.controller.js transactions(): retrieves transactions of ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
  ctx.body = await txService.getTransactions(ctx.state.user._id.toString(), ctx.params.currency);
};

// GET /finance/balance/:currency
exports.balance = async (ctx) => {
  logger.info(`transaction.controller.js balance(): retrieves balance of ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
  ctx.body = await txService.getBalance(ctx.state.user._id.toString(), ctx.params.currency);
};

// GET /finance/available/:currency
exports.available = async (ctx) => {
  logger.info(`transaction.controller.js available(): retrieves amount available for trading of ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
  ctx.body = await txService.getAvailableBalance(ctx.state.user._id.toString(), ctx.params.currency);
};
// POST /finance/deposit/:currency
exports.deposit = async (ctx) => {
  logger.info(`transaction.controller.js deposit(): deposit for ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);

  const userId = ctx.state.user._id.toString();
  const { currency, amount } = ctx.request.body;
  const wallet = 'some test wallet address';

  ctx.body = await txService.deposit(userId, currency, amount, wallet);
};
