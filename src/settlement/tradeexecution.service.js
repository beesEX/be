const {logger} = global;

const Transaction = require('../wealth-management/transaction.service');

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
  },
};
