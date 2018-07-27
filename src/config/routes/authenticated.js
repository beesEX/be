const mount = require('koa-mount');
const userResource = require('resources/user');
const orderResource = require('resources/order');
const marketResource = require('resources/market');

module.exports = (app) => {
  app.use(mount('/users', userResource));
  app.use(mount('/order', orderResource));
  app.use(mount('/market',marketResource));
};
