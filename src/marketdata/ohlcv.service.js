/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const AggregatorManager = require('./AggregatorManager');

const aggregatorManager = new AggregatorManager();

const {DATABASE_SERVICE_REGISTRY} = require('./DatabaseServiceRegistry');

const {constructCollectionName, constructSymbol} = require('./util');

async function collectTrade(tradeExecutedEvent) {

  return aggregatorManager.dispatch(tradeExecutedEvent);

}

async function getDataPoints(currency, baseCurrency, resolution, from, to) {

  const collectionName = constructCollectionName(currency, baseCurrency, resolution);

  const databaseService = DATABASE_SERVICE_REGISTRY.getDatabaseServiceByCollectionName(collectionName);

  let arrayOfDataPoints;

  if(databaseService) {

    arrayOfDataPoints = await databaseService.getDataPoints(from, to);

  }
  else{

    logger.warn(`no database service for collection ${collectionName} exists`);

    arrayOfDataPoints = [];

  }

  const symbol = constructSymbol(currency, baseCurrency);

  const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(symbol, resolution);

  if(aggregator) {

    if(aggregator.currentDataPoint && aggregator.currentDataPoint.startTime <= to) {

      arrayOfDataPoints.push(aggregator.currentDataPoint.toJSON());

    }

    return arrayOfDataPoints;

  }
  else{

    logger.warn(`no aggregator was found for symbol ${symbol} and resolution ${resolution}`);

    return [];

  }

}

module.exports = {

  collectTrade,

  getDataPoints

};