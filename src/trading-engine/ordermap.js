/*
* Created by Viet Anh Ho
*
* Define a new order map:
* - All price levels are sorted in sorted set
* - For each price level there is a array to save the first and the last order ID
* - Each order ID will match with a LinkedListOrderElement (LLOE)
* - Each LLOE will contain order object and link to the previous and next LLOE
*/
const {logger} = global;

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

class OrderLinkedList {
  constructor(element) {
    this.head = element;
    this.tail = this.head;
    // save linkedListOrderElement via matching id
    this.mapOfOrderIdAndOrderLinkedListElement = {};
    this.mapOfOrderIdAndOrderLinkedListElement[element.order._id] = element;
  }

  appendElement(element) {
    // check if this element already exists
    if (this.mapOfOrderIdAndOrderLinkedListElement[element.order._id]) return false;

    // link this new element to the end of linked list
    // set next order to the current last element in list
    const lastOrderElement = this.tail;
    element.setPrevious(lastOrderElement);
    lastOrderElement.setNext(element);
    this.tail = element;

    // save this new element
    this.mapOfOrderIdAndOrderLinkedListElement[element.order._id] = element;

    return true;
  }

  removeElement(element) {
    if (this.isHead(element)) {
      // this order is head -> let its next be head
      //logger.info(`ordermap.js: removeOrder(): this is head`);
      const nextLinkedListElement = element.next;
      nextLinkedListElement.setPrevious(null);
      this.head = nextLinkedListElement;
    }
    else if (this.isTail(element)) {
      // this order is tail -> let its previous be tail
      //logger.info(`ordermap.js: removeOrder(): this is tail`);
      const previousOrderLinkedListElement = element.previous;
      previousOrderLinkedListElement.setNext(null);
      this.tail = previousOrderLinkedListElement;
    }
    else {
      // this order in the middle -> connect previous to next
      //logger.info(`ordermap.js: removeOrder(): this is middle`);
      const previousElement = element.previous;
      const nextElement = element.next;

      previousElement.setNext(nextElement);
      nextElement.setPrevious(previousElement);
    }

    // remove this linkedListOrderElement
    delete this.mapOfOrderIdAndOrderLinkedListElement[element.order._id];
    return true;
  }

  getElementByOrderId(orderId) {
    return this.mapOfOrderIdAndOrderLinkedListElement[orderId];
  }

  hasOnlyOneElement() {
    return this.head === this.tail;
  }

  isHead(element) {
    return this.head === element;
  }

  isTail(element) {
    return this.tail === element;
  }
}

module.exports = class OrderMap {
  constructor() {
    // save price level to get min, max
    this.priceLevelSet = new SortedSet();

    // <price level> : OrderLinkedList
    this.mapOfPriceAndOrderLinkedList = {};
  }

  // only for testing
  // return the current state of order map in type of JSON object
  /*
  return object = [
    {
      price: price level 0,
      orders: [order 0, order 1, ... oder n]
    },
    ...
  ]
  */
  getState() {
    const priceLevel = this.priceLevelSet.toArray();
    const result = [];
    for (let i = 0; i < priceLevel.length; i += 1) {
      const order = [];
      const tmpList = this.mapOfPriceAndOrderLinkedList[priceLevel[i]];
      let tmpElement = tmpList.head;
      while (tmpElement) {
        order.push(tmpElement.order);
        tmpElement = tmpElement.next;
      }
      const newItem = {
        price: priceLevel[i],
        orders: order
      };
      result.push(newItem);
    }
    return result;
  }

  addOrder(order) {
    const priceLevel = order.limitPrice;
    const newLinkedListOrderElement = new OrderLinkedListElement(order);

    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[priceLevel];
    if (orderLinkedList) {
      if (orderLinkedList.appendElement(newLinkedListOrderElement)) return true;
      logger.error(`ordermap.js: addOrder(): ERROR: this order._id ${order._id} already exists`);
      return false;
    }
    else {
      // new OrderLinkedList
      this.mapOfPriceAndOrderLinkedList[priceLevel] = new OrderLinkedList(newLinkedListOrderElement);

      // add this price level
      this.priceLevelSet.push(priceLevel);
    }

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
    if (orderLinkedList) return orderLinkedList.head;
    return null;
  }

  getLastElementOfPriceLevel(price) {
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[price];
    if (orderLinkedList) return orderLinkedList.tail;
    return null;
  }

  getElementByOrder(order){
    // get linked list of this price level
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[order.limitPrice];
    if (!orderLinkedList) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: getElementByOrder(): ERROR: not found orderLinkedList for this price level ${orderToRemove.limitPrice}`);
      return null;
    }
    // get orderElement of this order
    const orderLinkedListElement = orderLinkedList.getElementByOrderId(order._id);
    if (!orderLinkedListElement) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: getElementByOrder(): ERROR: not found this order._id ${order._id}`);
      return null;
    }
    return orderLinkedListElement;
  }

  removeOrder(orderToRemove) {
    // get linked list of this price level
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[orderToRemove.limitPrice];
    if (!orderLinkedList) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: removeOrder(): ERROR: not found orderLinkedList for this price level ${orderToRemove.limitPrice}`);
      return false;
    }

    // get orderElement of this order
    const orderLinkedListElementToRemove = orderLinkedList.getElementByOrderId(orderToRemove._id);
    if (!orderLinkedListElementToRemove) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: removeOrder(): ERROR: not found this order._id ${orderToRemove._id}`);
      return false;
    }

    if (orderLinkedList.hasOnlyOneElement()) {
      // only this order at this price level -> delete this price level
      //logger.info(`ordermap.js: removeOrder(): only one element`);
      delete this.mapOfPriceAndOrderLinkedList[orderToRemove.limitPrice];
      this.priceLevelSet.delete(orderToRemove.limitPrice);
    }
    else {
      orderLinkedList.removeElement(orderLinkedListElementToRemove);
    }

    return true;
  }

  updateOrderQuantity(order) {
    // get linked list of this price level
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[order.limitPrice];
    if (!orderLinkedList) {
      logger.error(`ordermap.js: updateOrderQuantity(): ERROR: not found price level ${order.limitPrice} to update`);
      return false;
    }

    // just update it
    const orderLinkedListElement = orderLinkedList.mapOfOrderIdAndOrderLinkedListElement[order._id];
    if (!orderLinkedListElement) {
      logger.error(`ordermap.js: updateOrderQuantity(): ERROR: not found order ID ${order._id} to update`);
      return false; // not found
    }

    orderLinkedListElement.order.quantity = order.quantity;
    return true;
  }
};

