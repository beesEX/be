/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */


function constructCollectionName(currency, baseCurrency, resolution) {

  const symbol = constructSymbol(currency, baseCurrency);

  return `${symbol}_${resolution}`;

}

function constructSymbol(currency, baseCurrency) {

  return `${currency}_${baseCurrency}`;

}

module.exports = {

  constructCollectionName,

  constructSymbol

};
