const logger = require('../logger');

const {DATABASE_DOCUMENTS} = require('../app.constants');

const timeResolutionValueArray = {};
timeResolutionValueArray[DATABASE_DOCUMENTS.OHLCV1M] = Math.round(1 * 60 * 1000);
timeResolutionValueArray[DATABASE_DOCUMENTS.OHLCV5M] = Math.round(5 * 60 * 1000);
timeResolutionValueArray[DATABASE_DOCUMENTS.OHLCV60M] = Math.round(60 * 60 * 1000);

const isTimeStampInRangeOfStartTime = (timeResolutionType, timeStamp, startTime) => {
  const timeStampTS = timeStamp.getTime();
  const timeRange = timeResolutionValueArray[timeResolutionType];
  if (timeStampTS < startTime) return false;
  return timeStampTS - startTime <= timeRange;
};

const getCurrentStartTime = (timeResolutionType) => {
  if (!timeResolutionValueArray[timeResolutionType]) return null;
  return Math.floor((new Date()).getTime() / timeResolutionValueArray[timeResolutionType]) * timeResolutionValueArray[timeResolutionType];
};

const getStartTimeOfTimeStamp = (timeResolutionType, timeStamp) => {
  if (!timeResolutionValueArray[timeResolutionType]) return null;
  return Math.floor((timeStamp.getTime() / timeResolutionValueArray[timeResolutionType])) * timeResolutionValueArray[timeResolutionType];
};

const getNextStartTime = (currentTickTime, timeResolution) => {
  return currentTickTime + timeResolutionValueArray[timeResolution];
};

/*
const updateOHLCVdata = async (timeResolutionType) => {
  await ohlcv_data.getDataToRecordAndSetStartTime(timeResolutionType, getCurrentTickTime());
};

const begin = () => {
  // start timer for each time resolution type
  for (let i = 0; i < OHLCV_COLLECTIONS.length; i += 1) {
    timerList.push(setInterval(() => {updateOHLCVdata(OHLCV_COLLECTIONS[i])}, timeResolutionValueArray[OHLCV_COLLECTIONS[i]]));
  }
  logger.info('ohlcv.timer.js begin(): timer started');
};

const stop = () => {
  // stop all timers
  for (let i = 0; i < timerList.length; i += 1) {
    clearInterval(timerList[i]);
  }
};

*/

module.exports = {
  getNextStartTime,
  getCurrentStartTime,
  getStartTimeOfTimeStamp,
  isTimeStampInRangeOfStartTime,
};
