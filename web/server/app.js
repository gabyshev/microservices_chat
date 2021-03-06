'use strict';

var path    = require('path'),
    http    = require('http'),
    faye    = require('faye'),
    morgan  = require('morgan'),
    express = require('express'),
    bodyParser = require('body-parser'),
    httpProxy = require('http-proxy');

// main objects
var app = express();
var bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 25});
var jsonParser = bodyParser.json();

// application configuration
// api_url - API server url. If run with docker compose requests will go to RoR container
// root_path - path to static files
var config = {
  api_uri: process.env.MICROSERVICESCHAT_API_1_PORT_3000_TCP || "http://localhost:3000",
  root_path:  path.normalize(__dirname + '/..')
}

// express config
app.use(morgan('combined'));
app.use(express.static(path.join(config.root_path, 'public')));
app.set('appPath', path.join(config.root_path, 'public'));

// proxy server. necessary for sending API requests to RoR docker container
var apiProxy = httpProxy.createProxyServer();
apiProxy.on('error', function (err, req, res) {
  console.log("connection problem");
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end(err.message);
})

// url where publishing to websocket channels happen
app.post('/message', jsonParser, function (req, res) {
  bayeux.getClient().publish('/conversation/' + req.body.conversation_id, req.body.message);
  res.sendStatus(200);
});

// url responsible for business logic, will proxy requests to RoR docker container
app.all('/api/*', function (req, res) {
  req.url = req.url.replace(/\/api/, '');
  apiProxy.web(req, res, { target: config.api_uri });
});

// in all other cases render static files
app.route('/*').get(function (req, res) {
  res.sendFile(path.join(app.get('appPath'), 'index.html'));
});

//create actual server and attach faye
var server = http.createServer(app);
var port = 8080;
bayeux.attach(server);
server.listen(port);
console.log("server up and listen on port: " + port);
