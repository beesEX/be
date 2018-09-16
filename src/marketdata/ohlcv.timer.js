const logger = require('../logger');

const {
  timeResolutionValueArray,
  timeResolutionTypeArray,
} = require('../app.constants');


const getTickTimeOfTimeStamp = (timeStamp) => {
  return Math.round(timeStamp.getTime());
};

const getCurrentTickTime = () => {
  // return current tick time in second
  return (new Date()).getTime();
};

const getCurrentTickTimeOfTimeResolution = (timeResolutionType) => {
  if (!timeResolutionValueArray[timeResolutionType]) return null;
  return Math.round(Math.floor((new Date()).getTime() / timeResolutionValueArray[timeResolutionType]) * timeResolutionValueArray[timeResolutionType]);
};

const getTickTimeOfTimeResolutionOfTimeStamp = (timeResolutionType, timeStamp) => {
  if (!timeResolutionValueArray[timeResolutionType]) return null;
  return Math.round(Math.floor((timeStamp.getTime() / timeResolutionValueArray[timeResolutionType])) * timeResolutionValueArray[timeResolutionType]);
};

const getNextTickTimeOfResolution = (currentTickTime, timeResolution) => {
  return Math.round(currentTickTime + timeResolutionValueArray[timeResolution]);
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
