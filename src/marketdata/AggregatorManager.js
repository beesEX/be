/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const {ARRAY_OF_SUPPORTED_RESOLUTIONS, ARRAY_OF_SUPPORTED_TRADING_CURRENCY_PAIRS} = require('./config');

const {constructSymbol} = require('./util');

const Aggregator = require('./Aggregator');

const logger = require('../logger');

class AggregatorManager {

  constructor() {

    this.mapOfSymbolAndMapOfResolutionAndAggregator = {};

    ARRAY_OF_SUPPORTED_TRADING_CURRENCY_PAIRS.forEach(currencyPair => {

      const mapOfResolutionAndAggregator = {};

      ARRAY_OF_SUPPORTED_RESOLUTIONS.forEach((resolution) => {

        const aggregator = new Aggregator(currencyPair.currency, currencyPair.baseCurrency, resolution);

        mapOfResolutionAndAggregator[resolution] = aggregator;

      });

      const symbol = constructSymbol(currencyPair.currency, currencyPair.baseCurrency);

      this.mapOfSymbolAndMapOfResolutionAndAggregator[symbol] = mapOfResolutionAndAggregator;

    });


  }

  async dispatch(tradeExecutedEvent) {

    const {currency, baseCurrency} = tradeExecutedEvent;

    const symbol = constructSymbol(currency, baseCurrency);

    logger.debug(`dispatch trade executed event ${JSON.stringify(tradeExecutedEvent)} to all others aggregator of smybol ${symbol}`);

    const mapOfResolutionAndAggregator = this.mapOfSymbolAndMapOfResolutionAndAggregator[symbol];

    const arrayOfResolutions = Object.keys(mapOfResolutionAndAggregator);

    const arrayOfPromises = arrayOfResolutions.map(resolution => mapOfResolutionAndAggregator[resolution].processIncomingTradeExecutedEvent(tradeExecutedEvent));

    await Promise.all(arrayOfPromises);

  }

  getAggregatorBySymbolAndResolution(symbol, resolution) {

    return this.mapOfSymbolAndMapOfResolutionAndAggregator[symbol][resolution];

  }

}

module.exports = AggregatorManager;