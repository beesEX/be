const db = require('../../db');
const schema = require('./user.schema');

const constants = require('../../app.constants');

const service = db.createService(constants.DATABASE_DOCUMENTS.USERS, schema);
const securityUtil = require('../../security.util');

// enable id auto casting
service._collection.options.castIds = true;

service.updatePassword = async (_id, newPassword) => {
  const salt = await securityUtil.generateSalt();
  const hash = await securityUtil.getHash(newPassword, salt);

  return service.update(
    {
      _id,
    },
    (doc) => {
      const userDoc = doc;
      userDoc.password = hash;
    },
  );
};

service.updateInfo = (_id, { email, name }) => {
  return service.update(
    {
      _id,
    },
    (doc) => {
      const userDoc = doc;
      userDoc._id = _id;
      userDoc.email = email;
      userDoc.name = name;
    },
  );
};

module.exports = service;
