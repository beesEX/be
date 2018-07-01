const db = require('db');
const schema = require('./order.schema');
const constants = require('app.constants');
const service = db.createService(constants.DATABASE_DOCUMENTS.ORDERS, schema);

// enable id auto casting
service._collection.options.castIds = true;

service.updateStatus = async (_id, newStatus) => {

};

service.palceOrder = async (newOrder) => {

};