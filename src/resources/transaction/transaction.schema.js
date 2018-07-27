const Joi = require('joi');
const { CURRENCY_SYMBOLS } = require('app.constants');

const TRANSACTION_TYPE = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  BUY: 'BUY',
  SELL: 'SELL',
  LOCKED: 'LOCKED',
  RELEASED: 'RELEASED'
};

const schema = {
  _id: Joi.string(),
  currency: Joi.string().allow(CURRENCY_SYMBOLS).required(),
  type: Joi.string().allow(Object.values(TRANSACTION_TYPE)).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(255),
  fromWallet: Joi.string(),
  toWallet: Joi.string(),
  createdAt: Joi.date(),
  tradeId: Joi.string(),
  userId: Joi.string().required()
};

module.exports = {
  schema: obj => Joi.validate(obj, schema, { allowUnknown: true }),
  TRANSACTION_TYPE
};
