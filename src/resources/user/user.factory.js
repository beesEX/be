const Builder = require('./user.builder');

exports.verifiedUser = async () => {
  const builder = new Builder();
  const user = await builder.build();

  return user;
};
