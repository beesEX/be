const config = require('config');
const db = require('@paralect/node-mongo').connect(config.mongo.connection);
const Mongoose = require('mongoose');

db.setServiceMethod('findById', (service, id) => {
  return service.findOne({ _id: Mongoose.Types.ObjectId(id) });

  // bug
  // return service.findOne({ _id: id });
});

module.exports = db;
