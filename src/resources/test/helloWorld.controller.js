/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

exports.generateHandler = () => {

    let count = 0;

    return async (ctx, next) => {

        ctx.body = {

            message: 'Hello World ' + count

        }

        ++count;
    }
}