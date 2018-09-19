const DATABASE_DOCUMENTS = {
  USERS: 'users',
  ORDERS: 'orders',
  TRANSACTIONS: 'transactions',
  TRADES: 'trades',
  ONE_MINUTE: 'ohlcv1m', // [Tung]: rename field to OHLCV1M
  ONE_HOUR: 'ohlcv60m', // [Tung]: rename field to OHLCV5M, and collection to 'ohlcv5m'
};

const timeResolutionTypeArray = [DATABASE_DOCUMENTS.ONE_MINUTE, DATABASE_DOCUMENTS.ONE_HOUR]; // [Tung]: rename array var to 'OHLCV_COLLECTIONS',

const timeResolutionValueArray = {}; // [Tung]: remove this array from here, define and rename it to 'OHLCV_INTERVALS' in timer.js directly
timeResolutionValueArray[DATABASE_DOCUMENTS.ONE_MINUTE] = Math.round(1 * 60 * 1000);
timeResolutionValueArray[DATABASE_DOCUMENTS.ONE_HOUR] = Math.round(5 * 60 * 1000);

module.exports = {
  DATABASE_DOCUMENTS,
  CURRENCY_SYMBOLS: ['BTC', 'BCH', 'ETH', 'XRP', 'EOS', 'LTC', 'XLM', 'ADA', 'USDT', 'MIOTA', 'NANO', 'ICX'],
  timeResolutionTypeArray,
  timeResolutionValueArray,
};
