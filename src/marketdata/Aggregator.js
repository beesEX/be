/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const DataPoint = require('./DataPoint');

const DatabaseService = require('./DatabaseService');

const logger = require('../logger');

class Aggregator {

  constructor(currency, baseCurrency, resolution) {

    this.resolution = resolution;

    this.currentDataPoint = null;

    this.databaseService = new DatabaseService(currency, baseCurrency, resolution);

  }

  async processIncomingTradeExecutedEvent(tradeExecutedEvent) {

    logger.debug(`processing trade executed event ${JSON.stringify(tradeExecutedEvent)}`);

    const {price, quantity, executedAt} = tradeExecutedEvent;

    let startTime;

    let latestClosedPrice;

    if(!this.currentDataPoint) {

      try{

        const latestSavedDataPoint = await this.databaseService.getLatestSavedDataPoint();

        startTime = latestSavedDataPoint.time + this.resolution;

        latestClosedPrice = latestSavedDataPoint.close;
      }
      catch(e){

        startTime = this.calculateClosestStartTimeForResolution(executedAt);

        latestClosedPrice = price;

      }

      this.currentDataPoint = new DataPoint(startTime, latestClosedPrice);

    }

    while(!this.isInCurrentResolutionInterval(executedAt)){

      await this.databaseService.save(this.currentDataPoint);

      this.createNewCurrentDataPointFromCurrentDataPoint(this.currentDataPoint.close, quantity);

    }

    this.currentDataPoint.update(price, quantity);

  }

  isInCurrentResolutionInterval(tradeExecutedTime) {

    return isInInterval(this.currentDataPoint.startTime, this.resolution, tradeExecutedTime);

  }

  createNewCurrentDataPointFromCurrentDataPoint(price) {

    const startTime = this.currentDataPoint.startTime + this.resolution;

    this.currentDataPoint = new DataPoint(startTime, price);


  }

  calculateClosestStartTimeForResolution(time) {

    return time - (time % this.resolution);

  }

}

function isInInterval(start, length, value) {

  const intervalRightThreshold = start + length;

  if(value < intervalRightThreshold) {

    return true;

  }

  return false;

}

module.exports = Aggregator;