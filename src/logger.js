const { createConsoleLogger } = require('@paralect/common-logger');

const logger = createConsoleLogger({isDev: process.env.NODE_ENV === 'development'});

const requestNamespace = require('./config/requestNamespace');

function createWrappedConsoleLogger() {

  const wrappedLogger = {

    log: function log(level, message) {

      if(arguments.length === 1) {

        message = level;

        level = logger.level || 'info';


      }

      wrappedLogger[ level ](message);

    }

  };

  let logLevels;

  if(logger && logger.levels) {

    logLevels = logger.levels;

  }
  else{

    logLevels = {

      debug: 4, error: 0, info: 2, silly: 5, verbose: 3, warn: 1

    };

  }

  const arrayOfLogLevel = Object.keys(logLevels);

  arrayOfLogLevel.forEach((logLevel) => {

    wrappedLogger[ logLevel ] = (message) => {

      const requestId = requestNamespace.get('requestId');

      if(requestId) {

        logger[ logLevel ](`[Request Id: ${requestId}]: ${message}`);

      }
      else{

        logger[ logLevel ](message);
      }

    };

  });

  return wrappedLogger;

}

const loggerInstance = createWrappedConsoleLogger();

module.exports = loggerInstance;
