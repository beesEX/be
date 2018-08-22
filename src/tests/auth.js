exports.signin = (request, user, password = 'qwertz') => {
  return new Promise((resolve, reject) => {
    request
      .post('/account/signin')
      .send({
        email: user.email,
        password,
      })
      .end((err, res) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(res.body.token);
      });
  });
};
