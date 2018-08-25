/**
 * Just use await sleep(1000) to wait blockingly for 1000 milliseconds
 * @param ms
 * @returns {Promise<any>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = sleep;