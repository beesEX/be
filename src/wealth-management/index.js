const Router = require('koa-router');

const router = new Router();
const controller = require('./transaction.controller');

router.get('/status/:currency', controller.status);
router.get('/transactions/:currency', controller.transactions);
router.get('/balance/:currency', controller.balance);
router.get('/available/:currency', controller.available);
router.post('/deposit/:currency', controller.deposit);

module.exports = router.routes();
