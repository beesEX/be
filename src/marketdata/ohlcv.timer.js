const logger = require('../logger');

const {
  timeResolutionValueArray,
  timeResolutionTypeArray,
} = require('../app.constants');


const getTickTimeOfTimeStamp = (timeStamp) => {
  return parseInt(timeStamp.getTime() / 1000);
};

const getCurrentTickTime = () => {
  // return current tick time in second
  return parseInt ((new Date()).getTime() / 1000);
};

const getCurrentTickTimeOfTimeResolution = (timeResolutionType) => {
  if (!timeResolutionValueArray[timeResolutionType]) return null;
  return parseInt ((new Date()).getTime() / timeResolutionValueArray[timeResolutionType]);
};

const getTickTimeOfTimeResolutionOfTimeStamp = (timeResolutionType, timeStamp) => {
  if (!timeResolutionValueArray[timeResolutionType]) return null;
  return parseInt (timeStamp.getTime() / timeResolutionValueArray[timeResolutionType]);
};

const getNextTickTimeOfResolution = (currentTickTime, timeResolution) => {
  return currentTickTime + timeResolutionValueArray[timeResolution];
};

/*
const updateOHLCVdata = async (timeResolutionType) => {
  await ohlcv_data.nextTick(timeResolutionType, getCurrentTickTime());
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
  getCurrentTickTime,
  getTickTimeOfTimeStamp,
  getNextTickTimeOfResolution,
  getCurrentTickTimeOfTimeResolution,
  getTickTimeOfTimeResolutionOfTimeStamp,
};
