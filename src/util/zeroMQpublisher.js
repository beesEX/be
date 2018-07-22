/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const zeroMQ = require('zeromq');

const socket = zeroMQ.socket('pub');

const config = require('../config/index');

const {logger} = global;

socket.bindSync(config.zeroMQHost);

logger.info(`ZeroMQ publisher is connected to ${config.zeroMQHost}`);

function publish(message, type) {

  if (type) {

    socket.send([type, message]);

    logger.debug(`published ${message} of type ${type}`);

  }
  else {

    socket.send(message);

    logger.debug(`published ${message}`);

  }

}

function close() {

  socket.close();

  logger.info('ZeroMQ publisher is disconnected');

}


module.exports = {

  publish,

  close

};
