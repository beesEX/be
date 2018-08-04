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
  }

  hasOnlyOneElement() {
    if (this.head === this.tail) {
      return true;
    }

    return false;
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

    // save linkedListOrderElement via matching id
    this.mapOfOrderIdAndOrderLinkedListElement = {};

    // <price level> : OrderLinkedList
    this.mapOfPriceAndOrderLinkedList = {};
  }

  // only for testing
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
    // check if this order already exists or not
    if (this.mapOfOrderIdAndOrderLinkedListElement[order._id]) {
      logger.error(`ordermap.js: addOrder(): ERROR: this order._id ${order._id} already existed`);
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
      // new OrderLinkedList
      this.mapOfPriceAndOrderLinkedList[priceLevel] = new OrderLinkedList(newLinkedListOrderElement);

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
      return null;
    }
    return null;
  }

  getLastElementOfPriceLevel(price) {
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[price];
    if (orderLinkedList) {
      const order = orderLinkedList.tail;
      if (order) {
        return order;
      }
      return null;
    }
    return null;
  }

  removeOrder(orderToRemove) {
    // first get orderElement of this order
    const orderLinkedListElementToRemove = this.mapOfOrderIdAndOrderLinkedListElement[orderToRemove._id];
    if (!orderLinkedListElementToRemove) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: removeOrder(): ERROR: not found this order._id ${orderToRemove._id}`);
      //return false;
    }

    // check if this order is head or tail of array
    const priceLevel = orderLinkedListElementToRemove.order.limitPrice;
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[priceLevel];
    if (!orderLinkedList) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: removeOrder(): ERROR: not found orderLinkedList for this price level ${priceLevel}`);
      return false;
    }
    else if (orderLinkedList.hasOnlyOneElement()) {
      // only this order at this price level -> delete this price level
      //logger.info(`ordermap.js: removeOrder(): only one element`);
      delete this.mapOfPriceAndOrderLinkedList[priceLevel];
      this.priceLevelSet.delete(priceLevel);
    }
    else if (orderLinkedList.isHead(orderLinkedListElementToRemove)) {
      // this order is head -> let its next be head
      //logger.info(`ordermap.js: removeOrder(): this is head`);
      const nextLinkedListElement = orderLinkedListElementToRemove.next;
      nextLinkedListElement.setPrevious(null);
      orderLinkedList.head = nextLinkedListElement;
    }
    else if (orderLinkedList.isTail(orderLinkedListElementToRemove)) {
      // this order is tai -> let its previous be tail
      //logger.info(`ordermap.js: removeOrder(): this is tail`);
      const previousOrderLinkedListElement = orderLinkedListElementToRemove.previous;
      previousOrderLinkedListElement.setNext(null);
      orderLinkedList.tail = previousOrderLinkedListElement;
    }
    else {
      // this order in the middle -> connect previous to next
      //logger.info(`ordermap.js: removeOrder(): this is middle`);
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
    logger.error(`ordermap.js: updateOrderQuantity(): ERROR: not found old order ID ${order._id} to update -> add new`);
    return false;
  }
};

