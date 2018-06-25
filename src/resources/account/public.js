const Router = require('koa-router');

const router = new Router();
const controller = require('./account.controller');

router.post('/signin', controller.signin);

module.exports = router.routes();
