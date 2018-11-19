const winston = require('winston');

const createConsoleLogger = ({isDev = false}) => {
  const transports = [];
  /*transports.push(new winston.transports.Console({
    colorize: true,
    humanReadableUnhandledException: true,
    json: !isDev,
    level: isDev ? 'debug' : 'info'
  }));*/

  transports.push(new winston.transports.File({
    humanReadableUnhandledException: true,
    json: !isDev,
    level: isDev ? 'debug' : 'info',
    filename: 'log/be.log',
    maxsize: 100 * 1024 * 1024 // MB
  }));

  const logger = new winston.Logger({
    exitOnError: false,
    transports
  });

  logger.debug('[logger] Configured console based logger');

  return logger;
};


const logger = createConsoleLogger({isDev: process.env.NODE_ENV === 'development'});

const requestNamespace = require('./config/requestNamespace');

function createWrappedConsoleLogger() {

  const wrappedLogger = {

    log: function log(level, message) {

      if(arguments.length === 1) {

        message = level;

        level = logger.level || 'info';


      }

      wrappedLogger[level](message);

    }

  };

  let logLevels;

  if(logger && logger.levels) {

    logLevels = logger.levels;

  }
  else{

    logLevels = {

      debug: 4,
      error: 0,
      info: 2,
      silly: 5,
      verbose: 3,
      warn: 1

    };

  }

  const arrayOfLogLevel = Object.keys(logLevels);

  arrayOfLogLevel.forEach((logLevel) => {

    wrappedLogger[logLevel] = (...messages) => {

      const requestId = requestNamespace.get('requestId');

      if(requestId) {

        logger[logLevel](`[Request Id: ${requestId}]:`, ...messages);

      }
      else{

        logger[logLevel](...messages);
      }

    };

  });

  return wrappedLogger;

}

const loggerInstance = createWrappedConsoleLogger();

module.exports = loggerInstance;
