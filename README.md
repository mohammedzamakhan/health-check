# What is it?
Different than most of other health check tools, this application loads websites in [PhantomJS](http://phantomjs.org/) and uses [CasperJS](http://casperjs.org/) to mimic user interactions and verify the results. 

# Why? 
Most of the web applications today use are single page applications and their content is generated by javascript or a template framework. To check if such applications are still functioning properly, the best way is to load them in a browser and verify the functionalities. That is exactly what HealthCheck is doing.

#Features: 
* Allow developer to write CasperJS scripts and execute them directly from the browser to load and verify functionality of any web application.
* Allow to set up execution schedule and send email notifications upon execution completion. 
* Support taking a screenshot if a script failed. 
* Allow to see execution log directly from browser. 
* Responsive design

# Demo: 
[![Watch a short demo](http://img.youtube.com/vi/7_2NwjJZylk/0.jpg)](http://www.youtube.com/watch?v=7_2NwjJZylk)

#Overview of Architecture
Primary technologies used: 
* Backend: [NodeJS](https://nodejs.org/), [ExpressJS](http://expressjs.com/), [PhantomJS](http://phantomjs.org/), [CasperJS](http://casperjs.org/), [mongoose](http://mongoosejs.com/), [agenda](https://github.com/rschmukler/agenda), and [Bluebird](https://github.com/petkaantonov/bluebird)
* Frontend: [BackboneJS](http://backbonejs.org/), [RequireJS](http://requirejs.org/), [UnderscoreJS](http://underscorejs.org/), [JQuery](https://jquery.com/), and [Handlebars](http://handlebarsjs.com/), [socket.io](http://socket.io/), and [data.io](https://github.com/scttnlsn/data.io)


# Installation Steps
* Spin up an Ubuntu instance and access to its console as root
* Update apt package registry
```sh
$ apt-get update
```
* Install mongodb 
* Install nodejs
```sh
$ apt-get install nodejs
```
* Create alias for nodejs as node
```sh
$ ln -s /usr/bin/nodejs /usr/bin/node
```
* Install node package manager (NPM)
```sh
$ apt-get install npm
```
* Install git client
```sh
$ apt-get install git
```
* Install libfontconfig (phantomjs secret dependency)
```sh
$ apt-get install libfontconfig
```
* Install forever globally for executing node as daemon
```sh
$ npm install -g forever
```
* Install phantomjs globally
```sh
$ npm install -g phantomjs
```
* Install casperjs globally and record the executable location
```sh
$ npm install -g casperjs
$ whereis casperjs
# casperjs: /usr/local/bin/casperjs
```
* Check out code from repository
```sh
$ git clone https://github.com/aduyng/health-check.git /var/www/node/health-check
```
* Change to root folder of health-check
```sh
cd /var/www/node/health-check
```
* Install node dependencies
```sh
cd /var/www/node/health-check
npm install
```
* Make changes on config.js
```sh
vim config.js
```
```javascript 
var path = require('path'),
    pkg = require('./package.json'),
    env = process.env.NODE_ENV || 'development';
module.exports = {
    production: {
       rootPath: __dirname,
        app: {
            name: pkg.name,
            fullName: 'Health Check',
            version: pkg.version
        },
        mongo: {
            url: '<URL TO YOUR MONGO DATABSAE>',
            debug: false
        },
        casper: {
            absolutePath: '<casperjs absolute path>'
        }
    }
};
```
* Start your server with forever
```sh
PORT=80 NODE_ENV=production forever start server.js
```
