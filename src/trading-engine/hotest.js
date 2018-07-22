// just simple manual test how orderbookside.js and mysortedmap.js work

const OrderBookSide = require('./orderbookside');

let asks = new OrderBookSide('ASK');
let bids = new OrderBookSide('BID');

function seeDetails(orderbookside){
  const book = orderbookside.orderMap;
  const keyArr = book.priceLevelSet.toArray();

  keyArr.map((val) => {
    console.log('At price '+val);

    let LLOE = book.getFirstElementOfPriceLevel(val);
    while (LLOE){
      console.log('id:',LLOE.order._id,'   quan:',LLOE.order.quantity, '   filled:',LLOE.order.filledQuantity);
      LLOE = LLOE.next;
    }

    return val;
  });
}

function placeLimit(order) { // simulate from order book
  if (order.side === 'BUY') {
    //console.log('tryToMatch in ASK_Book');
    asks.tryToMatch(order);
  }
  else { // SELL
    //console.log('tryToMatch in BID_Book');
    bids.tryToMatch(order);
  }

  // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
  if (order.remainingQuantity() > 0) {
    if (order.side === 'BUY') {
      //console.log('putOrderOnBook in BID_Book');
      bids.putOrderOnBook(order);
    }
    else { // SELL
      //console.log('putOrderOnBook in ASK_Book');
      asks.putOrderOnBook(order);
    }
  }

  console.log(' ==== BID_Book ==== ');
  seeDetails(bids);
  console.log(' ==== ASK_Book ==== ');
  seeDetails(asks);
}


function placeMarket(order){
  if (order.side === 'BUY') {
    asks.tryToMatch(order);
  }
  else { // SELL
    bids.tryToMatch(order);
  }

  console.log(' ==== BID_Book ==== ');
  seeDetails(bids);
  console.log(' ==== ASK_Book ==== ');
  seeDetails(asks);
}


function updateLimit(order){
  // remove existing order with old price from book
  if (order.side === 'BUY') {
    bids.removeOrder(order);
  }
  else { // SELL
    asks.removeOrder(order);
  }


  // process updated order like new placed order
  if (order.side === 'BUY') {
    asks.tryToMatch(order);
  }
  else { // SELL
    bids.tryToMatch(order);
  }

  // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
  if (order.remainingQuantity() > 0) {

    if (order.side === 'BUY') {
      bids.putOrderOnBook(order);
    }
    else { // SELL
      asks.putOrderOnBook(order);
    }
  }

  console.log(' ==== BID_Book ==== ');
  seeDetails(bids);
  console.log(' ==== ASK_Book ==== ');
  seeDetails(asks);
}

function updateQuantity(order){
  if (order.side === 'BUY') {
    bids.updateQuantity(order);
  }
  else { // SELL
    asks.updateQuantity(order);
  }

  console.log(' ==== BID_Book ==== ');
  seeDetails(bids);
  console.log(' ==== ASK_Book ==== ');
  seeDetails(asks);
}

function cancel(order){
  if (order.side === 'BUY') {
    bids.removeOrder(order);
  }
  else { // SELL
    asks.removeOrder(order);
  }

  console.log(' ==== BID_Book ==== ');
  seeDetails(bids);
  console.log(' ==== ASK_Book ==== ');
  seeDetails(asks);
}


class Order {
  constructor(orderObjFromDB) {
    this._id = orderObjFromDB._id;
    this.type = orderObjFromDB.type;
    this.side = orderObjFromDB.side;
    this.limitPrice = orderObjFromDB.limitPrice;
    this.quantity = orderObjFromDB.quantity;
    this.filledQuantity = orderObjFromDB.filledQuantity;
  }

  /**
   * checks whether the given price fulfills the limit price of the order
   * @param price
   * @returns {boolean}
   */
  fulfill(price) {
    if (this.type === 'MARKET') return true;
    else if (this.type === 'LIMIT') {
      if (this.side === 'BUY') {
        return this.limitPrice >= price;
      }
      return this.limitPrice <= price;
    }
    return false;
  }

  /**
   * returns symbol string of the currency pair. e.g. 'BTC_USDT'
   */
  symbol() {
    return `${this.currency}/${this.baseCurrency}`;
  }

  /**
   * return number of units that remain unfilled.
   * @returns {number}
   */
  remainingQuantity() { return this.quantity - this.filledQuantity; }
}

// TODO: make randomly
orderList = [
  {
    event: 'placeLimit',
    id:0,
    side: 'BUY',
    limitPrice: 99.0,
    quantity: 20.0,
  },
  {
    event: 'placeLimit',
    id:1,
    side: 'BUY',
    limitPrice: 99.0,
    quantity: 30.0,
  },
  {
    event: 'placeLimit',
    id:2,
    side: 'SELL',
    limitPrice: 101.0,
    quantity: 10.0,
  },
  {
    event: 'placeLimit',
    id:3,
    side: 'SELL',
    limitPrice: 100.0,
    quantity: 5.0,
  },
  {
    event: 'placeLimit',
    id:4,
    side: 'BUY',
    limitPrice: 100.0,
    quantity: 10.0,
  },
  {
    event: 'cancel',
    id: 0,
    side: 'BUY',
    limitPrice: 99.0,
    quantity: 20.0,
  },
  {
    event: 'cancel',
    id:1,
    side: 'BUY',
    limitPrice: 99.0,
    quantity: 30.0,
  },
  {
    event: 'placeLimit',
    id:5,
    side: 'BUY',
    limitPrice: 101.0,
    quantity: 11.0,
  },
  {
    event: 'updateQuantity',
    id:4,
    side: 'BUY',
    limitPrice: 100.0,
    quantity: 20.0,
  },
  {
    event: 'updateLimit',
    id:4,
    side: 'BUY',
    limitPrice: 101.0,
    quantity: 20.0,
  },
  {
    event: 'updateLimit',
    id:4,
    side: 'BUY',
    limitPrice: 102.0,
    quantity: 20.0,
  },
  {
    event: 'placeMarket',
    id:10,
    side: 'SELL',
    limitPrice: 100.0,
    quantity: 200.0,
  },
];

// deploy and see
for(let i=0; i<orderList.length; i += 1){
  // make a order obj
  console.log('Event', orderList[i].event, orderList[i].side, 'order id',  orderList[i].id, 'quantity', orderList[i].quantity, 'at price',orderList[i].limitPrice);
  let newOrder = new Order({
    _id : orderList[i].id,
    type: 'LIMIT',
    side: orderList[i].side,
    limitPrice: orderList[i].limitPrice,
    quantity: orderList[i].quantity,
    filledQuantity: 0.0,
  });
  if(orderList[i].event === 'placeLimit'){
    placeLimit(newOrder);
  }
  else if(orderList[i].event === 'cancel') cancel(newOrder);
  else if(orderList[i].event === 'updateLimit') updateLimit(newOrder);
  else if(orderList[i].event === 'updateQuantity') updateQuantity(newOrder);
  else if(orderList[i].event === 'placeMarket') placeMarket(newOrder);
  console.log('----------------------------------------------');
}