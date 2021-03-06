const Joi = require('joi');
const { CURRENCY_SYMBOLS } = require('../app.constants');

const schema = {
  _id: Joi.string(),
  currency: Joi.string().allow(CURRENCY_SYMBOLS).required(),
  total: Joi.number().min(0).required(),
  available: Joi.number().min(0).required(),
  createdAt: Joi.date(),
  lastUpdatedAt: Joi.date(),
  userId: Joi.string().required()
};

module.exports = obj => Joi.validate(obj, schema, { allowUnknown: true });
