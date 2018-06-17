const mount = require('koa-mount');
const userResource = require('resources/user');
const testResource = require('resources/test');

module.exports = (app) => {
  app.use(mount('/users', userResource));
  app.use(mount('/test',testResource));
};
