const config = require('./config');
const { DATABASE_DOCUMENTS } = require('./app.constants');
const db = require('@paralect/node-mongo').connect(config.mongo.connection);

db.setServiceMethod('findById', (service, id) => {
  return service.findOne({ _id: id });
});

const orders = db.get(DATABASE_DOCUMENTS.ORDERS);
orders.createIndex(['userId', '_id', 'status']);
orders.createIndex(['orderbookTS']);

const trades = db.get(DATABASE_DOCUMENTS.TRADES);
trades.createIndex(['currency', 'baseCurrency', 'executedAt']);
trades.createIndex(['executedAt']);

const transactions = db.get(DATABASE_DOCUMENTS.TRANSACTIONS);
transactions.createIndex(['userId', 'currency', 'type']);
transactions.createIndex(['userId', 'currency', 'createdAt']);

const ohlcv1m = db.get(DATABASE_DOCUMENTS.OHLCV1M);
ohlcv1m.createIndex(['currency', 'baseCurrency', 'time']);
ohlcv1m.createIndex(['time']);

const ohlcv5m = db.get(DATABASE_DOCUMENTS.OHLCV5M);
ohlcv5m.createIndex(['currency', 'baseCurrency', 'time']);
ohlcv5m.createIndex(['time']);

const ohlcv60m = db.get(DATABASE_DOCUMENTS.OHLCV60M);
ohlcv60m.createIndex(['currency', 'baseCurrency', 'time']);
ohlcv60m.createIndex(['time']);

module.exports = db;
