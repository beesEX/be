/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const beesV8 = require('../../trading-engine/beesV8');

const logger = require('../../logger');

const {getDataPoints} = require('../../marketdata/ohlcv.service');

exports.getAggregatedStateOfOrderBook = async (ctx) => {

  if(ctx.params && ctx.params.currency && ctx.params.baseCurrency) {

    logger.info(`order.controller.js: getAggregatedStateOfOrderBook: currency = ${ctx.params.currency} base currency = ${ctx.params.baseCurrency}`);

    ctx.body = await beesV8.getAggregatedStateOfOrderBook(`${ctx.params.currency}_${ctx.params.baseCurrency}`);

  }
  else{

    ctx.body = {

      error: 'currency/baseCurrency is missing'

    };
  }
};


exports.getOHLCVDataPoints = async (ctx) => {

  const currency = ctx && ctx.params && ctx.params.currency;

  const baseCurrency = ctx && ctx.params && ctx.params.baseCurrency;

  const resolution = ctx && ctx.params && ctx.params.resolution;

  const fromTime = ctx && ctx.request && ctx.request.query && ctx.request.query.from;

  const toTime = ctx && ctx.request && ctx.request.query && ctx.request.query.to;

  logger.debug(`getOHLCVDataPoints: currency=${currency} baseCurrency=${baseCurrency} resolution=${resolution} from=${fromTime} to =${toTime}`);

  if(currency && baseCurrency && resolution && fromTime != undefined && toTime != undefined) {

    const arrayOfDataPoints = await getDataPoints(currency, baseCurrency, resolution, parseInt(fromTime) * 1000, parseInt(toTime) * 1000); // from, to = unix timestamp in s not ms (wrong documented in chart wiki)

    logger.debug(arrayOfDataPoints.length);

    ctx.body = {

      data: arrayOfDataPoints

    };

  }
  else{

    let errorMessage = '';

    if(!currency) errorMessage = 'Missing currency';

    else if(!baseCurrency) errorMessage = 'Missing baseCurrency';

    else if(!resolution) errorMessage = 'Missing baseCurrency';

    else if(!fromTime) errorMessage = 'Missing from time Unix TS';

    else if(!toTime) errorMessage = 'Missing to time Unix TS';

    else errorMessage = 'Missing something';

    ctx.body = {
      error: {
        code: 'MDT-01',
        message: errorMessage
      }
    };
  }
};