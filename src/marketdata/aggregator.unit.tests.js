/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const {describe, it} = require('mocha');
const {expect} = require('chai');
const db = require('../db');
const {constructSymbol, constructCollectionName} = require('./util');

const {ARRAY_OF_SUPPORTED_RESOLUTIONS} = require('./config');


const AggregatorManager = require('./AggregatorManager');

const CURRENCY = 'BTC';
const BASE_CURRENCY = 'USDT';
const SYMBOl = constructSymbol(CURRENCY, BASE_CURRENCY);

describe('aggregator unit tests', () => {

  beforeEach(async () => {

    ARRAY_OF_SUPPORTED_RESOLUTIONS.forEach(resolution => {

      const collectionName = constructCollectionName(CURRENCY, BASE_CURRENCY, resolution);

      db.get(collectionName)
        .drop();

    });


  });

  after(() => {

    db.close();

  });

  it('create new current data point at the begin of the interval with no saved data points should be ok', async () => {

    const timestamp = 0;

    const aggregatorManager = new AggregatorManager();

    const tradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 10,

      quantity: 1,

      executedAt: timestamp

    };

    await aggregatorManager.dispatch(tradeEvent);

    ARRAY_OF_SUPPORTED_RESOLUTIONS.forEach(resolution => {

      const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(SYMBOl, resolution);

      expect(aggregator.currentDataPoint).not.null;

      expect(aggregator.currentDataPoint.open).to.be.equal(10);

      expect(aggregator.currentDataPoint.high).to.be.equal(10);

      expect(aggregator.currentDataPoint.low).to.be.equal(10);

      expect(aggregator.currentDataPoint.close).to.be.equal(10);

      expect(aggregator.currentDataPoint.volume).to.be.equal(1);

      expect(aggregator.currentDataPoint.startTime).to.be.equal(0);

    });

  });

  it('create new current data point at the middle of the interval with no saved data points should be ok', async () => {

    const timestamp = 200;

    const aggregatorManager = new AggregatorManager();

    const tradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 10,

      quantity: 1,

      executedAt: timestamp

    };

    await aggregatorManager.dispatch(tradeEvent);

    ARRAY_OF_SUPPORTED_RESOLUTIONS.forEach(resolution => {

      const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(SYMBOl, resolution);

      expect(aggregator.currentDataPoint).not.null;

      expect(aggregator.currentDataPoint.open).to.be.equal(10);

      expect(aggregator.currentDataPoint.high).to.be.equal(10);

      expect(aggregator.currentDataPoint.low).to.be.equal(10);

      expect(aggregator.currentDataPoint.close).to.be.equal(10);

      expect(aggregator.currentDataPoint.volume).to.be.equal(1);

      expect(aggregator.currentDataPoint.startTime).to.be.equal(0);


    });

  });

  it('save a data point with specific resolution to database should be ok', async () => {

    const timestamp = 0;

    const aggregatorManager = new AggregatorManager();

    const resolution = ARRAY_OF_SUPPORTED_RESOLUTIONS[0];

    const firstTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 10,

      quantity: 1,

      executedAt: timestamp

    };

    await aggregatorManager.dispatch(firstTradeEvent);

    const secondTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 20,

      quantity: 1,

      executedAt: timestamp + resolution

    };

    await aggregatorManager.dispatch(secondTradeEvent);

    const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(SYMBOl, resolution);

    const arrayOfDataPoints = await aggregator.databaseService.getDataPoints(0, timestamp + resolution);

    expect(arrayOfDataPoints.length).to.be.equal(1);

    const savedDataPoint = arrayOfDataPoints[0];

    expect(savedDataPoint.open).to.be.equal(10);

    expect(savedDataPoint.close).to.be.equal(10);

    expect(savedDataPoint.high).to.be.equal(10);

    expect(savedDataPoint.low).to.be.equal(10);

    expect(savedDataPoint.volume).to.be.equal(1);

    expect(savedDataPoint.time).to.be.equal(0);

  });

  it('create a new data point after saving the current data point with specific resolution to database should be ok', async () => {

    const timestamp = 0;

    const aggregatorManager = new AggregatorManager();

    const resolution = ARRAY_OF_SUPPORTED_RESOLUTIONS[0];

    const firstTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 10,

      quantity: 1,

      executedAt: timestamp

    };

    await aggregatorManager.dispatch(firstTradeEvent);

    const secondTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 20,

      quantity: 1,

      executedAt: timestamp + resolution

    };

    await aggregatorManager.dispatch(secondTradeEvent);

    const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(SYMBOl, resolution);

    expect(aggregator.currentDataPoint.open).to.be.equal(10);

    expect(aggregator.currentDataPoint.close).to.be.equal(20);

    expect(aggregator.currentDataPoint.high).to.be.equal(20);

    expect(aggregator.currentDataPoint.low).to.be.equal(10);

    expect(aggregator.currentDataPoint.volume).to.be.equal(1);

    expect(aggregator.currentDataPoint.startTime).to.be.equal(resolution);

  });

  it('saving data points reflecting no trade activities should be ok', async () => {

    const timestamp = 0;

    const aggregatorManager = new AggregatorManager();

    const resolution = ARRAY_OF_SUPPORTED_RESOLUTIONS[0];

    const numberOfNoTradeActivitiesDataPoints = 2;

    const numberOfSavedDataPoints = numberOfNoTradeActivitiesDataPoints + 1;

    const firstTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 10,

      quantity: 1,

      executedAt: timestamp

    };

    await aggregatorManager.dispatch(firstTradeEvent);

    const secondTradeEvent = {

        currency: CURRENCY,

        baseCurrency: BASE_CURRENCY,

        price: 20,

        quantity: 1,

        executedAt: timestamp + resolution * numberOfSavedDataPoints

      }
    ;

    await aggregatorManager.dispatch(secondTradeEvent);

    const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(SYMBOl, resolution);

    const arrayOfDataPoints = await aggregator.databaseService.getDataPoints(0, resolution * numberOfSavedDataPoints);

    expect(arrayOfDataPoints.length).to.be.equal(numberOfSavedDataPoints);

    for(let i = 1; i < numberOfSavedDataPoints; i++) {

      const savedDataPoint = arrayOfDataPoints[i];

      expect(savedDataPoint.open).to.be.equal(10);

      expect(savedDataPoint.close).to.be.equal(10);

      expect(savedDataPoint.high).to.be.equal(10);

      expect(savedDataPoint.low).to.be.equal(10);

      expect(savedDataPoint.volume).to.be.equal(0);

      expect(savedDataPoint.time).to.be.equal(i * resolution);

    }


  });

  it('load the latest saved data point from database should be ok', async () => {

    const timestamp = 0;

    const aggregatorManager = new AggregatorManager();

    const resolution = ARRAY_OF_SUPPORTED_RESOLUTIONS[0];

    const numberOfNoTradeActivitiesDataPoints = 2;

    const numberOfSavedDataPoints = numberOfNoTradeActivitiesDataPoints + 1;

    const firstTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 10,

      quantity: 1,

      executedAt: timestamp

    };

    await aggregatorManager.dispatch(firstTradeEvent);

    const secondTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 20,

      quantity: 1,

      executedAt: timestamp + resolution

    };

    await aggregatorManager.dispatch(secondTradeEvent);

    const aggregator = aggregatorManager.getAggregatorBySymbolAndResolution(SYMBOl, resolution);

    aggregator.currentDataPoint = null;

    const thirdTradeEvent = {

      currency: CURRENCY,

      baseCurrency: BASE_CURRENCY,

      price: 20,

      quantity: 1,

      executedAt: timestamp + resolution * numberOfSavedDataPoints

    };

    await aggregatorManager.dispatch(thirdTradeEvent);

    const arrayOfDataPoints = await aggregator.databaseService.getDataPoints(0, resolution * numberOfSavedDataPoints);

    expect(arrayOfDataPoints.length).to.be.equal(numberOfSavedDataPoints);

    for(let i = 1; i < numberOfSavedDataPoints; i++) {

      const savedDataPoint = arrayOfDataPoints[i];

      expect(savedDataPoint.open).to.be.equal(10);

      expect(savedDataPoint.close).to.be.equal(10);

      expect(savedDataPoint.high).to.be.equal(10);

      expect(savedDataPoint.low).to.be.equal(10);

      expect(savedDataPoint.volume).to.be.equal(0);

      expect(savedDataPoint.time).to.be.equal(i * resolution);

    }

  });

});
