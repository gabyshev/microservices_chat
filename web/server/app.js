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

// конфииги приложения
// api_url - урл API сервера. Если запущено через docker-compose, запросы будут идти на прилинкованный конейтнер
// root_path - путь до папки /server, нужно чобы отдавать статику
var config = {
  api_uri: process.env.MICROSERVICESCHAT_API_1_PORT_3000_TCP || "http://localhost:3000",
  root_path:  path.normalize(__dirname + '/..')
}

// express config
app.use(morgan('combined'));
app.use(express.static(path.join(config.root_path, 'public')));
app.set('appPath', path.join(config.root_path, 'public'));

// Прокси сервер, нужен для пересылки всех API запросов на прилинкованный контейнер с рельсами
var apiProxy = httpProxy.createProxyServer();
apiProxy.on('error', function (err, req, res) {
  console.log("connection problem");
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end(err.message);
})

// Урл по которому происходит  Publish в вебсокет каналы
app.post('/message', jsonParser, function (req, res) {
  bayeux.getClient().publish('/conversation/' + req.body.conversation_id, req.body.message);
  res.sendStatus(200);
});

// Урл на который будут идти все запросы с фронтенда, предназначенные для работы с пользователями (логин, сообщения)
app.all('/api/*', function (req, res) {
  req.url = req.url.replace(/\/api/, '');
  apiProxy.web(req, res, { target: config.api_uri });
});

// в остальных случаях рендерится index.html
app.route('/*').get(function (req, res) {
  res.sendFile(path.join(app.get('appPath'), 'index.html'));
});

//create actual server and attach faye
var server = http.createServer(app);
var port = 8080;
bayeux.attach(server);
server.listen(port);
console.log("server up and listen on port: " + port);
