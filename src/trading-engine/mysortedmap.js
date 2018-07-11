/*
* Created by Viet Anh Ho
*
* Define a new sorted map:
* - All keys are sorted, duplicate values are acceptable
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
* - getKeys()           : return array of keys
* - getValues()         : return array of values (2D matrix)
*
* - set(key, value)     : set value for a key, if value is not array type -> set [value] instead
*
* - removeKey(key)      : remove a key of map
* - removeValue(key, beginIndex=1, length=1)                   : remove <length>-elements from <beginIndex>-element of array value of this <key>-key, if <length> < 0 -> remove from right to left (check also validation of value array length)
* - removeValueAndAddAtEnd(key, value, beginIndex=1, length=1) : execute removeValues() then addAtEnd
*/

const SortedMap = require('collections/sorted-map');
// src: http://www.collectionsjs.com/sorted-map

module.exports = class MySortedMap {
  constructor() {
    this.map = new SortedMap();
  }

  /**
   add value to the end of value array of a key
   @param value: value to add
   @param key:
   @return array of values for this key
   */
  addAtEnd(key, value) {
    if (Array.isArray(value)) {
      this.set(key, this.getValue(key).concat(value));
    }
    else {
      this.set(key, this.getValue(key).push(value));
    }
  }

  getFirstKey() {
    const keys = this.getKeys();
    if (keys && keys.length > 0) return keys[0];
    return null;
  }

  getLastKey() {
    const keys = this.getKeys();
    if (keys && keys.length > 0) return keys[keys.length - 1];
    return null;
  }

  getFirstValue() {
    const keys = this.getKeys();
    if (keys && keys.length > 0) return this.getValue(keys[0]);
    return null;
  }

  getLastValue() {
    const keys = this.getKeys();
    if (keys && keys.length > 0) return this.getValue(keys[keys.length - 1]);
    return null;
  }

  getValue(key) {
    return this.map.get(key);
  }

  getFirstKeyValue() {
    const keys = this.getKeys();
    if (keys && keys.length > 0) {
      const values = this.getValue(keys[0]);
      if (values && values.length > 0) {
        return {
          key: keys[0],
          value: values,
        };
      }
    }
    return null;
  }

  getLastKeyValue() {
    const keys = this.getKeys();
    if (keys && keys.length > 0) {
      const values = this.getValue(keys[keys.length - 1]);
      if (values && values.length > 0) {
        return {
          key: keys[keys.length - 1],
          value: values,
        };
      }
    }
    return null;
  }

  getKeys() {
    return this.map.keys();
  }

  getValues() {
    return this.map.values();
  }

  /**
   * Set value for key
   *
   * */

  set(key, value) {
    if (Array.isArray(value)) {
      if (value.length === 0) this.removeKey(key);
      else this.map.set(key, value);
    }
    else if (value) {
      this.map.set(key, [value]);
    }
    else {
      // TODO: QUESTION: There is no method to remove key???
      this.map.set(key, null);
    }
  }

  removeKey(key) {
    this.set(key, null);
  }

  removeValue(key, beginIndex = 0, length = 1) {
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

    if (values && values.length > 0 && beginIndex < values.length){

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
        if (newValues.length === 0) newValues = value;
        else newValues = newValues.concat(value);
      }
      else if (newValues.length === 0) newValues = [value];
      else newValues.push(value);

      this.set(key, newValues);
    }
  }
};

