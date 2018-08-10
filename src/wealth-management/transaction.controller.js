const { logger } = global;

exports.transactions = async (ctx) => {
  logger.info(`transaction.controller.js transactions(): retrieves transactions of ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
};

exports.balance = async (ctx) => {
  logger.info(`transaction.controller.js balance(): retrieves balance of ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
};

exports.available = async (ctx) => {
  logger.info(`transaction.controller.js available(): retrieves amount available for trading of ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
};

exports.deposit = async (ctx) => {
  logger.info(`transaction.controller.js deposit(): deposit for ${ctx.params.currency} account of userId=${ctx.state.user._id.toString()}`);
};
