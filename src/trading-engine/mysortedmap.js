/*
* Created by Viet Anh Ho
*
* Define a new sorted map:
* - All keys are sorted in sorted array
* - All key-value pairs is stored in a object
* - All values in type array
* - If value array is empty, delete this key automatically
*
* Some needed methods:
* - addAtEnd(key, value): add a value to the end of value array of a key (create new one if needed), if value is array -> concat
*
* - getFirstKey()       : return the first key
* - getLastKey()        : return the last key
*
* - getFirstValue()     : return array values of the first key
* - getLastValue()      : return array values of the last key
*
* - getValue(key)       : return array values of key
*
* - getFirstKeyValue()  : return a object {'key': first key, 'value': array value of first key}
* - getLastKeyValue()   : return a object {'key': last key, 'value': array value of last key}
*
* - set(key, value)     : set value for a key, if value is not array type -> set [value] instead
*
* - removeKey(key)      : remove a key of map
* - removeValue(key, beginIndex=1, length=1)                   : remove <length>-elements from <beginIndex>-element of array value of this <key>-key, if <length> < 0 -> remove from right to left (check also validation of value array length)
* - removeValueAndAddAtEnd(key, value, beginIndex=1, length=1) : execute removeValues() then addAtEnd
*/

//const SortedMap = require('collections/sorted-map');
// src: http://www.collectionsjs.com/sorted-map

const SortedArray = require('collections/sorted-array');
// src: http://www.collectionsjs.com/sorted-array

module.exports = class MySortedMap {
  constructor() {
    this.keyArr = new SortedArray();
    this.valMap = {};
  }

  /**
   add value to the end of value array of a key
   @param value: value to add
   @param key:
   @return array of values for this key
   */
  addAtEnd(key, value) {
    const values = this.getValue(key);
    if (values) {
      if (Array.isArray(value)) {
        this.set(key, values.concat(value));
      }
      else {
        values.push(value);
        this.set(key, values);
      }
    }
    else {
      this.set(key, value);
    }
  }

  getFirstKey() {
    return this.keyArr.min();
  }

  getLastKey() {
    return this.keyArr.max();
  }

  getFirstValue() {
    return this.valMap[this.getFirstKey()];
  }

  getLastValue() {
    return this.valMap[this.getLastKey()];
  }

  getValue(key) {
    return this.valMap[key];
  }

  getFirstKeyValue() {
    const key = this.keyArr.min();
    return {
      key: key,
      value: this.valMap[key],
    };
  }

  getLastKeyValue() {
    const key = this.keyArr.max();
    return {
      key: key,
      value: this.valMap[key],
    };
  }

  /**
   * Set value for key
   *
   * */
  set(key, value) {
    if (Array.isArray(value)) {
      //console.log('value is array');
      if (value.length === 0) this.removeKey(key);
      else {
        if (!this.keyArr.has(key)) this.keyArr.push(key);
        this.valMap[key] = value;
      }
    }
    else if (value) {
      //console.log('value is defined');
      if (!this.keyArr.has(key)) this.keyArr.push(key);
      this.valMap[key] = [value];
    }
    else {
      this.removeKey(key);
    }
  }

  removeKey(key) {
    this.keyArr.delete(key);
    delete this.valMap[key];
  }

  // by default: remove the first element
  removeValue(key, beginIndex = 0, length = 1) {
    if (beginIndex < 0 || length === 0) return;

    const values = this.getValue(key);

    if (values && Array.isArray(values) && values.length > 0 && beginIndex < values.length) {
      let beginIdx;
      let endIdx;

      if (length > 0) {
        beginIdx = beginIndex;
        endIdx = Math.min(values.length - 1, beginIndex + length - 1);
      }
      else {
        beginIdx = Math.max(0, beginIndex + length + 1);
        endIdx = beginIndex;
      }

      let newValues = [];
      if (beginIdx !== 0 || endIdx !== values.length - 1) {
        newValues = values.splice(beginIdx, endIdx - beginIdx + 1);
      }

      if (newValues.length > 0) this.set(key, newValues);
      else this.removeKey(key);
    }
  }

  removeValueAndAddAtEnd(key, value, beginIndex = 0, length = 1) {
    if (beginIndex < 0 || length === 0) return;

    const values = this.getValue(key);

    if (values && values.length > 0 && beginIndex < values.length) {
      let beginIdx;
      let endIdx;

      if (length > 0) {
        beginIdx = beginIndex;
        endIdx = Math.min(values.length - 1, beginIndex + length - 1);
      }
      else {
        beginIdx = Math.max(0, beginIndex + length + 1);
        endIdx = beginIndex;
      }

      let newValues = [];
      if (beginIdx !== 0 || endIdx !== values.length - 1){
        newValues = values.splice(beginIdx, endIdx - beginIdx + 1);
      }

      // add new value
      if (Array.isArray(value)) {
        newValues = newValues.concat(value);
      }
      else if (value) {
        newValues.push(value);
      }

      this.set(key, newValues);
    }
  }
};

