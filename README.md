# beesEX backend server

Backend server of beesEX platform. It provides backend API and functionality for following feature groups:

1. account and user management
2. market page with live market data/indicators and trading capabilities
3. order management
4. trading engine
5. trade execution and settlement
6. user's wealth management
7. wallets management with blockchain network integration (in future)
8. platform admin dashboard and back office functionality (in future)

Libs and technologies used:

1. Config management.
2. Configured console logger based on  [common-logger](https://www.npmjs.com/package/@paralect/common-logger)
3. Automatic application restart when code changes with [Nodemon](https://github.com/remy/nodemon)
4. MongoDB configuration
5. Docker configuration for development and production environments.
6. Code linting based on [paralect/eslint-config](https://github.com/paralect/eslint-config)
7. Simplified request data validation and clean up based on [joi](https://github.com/hapijs/joi) and [koa-validate](https://www.npmjs.com/package/koa-validate)
8. Production ready account API resource (singup, signin, forgot password, reset password functionality)
9. JWT based authentication.
10. Tests for endpoints.
11. zeroMQ
12. KoaJS

Prerequisites
-------------

- [MongoDB](https://www.mongodb.org/downloads)
- [Node.js 8.0+](http://nodejs.org)
- Command Line Tools
 - <img src="http://deluge-torrent.org/images/apple-logo.gif" height="17">&nbsp;**Mac OS X:** [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12) (or **OS X 10.9+**: `xcode-select --install`)
 - <img src="http://dc942d419843af05523b-ff74ae13537a01be6cfec5927837dcfe.r14.cf1.rackcdn.com/wp-content/uploads/windows-8-50x50.jpg" height="17">&nbsp;**Windows:** [Visual Studio](https://www.visualstudio.com/products/visual-studio-community-vs) OR [Visaul Studio Code](https://code.visualstudio.com) + [Windows Subsystem for Linux - Ubuntu](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
 - <img src="https://lh5.googleusercontent.com/-2YS1ceHWyys/AAAAAAAAAAI/AAAAAAAAAAc/0LCb_tsTvmU/s46-c-k/photo.jpg" height="17">&nbsp;**Ubuntu** / <img src="https://upload.wikimedia.org/wikipedia/commons/3/3f/Logo_Linux_Mint.png" height="17">&nbsp;**Linux Mint:** `sudo apt-get install build-essential`
 - <img src="http://i1-news.softpedia-static.com/images/extra/LINUX/small/slw218news1.png" height="17">&nbsp;**Fedora**: `sudo dnf groupinstall "Development Tools"`
 - <img src="https://en.opensuse.org/images/b/be/Logo-geeko_head.png" height="17">&nbsp;**OpenSUSE:** `sudo zypper install --type pattern devel_basis`

Getting Started - how to start beesEX backend server
---------------

The easiest way to get started is to clone the repository:

```bash
# Get the latest snapshot
git clone https://github.com/beesEX/be beesEX-BE

# Change directory
cd beesEX-BE

# Install NPM dependencies
npm install

# Then simply start your app
npm start
```

You also can start the server in development mode: `npm run development`. This command will start application on port `3001` and will automatically restart whenever you change any file in `./src` directory.

### Explanations of the files structure

We try to keep things as simple as possible, so you can focus on building product instead of learning concepts.

There are two main directories within project:
1. [src/config](./src/config) - consist of configuration for the [environment](./src/config/index.js), [koa server](./src/config/koa.js) and [API routes](./src/config/routes).
2. [src/config/routes](./src/config/routes) - consist of [public](./src/config/routes/public.js) (don't require jwt token) and [authenticated](./src/config/routes/authenticated.js) (require jwt token) routes and [middlewares](./src/config/routes/middlewares).
  - [middlewares](./src/config/routes/middlewares) - koa middlewares which we use on every request (for example, get current user data from the database)
3. [src/resources](./src/resources) - REST api resources and everything related to the resource:
  - [database service](./src/resources/user/user.service.js) - resource service to work with database (MongoDB or other database)
  - [database schema](./src/resources/user/user.schema.js) - database schema for the resource entity.
  - [validators](./src/resources/account/validators/signup.validator.js) - request validation logic.
  - [controllers](./src/resources/account/account.controller.js) - the central place for the request handling and data manipulation.
  - [builders](./src/resource/user/user.builder.js) - creating database documents for testing.
  - [factory](./src/resource/user/user.factory.js) - predefined types of database documents for testing.
  - [tests](./src/resource/user/user.spec.js) - mocha tests for the endpoint.

All other files, that does not fit that structure should be placed straight in the `src` folder. We can always introduce more folders as we need them. Currently root folder consist following:

1. [src/app.constants.js](./src/app.constants.js) - constant variables that are used in the application
2. [src/app.js](./src/app.js) - starting point of the node.js application. It combine application configuration and start Koa http listener.
3. [src/auth.service.js](./src/auth.service.js) - JWT based authentication helper. Consist logic of JWT token encryption/decryption. Can consist other authentication related functions.
4. [src/db.js](./src/db.js) - handles connection to the MongoDB.
5. [src/logger.js](./src/logger.js) - application logger.
6. [src/security.util.js](./src/security.util.js) - number of methods for generating secure tokens and comparing passwords with password hash.

