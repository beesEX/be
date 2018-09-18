const logger = require('../logger');

const {
  timeResolutionValueArray,
  timeResolutionTypeArray,
} = require('../app.constants');

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
  for (let i = 0; i < timeResolutionTypeArray.length; i += 1) {
    timerList.push(setInterval(() => {updateOHLCVdata(timeResolutionTypeArray[i])}, timeResolutionValueArray[timeResolutionTypeArray[i]]));
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
