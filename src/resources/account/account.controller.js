const validators = require('./validators');

const authService = require('auth.service');

/**
 * Sign in user
 * Loads user by email and compare password hashes
 */
exports.signin = async (ctx, next) => {
  const result = await validators.signin.validate(ctx);
  ctx.assert(!result.errors, 400);

  const token = authService.createAuthToken({ userId: result._id });

  ctx.body = {
    user: result,
    token,
  };
};
