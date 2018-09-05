/*
* Created by Viet Anh Ho
*
* Define a new order map:
* - All price levels are sorted in sorted set
* - For each price level there is a array to save the first and the last order ID
* - Each order ID will match with a LinkedListOrderElement (LLOE)
* - Each LLOE will contain order object and link to the previous and next LLOE
*/
const logger = require('../logger');

const SortedSet = require('collections/sorted-set');

// TODO: need to rebuild order map or a part of order map base on error status
const STATUS = {
  SUCCESS: 'SUCCESS',
  ORDER_ID_EXISTED: 'ORDER_ID_EXISTED',
  NOT_FOUND_ORDER_ID: 'NOT_FOUND_ORDER_ID',
  NOT_FOUND_HEAD: 'NOT_FOUND_HEAD',
  NOT_FOUND_TAIL: 'NOT_FOUND_TAIL',
  NOT_FOUND_NEXT: 'NOT_FOUND_NEXT',
  NOT_FOUND_PREVIOUS: 'NOT_FOUND_PREVIOUS',
  UNEXPECTED_NULL: 'UNEXPECTED_NULL',
  UNEXPECTED_TYPE: 'UNEXPECTED_TYPE',
};

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
    this.head = null;
    this.tail = null;
    this.mapOfOrderIdAndOrderLinkedListElement = {};

    const status = this.isLinkedListElement(element);
    if (status === STATUS.SUCCESS) {
      this.head = element;
      this.tail = this.head;
      // save linkedListOrderElement via matching id
      this.mapOfOrderIdAndOrderLinkedListElement[element.order._id] = element;
    }
  }

  isLinkedListElement(element) {
    if (!(element instanceof OrderLinkedListElement)) return STATUS.UNEXPECTED_TYPE;
    if (!element || !element.order || typeof element.order._id === 'undefined' || element.order._id === null) return STATUS.UNEXPECTED_NULL;
    return STATUS.SUCCESS;
  }

  appendElement(element) {
    const status = this.isLinkedListElement(element);
    if (status !== STATUS.SUCCESS) return status;

    // check if this element already exists
    if (this.mapOfOrderIdAndOrderLinkedListElement[element.order._id]) return STATUS.ORDER_ID_EXISTED;

    // link this new element to the end of linked list
    // set next order to the current last element in list
    const lastOrderElement = this.tail;
    if (!lastOrderElement) return STATUS.NOT_FOUND_TAIL;

    element.setPrevious(lastOrderElement);
    lastOrderElement.setNext(element);
    this.tail = element;

    // save this new element
    this.mapOfOrderIdAndOrderLinkedListElement[element.order._id] = element;

    return STATUS.SUCCESS;
  }

  removeElement(element) {
    const status = this.isLinkedListElement(element);
    if (status !== STATUS.SUCCESS) return status;

    if (!this.mapOfOrderIdAndOrderLinkedListElement[element.order._id]) return STATUS.NOT_FOUND_ORDER_ID;

    if (this.isHead(element)) {
      // this order is head -> let its next be head
      const nextElement = element.next;
      if (!nextElement) return STATUS.NOT_FOUND_NEXT;

      nextElement.setPrevious(null);
      this.head = nextElement;
    }
    else if (this.isTail(element)) {
      // this order is tail -> let its previous be tail
      const previousElement = element.previous;
      if (!previousElement) return STATUS.NOT_FOUND_PREVIOUS;

      previousElement.setNext(null);
      this.tail = previousElement;
    }
    else {
      // this order in the middle -> connect previous to next
      const previousElement = element.previous;
      if (!previousElement) return STATUS.NOT_FOUND_PREVIOUS;

      const nextElement = element.next;
      if (!nextElement) return STATUS.NOT_FOUND_NEXT;

      previousElement.setNext(nextElement);
      nextElement.setPrevious(previousElement);
    }

    // remove this linkedListOrderElement
    delete this.mapOfOrderIdAndOrderLinkedListElement[element.order._id];
    return STATUS.SUCCESS;
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
      const status = orderLinkedList.appendElement(newLinkedListOrderElement);
      if (status !== STATUS.SUCCESS) {
        logger.error(`ordermap.js: addOrder(): ERROR: ${status}`);
        return false;
      }
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

  getOrderByLimitPriceAndOrderId(limitPrice, orderId) {
    // get linked list of this price level
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[limitPrice];
    if (!orderLinkedList) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: getElementByOrder(): ERROR: not found orderLinkedList for this price level ${limitPrice}`);
      return null;
    }
    // get orderElement of this order
    const orderLinkedListElement = orderLinkedList.getElementByOrderId(orderId);
    if (!orderLinkedListElement) {
      // this order is not in this orderMap
      logger.error(`ordermap.js: getElementByOrder(): ERROR: not found this order._id ${orderId}`);
      return null;
    }
    return orderLinkedListElement.order;
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
      const status = orderLinkedList.removeElement(orderLinkedListElementToRemove);
      if (status !== STATUS.SUCCESS) {
        logger.error(`ordermap.js: removeOrder(): ERROR: ${status}`);
        return false;
      }
    }

    return true;
  }

  /**
   * @param order: order object containing new quantity
   * @return: updated order object if succeed, null if failed
   * */
  updateOrderQuantity(order) {
    // get linked list of this price level
    const orderLinkedList = this.mapOfPriceAndOrderLinkedList[order.limitPrice];
    if (!orderLinkedList) {
      logger.error(`ordermap.js: updateOrderQuantity(): ERROR: not found price level ${order.limitPrice} to update`);
      return null;
    }

    // just update it
    const orderLinkedListElement = orderLinkedList.mapOfOrderIdAndOrderLinkedListElement[order._id];
    if (!orderLinkedListElement) {
      logger.error(`ordermap.js: updateOrderQuantity(): ERROR: not found order ID ${order._id} to update`);
      return null; // not found
    }

    // update new quantity
    orderLinkedListElement.order.quantity = order.quantity;

    // check remaining quantity: if remaining quantity = 0 -> remove this order on book
    if (orderLinkedListElement.order.quantity === orderLinkedListElement.order.filledQuantity) {
      if (orderLinkedList.hasOnlyOneElement()) {
        // only this order at this price level -> delete this price level
        this.priceLevelSet.delete(orderLinkedListElement.order.limitPrice);
        delete this.mapOfPriceAndOrderLinkedList[orderLinkedListElement.order.limitPrice];
      }
      else {
        const status = orderLinkedList.removeElement(orderLinkedListElement);
        if (status !== STATUS.SUCCESS) {
          logger.error(`ordermap.js: removeOrder(): ERROR: ${status}`);
          return null;
        }
      }
    }

    return orderLinkedListElement.order;
  }
};

