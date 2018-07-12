// just simple manual test how orderbookside.js and mysortedmap.js work

const OrderBookSide = require('./orderbookside');

let asks = new OrderBookSide('ASK');
let bids = new OrderBookSide('BID');

function seeDetails(orderbookside){
  const book = orderbookside.book;
  const keyArr = book.keyArr;
  const valMap = book.valMap;
  keyArr.map((val) => {
    console.log('At price '+val);
    const values = valMap[val];
    for(let i=0; i<values.length; i+=1){
      console.log('id:',values[i]._id,'   quan:',values[i].quantity, '   filled:',values[i].filledQuantity);
    }
    return val;
  });
}

function placeLimit(order) { // simulate from order book
  if (order.side === 'BUY') {
    asks.tryToMatch(order);
    console.log('tryToMatch in ASK_Book');
    //seeDetails(asks);
  }
  else { // SELL
    bids.tryToMatch(order);
    console.log('tryToMatch in BID_Book');
    //seeDetails(bids);
  }

  // Neu van chua match het hoac ko match duoc teo nao thi cho order len so
  if (order.remainingQuantity() > 0) {
    if (order.side === 'BUY') {
      bids.putOrderOnBook(order);
      console.log('putOrderOnBook in BID_Book');
    }
    else { // SELL
      asks.putOrderOnBook(order);
      console.log('putOrderOnBook in ASK_Book');
    }
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

  /**
   * set filled quantity via setting remain quantity
   * @remainValue: remaining quantity need to be filled
   */
  setRemainingQuantity(remainValue) { this.filledQuantity = this.quantity - remainValue; }
}

// TODO: make randomly
// all type is place limit
orderList = [
  {
    side: 'BUY',
    limitPrice: 99.0,
    quantity: 20.0,
  },
  {
    side: 'BUY',
    limitPrice: 99.0,
    quantity: 30.0,
  },
  {
    side: 'SELL',
    limitPrice: 101.0,
    quantity: 10.0,
  },
  {
    side: 'SELL',
    limitPrice: 100.0,
    quantity: 5.0,
  },
  {
    side: 'BUY',
    limitPrice: 100.0,
    quantity: 10.0,
  },
];

// deploy and see
for(let i=0; i<orderList.length; i += 1){
  // make a order obj
  const newOrder = new Order({
    _id : i,
    type: 'LIMIT',
    side: orderList[i].side,
    limitPrice: orderList[i].limitPrice,
    quantity: orderList[i].quantity,
    filledQuantity: 0.0,
  });
  placeLimit(newOrder);
  console.log('----------------------------------------------');
}