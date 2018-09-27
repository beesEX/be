/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const db = require('../db');

const logger = require('../logger');

const {constructCollectionName} = require('./util');

const {DATABASE_SERVICE_REGISTRY} = require('./DatabaseServiceRegistry');

class DatabaseService {

  constructor(currency, baseCurrency, resolution) {

    const collectionName = constructCollectionName(currency, baseCurrency, resolution);

    this.service = db.createService(collectionName);

    DATABASE_SERVICE_REGISTRY.register(collectionName, this);

  }

  async save(dataPoint) {

    const dataPointAsJson = dataPoint.toJSON();

    logger.debug(`save data point ${JSON.stringify(dataPointAsJson)}`);

    await this.service.create(dataPoint.toJSON());

  }

  async getLatestSavedDataPoint() {

    const query = await this.service.find({}, {

      limit: 1,

      sort: {_id: -1}

    });

    if(query.results && query.results.length > 0) {

      return query.results[0];

    }

    return Promise.reject(new Error('no data point was found'));

  }

  async getDataPoints(from, to) {

    const query = await this.service.find({

      time: {

        $gte: from,

        $lte: to

      }

    });

    return query.results || [];

  }

}

module.exports = DatabaseService;