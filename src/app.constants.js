const DATABASE_DOCUMENTS = {
  USERS: 'users',
  ORDERS: 'orders',
  TRANSACTIONS: 'transactions',
  TRADES: 'trades',
  ONE_MINUTE: 'ohlcv1m',
  THIRTY_MINUTES: 'ohlcv30m',
};

const timeResolutionTypeArray = [DATABASE_DOCUMENTS.ONE_MINUTE, DATABASE_DOCUMENTS.THIRTY_MINUTES];

const timeResolutionValueArray = {};
timeResolutionValueArray[DATABASE_DOCUMENTS.ONE_MINUTE] = 1 * 60 * 1000;
timeResolutionValueArray[DATABASE_DOCUMENTS.THIRTY_MINUTES] = 30 * 60 * 1000;

module.exports = {
  DATABASE_DOCUMENTS,
  CURRENCY_SYMBOLS: ['BTC', 'BCH', 'ETH', 'XRP', 'EOS', 'LTC', 'XLM', 'ADA', 'USDT', 'MIOTA', 'NANO', 'ICX'],
  timeResolutionTypeArray,
  timeResolutionValueArray,
};
