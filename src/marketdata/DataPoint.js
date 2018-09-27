/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

class DataPoint {

  constructor(startTime, open) {

    this.open = open;

    this.close = open;

    this.high = open;

    this.low = open;

    this.volume = 0;

    this.startTime = startTime;

  }

  updateHigh(newValue) {

    if(newValue > this.high) {

      this.high = newValue;

    }

  }

  updateLow(newValue) {

    if(newValue < this.low) {

      this.low = newValue;

    }

  }

  update(newPrice, quantity) {

    this.close = newPrice;

    this.updateHigh(newPrice);

    this.updateLow(newPrice);

    this.volume += quantity;

  }

  toJSON() {

    return {

      open: this.open,

      close: this.close,

      high: this.high,

      low: this.low,

      volume: this.volume,

      time: this.startTime

    };

  }

}

module.exports = DataPoint;