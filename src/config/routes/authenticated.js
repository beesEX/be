const mount = require('koa-mount');
const userResource = require('resources/user');
const orderResource = require('resources/order');
const marketResource = require('resources/market');
const transactionResource = require('wealth-management');

module.exports = (app) => {
  app.use(mount('/users', userResource));
  app.use(mount('/order', orderResource));
  app.use(mount('/market', marketResource));
  app.use(mount('/finance', transactionResource));
};
