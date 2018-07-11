const OrderBook = require('./orderbook');
const OrderBookSide = require('./orderbookside');


let orderBooks = {}; // contains all order books of each currency pair

// PLACE LIMIT ORDER
const orderPlacedEvent = orderEventQueue.receive();
if(!orderBooks[orderPlacedEvent.order.baseCurrency+"/"+orderPlacedEvent.order.currency]
    && !orderBooks[orderPlacedEvent.order.currency+"/"+orderPlacedEvent.order.baseCurrency]){
  orderBooks[orderPlacedEvent.order.baseCurrency+"/"+orderPlacedEvent.order.currency]
    = new OrderBook(new OrderBookSide('SELL'), new OrderBookSide('BUY'));
}
orderBooks[orderPlacedEvent.order.baseCurrency+"/"+orderPlacedEvent.order.currency].placeLimit(orderPlacedEvent);


// UPDATE ORDER
const orderUpdatedEvent = orderEventQueue.receive();
if(!orderBooks[orderUpdatedEvent.previous.baseCurrency+"/"+orderUpdatedEvent.previous.currency]
  && !orderBooks[orderUpdatedEvent.previous.currency+"/"+orderUpdatedEvent.previous.baseCurrency]){
  orderBooks[orderUpdatedEvent.previous.baseCurrency+"/"+orderUpdatedEvent.previous.currency]
    = new OrderBook(new OrderBookSide('SELL'), new OrderBookSide('BUY'));
}
orderBooks[orderUpdatedEvent.order.baseCurrency+"/"+orderUpdatedEvent.order.currency].updateLimit(orderUpdatedEvent);


// CANCEL ORDER
const orderCanceledEvent = orderEventQueue.receive();
if(!orderBooks[orderCanceledEvent.order.baseCurrency+"/"+orderCanceledEvent.order.currency]
  && !orderBooks[orderCanceledEvent.order.currency+"/"+orderCanceledEvent.order.baseCurrency]){
  orderBooks[orderCanceledEvent.order.baseCurrency+"/"+orderCanceledEvent.order.currency]
    = new OrderBook(new OrderBookSide('SELL'), new OrderBookSide('BUY'));
}
orderBooks[orderCanceledEvent.order.baseCurrency+"/"+orderCanceledEvent.order.currency].cancel(orderCanceledEvent);




// Usage
/*
const askSide = new OrderBookSide('SELL');
const bidSide = new OrderBookSide('BUY');
const lob = new OrderBook(askSide, bidSide);

const orderPlacedEvent = orderEventQueue.receive();
lob.placeLimit(orderPlacedEvent);

const orderUpdatedEvent = orderEventQueue.receive();
lob.updateLimit(orderUpdatedEvent);

const orderCanceledEvent = orderEventQueue.receive();
lob.cancel(orderCanceledEvent);
*/