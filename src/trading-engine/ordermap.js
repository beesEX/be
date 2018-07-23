/*
* Created by Viet Anh Ho
*
* Define a new order map:
* - All price levels are sorted in sorted set
* - For each price level there is a array to save the first and the last order ID
* - Each order ID will match with a LinkedListOrderElement (LLOE)
* - Each LLOE will contain order object and link to the previous and next LLOE
*/

const SortedSet = require('collections/sorted-set');
// src: http://www.collectionsjs.com/sorted-set

class OrderLinkedListElement {
  constructor(order) {
    this.order = order;
    this.previous = null;
    this.next = null;
  }

  setPrevious(LLOrderElement) {
    this.previous = LLOrderElement;
  }

  setNext(LLOrderElement) {
    this.next = LLOrderElement;
  }

  setOrder(order) {
    this.order = order;
  }
}

class OrderLinkedList{

  constructor(order){
    this.head = new OrderLinkedListElement(order);
    this.tail = this.head;
  }

  hasOnlyOneElement(){
    if(this.head === this.tail){
      return true;
    }

    return false;
  }

  isHead(element){
    return this.head === element;
  }

  isTail(element){
    return this.tail === element;
  }

}

module.exports = class OrderMap {
  constructor() {
    // save price level to get min, max
    this.priceLevelSet = new SortedSet();

    // save linkedListOrderElement via matching id
    this.mapOfOrderIdAndOrderLinkedListElement = {};

    // <price level> : [<first order id>, <last order id>]
    this.mapOfPriceAndOrderLinkedList = {};
  }

  addOrder(order) {
    // check if this order already exists or not
    if (this.mapOfOrderIdAndOrderLinkedListElement[order._id]) {
      console.log('ordermap.js: addOrder(): ERROR: this order._id already existed');
      return false;
    }

    const priceLevel = order.limitPrice;
    const newLinkedListOrderElement = new OrderLinkedListElement(order);

    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[priceLevel];
    if (orderLinkedList) {
      // link this new element to the end of linked list
      // set next order to the current last element in list
      const lastOrderElement = orderLinkedList.tail;
      newLinkedListOrderElement.setPrevious(lastOrderElement);
      lastOrderElement.setNext(newLinkedListOrderElement);

      orderLinkedList.tail = newLinkedListOrderElement;

    }
    else {
      // new array
      // add to array of price level
      this.mapOfPriceAndOrderLinkedList[priceLevel] = new OrderLinkedList(order);

      // add this price level
      this.priceLevelSet.push(priceLevel);
    }

    // save this new element
    this.mapOfOrderIdAndOrderLinkedListElement[order._id] = newLinkedListOrderElement;

    return true;
  }

  getMinPriceLevel() {
    return this.priceLevelSet.min();
  }

  getMaxPriceLevel() {
    return this.priceLevelSet.max();
  }

  getFirstElementOfPriceLevel(price) {
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[price];
    if (orderLinkedList) {
      const order = orderLinkedList.head;
      if (order) {
        return order;
      }
      // console.log('ordermap.js: getFirstElementOfPriceLevel(): WARNING: not found order for this order id', orderId);
      return null;
    }
    // console.log('ordermap.js: getFirstElementOfPriceLevel(): WARNING: not found price level', price);
    return null;
  }

  getLastElementOfPriceLevel(price) {
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[price];
    if (orderLinkedList) {
      const order = orderLinkedList.tail;
      if (order) {
        return order;
      }
      // console.log('ordermap.js: getLastElementOfPriceLevel(): WARNING: not found order for this order id', orderId);
      return null;
    }
    // console.log('ordermap.js: getLastElementOfPriceLevel(): WARNING: not found price level');
    return null;
  }

  removeOrder(orderToRemove) {
    // first get orderElement of this order
    const orderLinkedListElementToRemove = this.mapOfOrderIdAndOrderLinkedListElement[orderToRemove._id];
    if (!orderLinkedListElementToRemove) {
      // this order is not in this orderMap
      console.log('ordermap.js: removeOrder(): ERROR: not found this order._id', orderToRemove._id);
      return false;
    }

    // check if this order is head or tail of array
    const priceLevel = orderLinkedListElementToRemove.order.limitPrice;
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[priceLevel];
    if (!orderLinkedList) {
      // this order is not in this orderMap
      console.log('ordermap.js: removeOrder(): ERROR: not found array for this price level', priceLevel);
      return false;
    }
    else if (orderLinkedList.hasOnlyOneElement()) {
      // only this order at this price level
      // delete this price level
      delete this.mapOfPriceAndOrderLinkedList[priceLevel];
      this.priceLevelSet.delete(priceLevel);
    }
    else if (orderLinkedList.isHead(orderLinkedListElementToRemove)) {
      // this order is head
      // let its next be head
      const nextLinkedListElement = orderLinkedListElementToRemove.next;
      nextLinkedListElement.setPrevious(null);

      if (orderLinkedList.isTail(nextLinkedListElement)) {
        orderLinkedList.head = nextLinkedListElement;
      }
    }
    else if (orderLinkedList.isTail(orderLinkedListElementToRemove)) {
      // this order is tail
      // let its previous be tail
      const previousOrderLinkedListElement = orderLinkedListElementToRemove.previous;
      previousOrderLinkedListElement.setNext(null);

      if (orderLinkedList.isHead(previousOrderLinkedListElement)) {
        orderLinkedList.tail = previousOrderLinkedListElement;
      }
    }
    else {
      // this order in the middle
      // connect previous to next
      const previousElement = orderLinkedListElementToRemove.previous;
      const nextElement = orderLinkedListElementToRemove.next;

      previousElement.setNext(nextElement);
      nextElement.setPrevious(previousElement);
    }

    // remove this linkedListOrderElement
    delete this.mapOfOrderIdAndOrderLinkedListElement[orderToRemove._id];

    return true;
  }

  updateOrderQuantity(order) {
    // just update it
    const orderLinkedListElement = this.mapOfOrderIdAndOrderLinkedListElement[order._id];
    if (orderLinkedListElement) {
      orderLinkedListElement.order.quantity = order.quantity;
      return true;
    }
    console.log('ordermap.js: updateOrderQuantity(): ERROR: not found old order ID', order._id, 'to update -> add new');
    return false;
  }
};
