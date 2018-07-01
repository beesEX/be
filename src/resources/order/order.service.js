const db = require('db');
const schema = require('./order.schema');
const constants = require('app.constants');
const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, schema);

// enable id auto casting
service._collection.options.castIds = true;


service.updateStatus = async (_id, newStatus) => {

};

service.placeOrder = async (obj) => {
  var newOrder = new service({
    type: 'LIMIT',
    side: 'BUY',
    currency: 'BTC',
    baseCurrency: 'ETH',
    limitPrice: 123.456,
    quantity: obj.quantity,
    filledQuantity: 0.0,
    status: 'PLACED',
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    userId: obj.userId
  });
  newOrder.save(function (err, nOr) {
    if (err) return console.error(err);
  });
};