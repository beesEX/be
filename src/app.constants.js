const DATABASE_DOCUMENTS = {
  USERS: 'users',
  ORDERS: 'orders',
  TRANSACTIONS: 'transactions',
  TRADES: 'trades',
  ONE_MINUTE: 'ohlcv1m',
  ONE_HOUR: 'ohlcv60m',
};

const timeResolutionTypeArray = [DATABASE_DOCUMENTS.ONE_MINUTE, DATABASE_DOCUMENTS.ONE_HOUR];

const timeResolutionValueArray = {};
timeResolutionValueArray[DATABASE_DOCUMENTS.ONE_MINUTE] = Math.round(1 * 60 * 1000);
timeResolutionValueArray[DATABASE_DOCUMENTS.ONE_HOUR] = Math.round(5 * 60 * 1000);

module.exports = {
  DATABASE_DOCUMENTS,
  CURRENCY_SYMBOLS: ['BTC', 'BCH', 'ETH', 'XRP', 'EOS', 'LTC', 'XLM', 'ADA', 'USDT', 'MIOTA', 'NANO', 'ICX'],
  timeResolutionTypeArray,
  timeResolutionValueArray,
};
