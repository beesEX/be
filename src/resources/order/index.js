// Created by Viet Anh Ho
const Router = require('koa-router');

const router = new Router();
const controller = require('./order.controller');

router.post('/place', controller.orderPlaceHandler);
router.post('/update', controller.orderUpdateHandler);
router.post('/cancel', controller.orderCancelHandler);
router.get('/active', controller.orderActiveHandler);

module.exports = router.routes();
