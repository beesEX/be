const faker = require('faker');

const BaseBuilder = require('tests/base.builder');
const userService = require('resources/user/user.service');

const qwertyHash = '$2a$10$8Z0s/vCE09wIN.piv7qCEuBmV8oIfafV.j7IOCXUTPZOUOpaLPa9K';

class UserBuilder extends BaseBuilder {
  constructor() {
    super(userService);

    this.data.createdAt = new Date();
    this.data.name = `${faker.name.firstName()} ${faker.name.lastName()}`;

    this.email();
    this.password();
  }

  email(emailAddress) {
    this.data.email = emailAddress || faker.internet.email().toLowerCase();
    return this;
  }

  password(passwordHash = qwertyHash) {
    this.data.password = passwordHash;
    return this;
  }
}

module.exports = UserBuilder;
