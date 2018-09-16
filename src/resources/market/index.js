/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const Router = require('koa-router');

const router = new Router();
const controller = require('./market.controller');

router.get('/aggregatedOrderBook/:currency-:baseCurrency', controller.getAggregatedStateOfOrderBook);
router.get('/market/ohlcv/:currency-:baseCurrency/:resolution/:from/:to', controller.getMarketOhlcvData);

module.exports = router.routes();
