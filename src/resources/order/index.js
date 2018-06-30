// Created by Viet Anh Ho
const Router = require('koa-router');

const router = new Router();
const controller = require('./order.schema');

router.post('/order', controller.orderPostHandler());
router.get('/order', controller.orderGetHandler());

module.exports = router.routes();
