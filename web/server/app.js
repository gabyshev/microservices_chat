'use strict';

var path    = require('path'),
    http    = require('http'),
    faye    = require('faye'),
    morgan  = require('morgan'),
    express = require('express'),
    httpProxy = require('http-proxy');

// main objects
var app = express();
var bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 25});

// config json
var config = {
  api_uri: process.env.MICROSERVICESCHAT_API_1_PORT_3000_TCP || "http://localhost:3000",
  root_path:  path.normalize(__dirname + '/..')
}

// express config
app.use(morgan('combined'));
app.use(express.static(path.join(config.root_path, 'public')));
app.set('appPath', path.join(config.root_path, 'public'));

//create actual server and attach faye
var server = http.createServer(app);
var port = 8080;
bayeux.attach(server);
server.listen(port);
console.log("server up and listen on port: " + port);