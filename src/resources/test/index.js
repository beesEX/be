/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */
const Router = require('koa-router');

const router = new Router();
const controller = require('./helloWorld.controller');

router.get('/helloWorld', controller.generateHandler());

module.exports = router.routes();
