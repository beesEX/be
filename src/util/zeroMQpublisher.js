/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const zeroMQ = require('zeromq');

let socket = zeroMQ.socket('pub');

const config = require('../config/index');

const logger = require('../logger');


function open() {
  socket = zeroMQ.socket('pub');
  socket.bindSync(config.zeroMQHost);
  logger.info(`ZeroMQ publisher is connected to ${config.zeroMQHost}`);
}

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
  open,

  publish,

  close

};
