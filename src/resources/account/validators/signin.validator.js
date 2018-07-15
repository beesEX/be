const Joi = require('joi');

const bcrypt = require('bcrypt');

const baseValidator = require('resources/base.validator');

const userService = require('resources/user/user.service');

const incorrectCredentials = 'Incorrect email or password.';

const { logger } = global;

const schema = {
  email: Joi.string()
    .email({ minDomainAtoms: 2 })
    .trim()
    .lowercase()
    .options({
      language: {
        string: { email: '!!Please enter a valid email address' },
        any: { empty: '!!Email is required' },
      },
    }),
  password: Joi.string()
    .trim()
    .min(6)
    .max(40)
    .options({
      language: {
        string: {
          min: `!!${incorrectCredentials}`,
          max: `!!${incorrectCredentials}`,
        },
        any: { empty: '!!Password is required' },
      },
    }),
};

exports.validate = ctx =>
  baseValidator(ctx, schema, async (signinData) => {
    const user = await userService.findOne({ email: signinData.email });
    logger.debug(`signin validator tries to find user with email=${signinData.email}, found: ${JSON.stringify(user)}`);
    if (!user) {
      ctx.errors.push({ credentials: incorrectCredentials });
      return false;
    }

    const isPasswordMatch = await bcrypt.compare(signinData.password, user.password);

    if (!isPasswordMatch) {
      ctx.errors.push({ credentials: incorrectCredentials });
      return false;
    }

    logger.info(isPasswordMatch);
    logger.info(`signing-in user with email=${signinData.email} found: ${JSON.stringify(user)}`);
    return user;
    // const isPasswordMatch = await securityUtil.compareTextWithHash(
    //   signinData.password,
    //   user.passwordHash,
    //   user.passwordSalt,
    // );
    //
    // if (!isPasswordMatch) {
    //   ctx.errors.push({ credentials: incorrectCredentials });
    //   return false;
    // }
    //
    // if (!user.isEmailVerified) {
    //   ctx.errors.push({ email: 'Please verify your email to sign in' });
    //   return false;
    // }
  });
