const mount = require('koa-mount');
const userResource = require('resources/user');
const testResource = require('resources/test');
const orderResource = require('resources/order');
const marketResource = require('resources/market');

module.exports = (app) => {
  app.use(mount('/users', userResource));
  app.use(mount('/test', testResource));
  app.use(mount('/order', orderResource));
  app.use(mount('/market',marketResource));
};
