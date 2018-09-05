const Joi = require('joi');
const { CURRENCY_SYMBOLS } = require('../app.constants');

const MAKER_SIDE = {
  SELL: 'SELL',
  BUY: 'BUY'
};

const tradeSchema = {
  _id: Joi.string(),
  currency: Joi.string().allow(CURRENCY_SYMBOLS).required(),
  baseCurrency: Joi.string().allow(CURRENCY_SYMBOLS).required(),
  price: Joi.number().positive(),
  quantity: Joi.number().positive().required(),
  makerSide: Joi.string().allow(MAKER_SIDE),
  buyerFeePercent: Joi.number().min(0),
  buyerFeeCharged: Joi.number().min(0),
  sellerFeePercent: Joi.number().min(0),
  sellerFeeCharged: Joi.number().min(0),
  createdAt: Joi.date(),
  executedAt: Joi.date(),
  buyOrderId: Joi.string().required(),
  sellOrderId: Joi.string().required()
};

module.exports = {
  schema: obj => Joi.validate(obj, tradeSchema, { allowUnknown: true }),
  MAKER_SIDE,
};
