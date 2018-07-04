const Joi = require('joi');
const { CURRENCY_SYMBOLS } = require('app.constants');

const orderSchema = {
  _id: Joi.string(),
  type: Joi.string().allow(['LIMIT', 'MARKET', 'STOP']).required(),
  side: Joi.string().allow(['BUY', 'SELL']).required(),
  currency: Joi.string().allow(CURRENCY_SYMBOLS).required(),
  baseCurrency: Joi.string().allow(CURRENCY_SYMBOLS).required(),
  limitPrice: Joi.number().positive(),
  quantity: Joi.number().positive().required(),
  filledQuantity: Joi.number().min(0),
  status: Joi.string().allow(['PLACED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'EXPIRED']),
  createdAt: Joi.date(),
  lastUpdatedAt: Joi.date(),
  userId: Joi.string()
};

const ORDER_STATUS = {
  PLACED: 'PLACED',
  CANCELED: 'CANCELED',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  EXPIRED: 'EXPIRED',
};

module.exports = {
  schema: obj => Joi.validate(obj, orderSchema, { allowUnknown: true }),
  ORDER_STATUS,
};
