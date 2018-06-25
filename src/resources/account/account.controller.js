const validators = require('./validators');

const authService = require('auth.service');

/**
 * Sign in user
 * Loads user by email and compare password hashes
 */
exports.signin = async (ctx, next) => {
  const result = await validators.signin.validate(ctx);
  ctx.assert(!result.errors, 400);

  const { value: signinData } = result;

  const token = authService.createAuthToken({ userId: signinData.userId });

  ctx.body = {

    token,

  };
};
