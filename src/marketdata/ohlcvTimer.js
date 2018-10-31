
const {DATABASE_DOCUMENTS} = require('../app.constants');

const RESOLUTION_2_AGGREGATING_PERIOD_LENGTH = {};
RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[DATABASE_DOCUMENTS.OHLCV1M] = Math.round(1 * 60 * 1000);
RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[DATABASE_DOCUMENTS.OHLCV5M] = Math.round(5 * 60 * 1000);
RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[DATABASE_DOCUMENTS.OHLCV60M] = Math.round(60 * 60 * 1000);

const getCurrentStartTime = (timeResolutionType) => {
  if (!RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType]) return null;
  return Math.floor((new Date()).getTime() / RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType]) * RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType];
};

const getStartTimeOfTimeStamp = (timeResolutionType, timeStamp) => {
  if (!RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType]) return null;
  return Math.floor((timeStamp.getTime() / RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType])) * RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolutionType];
};

const getNextStartTime = (currentStartTime, timeResolution) => {
  return currentStartTime + RESOLUTION_2_AGGREGATING_PERIOD_LENGTH[timeResolution];
};

module.exports = {
  RESOLUTION_2_AGGREGATING_PERIOD_LENGTH,
  getNextStartTime,
  getCurrentStartTime,
  getStartTimeOfTimeStamp,
};
