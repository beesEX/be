// allows require modules relative to /src folder
// for example: require('lib/mongo/idGenerator')
// all options can be found here: https://gist.github.com/branneman/8048520
require('app-module-path').addPath(__dirname);
global.logger = require('logger');
const beesV8 = require('trading-engine/beesV8');
const zeroMQ = require('./util/zeroMQpublisher');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const {logger} = global;
const config = require('config');
const Koa = require('koa');

process.on('unhandledRejection', (reason, p) => {
  logger.error('app.js Possibly Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  // application specific logging here
});

process.on('error', (error) => {
  logger.error(`app.js: BE received an error; msg= ${JSON.stringify(error)}`);
});

process.on('exit', (code, signal) => {
  logger.info(`app.js: BE exited with code=${code} and signal=${signal}`);
});

const app = new Koa();
require('./config/koa')(app);

app.listen(config.port, () => {
  beesV8.start().then(() => {
    logger.info('beesV8 trading engine is up and ready to accept order');
  });

  zeroMQ.open();

  logger.warn(`Api server listening on ${config.port}, in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
