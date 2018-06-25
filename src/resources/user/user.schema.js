const Joi = require('joi');

const userProfileSchema = {
  name: Joi.string().allow(null),
  gender: Joi.string().allow(null),
  location: Joi.string().allow(null),
  website: Joi.string().allow(null),
};

const userSchema = {
  _id: Joi.string(),
  email: Joi.string().email({ minDomainAtoms: 2 }),
  password: Joi.string(),
  passwordResetToken: Joi.string()
    .allow(null)
    .default(null),
  passwordResetExpires: Joi.date()
    .allow(null)
    .default(null),
  profile: userProfileSchema,
  createdAt: Joi.date(),
};

module.exports = obj => Joi.validate(obj, userSchema, { allowUnknown: true });
