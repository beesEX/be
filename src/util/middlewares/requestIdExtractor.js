/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

const requestNamespace = require('../../config/requestNamespace');

async function generateUUIDForRequest(ctx, next) {

  const requestId = ctx.headers['x-request-id'];

  if(requestId) {

    requestNamespace.set('requestId', requestId);

  }

  await next();

}

module.exports = requestNamespace.bind(generateUUIDForRequest);
