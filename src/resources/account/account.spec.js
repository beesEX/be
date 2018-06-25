const server = require('../../app');

const db = require('db');
const chai = require('chai');
const constants = require('app.constants');

const request = require('supertest').agent(server.listen());

const userFactory = require('resources/user/user.factory');

chai.should();

// TODO:
// 1. discuss how to add signin success test as it is not possible
// with current test structure (password and signuptoken are encapsulated)
// 2. How to test environment dependent code (see _signupToken from account.controller)
const incorrectCredentialsMessage = 'Incorrect email or password.';

describe('/account', () => {
  let user;
  let newUserData;

  before(async () => {
    await db.get(constants.DATABASE_DOCUMENTS.USERS).drop();

    user = await userFactory.verifiedUser();

    newUserData = {
      name: 'Ivan Balalaikin',
      email: 'test@test.test',
      password: 'qwerty',
    };
  });

  it('should return an error if email is not registered', (done) => {
    request
      .post('/account/signin')
      .send({
        email: 'test@test.com1',
        password: 'incorrect_password',
      })
      .expect(400)
      .expect(({ body }) => {
        const { errors } = body;
        errors[0].credentials.should.be.equal(incorrectCredentialsMessage);
      })
      .end(done);
  });

  it('should return an error that the password is too short', (done) => {
    request
      .post('/account/signin')
      .send({
        email: newUserData.email,
        password: '1111',
      })
      .expect(400)
      .expect(({ body }) => {
        const { errors } = body;
        errors[0].password.should.be.equal(incorrectCredentialsMessage);
      })
      .end(done);
  });

  it('should return an error that the password is too long', (done) => {
    request
      .post('/account/signin')
      .send({
        email: newUserData.email,
        password: Array(42).join('1'),
      })
      .expect(400)
      .expect(({ body }) => {
        const { errors } = body;
        errors[0].password.should.be.equal(incorrectCredentialsMessage);
      })
      .end(done);
  });

  it('should return an error if wrong password is provided when logging in', (done) => {
    request
      .post('/account/signin')
      .send({
        email: user.email,
        password: 'invalid_password',
      })
      .expect(400)
      .expect(({ body }) => {
        const { errors } = body;
        errors[0].credentials.should.be.equal(incorrectCredentialsMessage);
      })
      .end(done);
  });
});
