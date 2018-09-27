/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const ONE_MINUTE_IN_MS = 60 * 1000;

const FIVE_MINUTE_IN_MS = 5 * ONE_MINUTE_IN_MS;

const ARRAY_OF_SUPPORTED_RESOLUTIONS = [ONE_MINUTE_IN_MS, FIVE_MINUTE_IN_MS];

const ARRAY_OF_SUPPORTED_TRADING_CURRENCY_PAIRS = [

  {
    currency: 'BTC',
    baseCurrency: 'USDT'
  },

  {
    currency: 'USDT',
    baseCurrency: 'BTC'
  }

];

module.exports = {

  ARRAY_OF_SUPPORTED_RESOLUTIONS,

  ARRAY_OF_SUPPORTED_TRADING_CURRENCY_PAIRS

};