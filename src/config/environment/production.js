module.exports = {
  mongo: {
    connection: 'mongodb://192.168.0.25:27017/beesEX',
  },
  jwt: {
    secret: 'the_secret',
  },
  authCookieName: 'auth',
  zeroMQHost: 'tcp://127.0.0.1:42000'
};