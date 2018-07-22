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

class LinkedListOrderElement {
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

module.exports = class OrderMap {
  constructor() {
    // save price level to get min, max
    this.priceLevelSet = new SortedSet();

    // save linkedListOrderElement via matching id
    this.orderIdMap = {};

    // <price level> : [<first order id>, <last order id>]
    this.priceLvMap = {};
  }

  addOrder(order) {
    // check if this order already exists or not
    if (this.orderIdMap[order._id]) {
      console.log('ordermap.js: addOrder(): ERROR: this order._id already existed');
      return false;
    }

    const priceLevel = order.limitPrice;
    const newLinkedListOrderElement = new LinkedListOrderElement(order);

    const orderArray = this.priceLvMap[priceLevel];
    if (orderArray) {
      // link this new element to the end of linked list
      // set next order to the current last element in list
      const lastOrderElement = this.orderIdMap[orderArray[orderArray.length - 1]];
      newLinkedListOrderElement.setPrevious(lastOrderElement);
      lastOrderElement.setNext(newLinkedListOrderElement);

      // change the last order Id in array if array has more than 1 element
      if (orderArray.length > 1) orderArray[orderArray.length - 1] = order._id;
      else orderArray.push(order._id);
    }
    else {
      // new array
      // add to array of price level
      this.priceLvMap[priceLevel] = [order._id];

      // add this price level
      this.priceLevelSet.push(priceLevel);
    }

    // save this new element
    this.orderIdMap[order._id] = newLinkedListOrderElement;

    return true;
  }

  getMinPriceLevel() {
    return this.priceLevelSet.min();
  }

  getMaxPriceLevel() {
    return this.priceLevelSet.max();
  }

  getFirstElementOfPriceLevel(price) {
    const array = this.priceLvMap[price];
    if (array) {
      const orderId = array[0];
      const LLOE = this.orderIdMap[orderId];
      if (LLOE) {
        return LLOE;
      }
      // console.log('ordermap.js: getFirstElementOfPriceLevel(): WARNING: not found order for this order id', orderId);
      return null;
    }
    // console.log('ordermap.js: getFirstElementOfPriceLevel(): WARNING: not found price level', price);
    return null;
  }

  getLastElementOfPriceLevel(price) {
    const array = this.priceLvMap[price];
    if (array) {
      const orderId = array[array.length - 1];
      const LLOE = this.orderIdMap[orderId];
      if (LLOE) {
        return LLOE;
      }
      // console.log('ordermap.js: getLastElementOfPriceLevel(): WARNING: not found order for this order id', orderId);
      return null;
    }
    // console.log('ordermap.js: getLastElementOfPriceLevel(): WARNING: not found price level');
    return null;
  }

  removeOrder(order) {
    // first get orderElement of this order
    const linkedListOrderElement = this.orderIdMap[order._id];
    if (!linkedListOrderElement) {
      // this order is not in this orderMap
      console.log('ordermap.js: removeOrder(): ERROR: not found this order._id', order._id);
      return false;
    }

    // check if this order is head or tail of array
    const priceLevel = linkedListOrderElement.order.limitPrice;
    const IdArray = this.priceLvMap[priceLevel];
    if (!IdArray) {
      // this order is not in this orderMap
      console.log('ordermap.js: removeOrder(): ERROR: not found array for this price level', priceLevel);
      return false;
    }
    else if (IdArray.length === 1) {
      // only this order at this price level
      // delete this price level
      delete this.priceLvMap[priceLevel];
      this.priceLevelSet.delete(priceLevel);
    }
    else if (IdArray[0] === order._id) {
      // this order is head
      // let its next be head
      const nextElement = linkedListOrderElement.next;
      nextElement.setPrevious(null);

      // change also in array
      // check if nextElement is tail
      if (nextElement.order._id === IdArray[IdArray.length - 1]) {
        // it is -> remove first element in IdArray
        IdArray.splice(0, 1);
      }
    }
    else if (IdArray[IdArray.length - 1] === order._id) {
      // this order is tail
      // let its previous be tail
      const previousElement = linkedListOrderElement.previous;
      previousElement.setNext(null);

      // change also in array
      // check if previousElement is head
      if (previousElement.order._id === IdArray[0]) {
        // it is -> remove last element in IdArray
        IdArray.splice(1, 1);
      }
    }
    else {
      // this order in the middle
      // connect previous to next
      const previousElement = linkedListOrderElement.previous;
      const nextElement = linkedListOrderElement.next;

      previousElement.setNext(nextElement);
      nextElement.setPrevious(previousElement);
    }

    // remove this linkedListOrderElement
    delete this.orderIdMap[order._id];

    return true;
  }

  updateOrderQuantity(order) {
    // just update it
    const linkedListOrderElement = this.orderIdMap[order._id];
    if (linkedListOrderElement) {
      linkedListOrderElement.order.quantity = order.quantity;
      return true;
    }
    console.log('ordermap.js: updateOrderQuantity(): ERROR: not found old order ID', order._id, 'to update -> add new');
    return false;
  }
};

