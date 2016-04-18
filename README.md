## Sample microservices chat application using websockets

This repo contains second part of assessment. First part [here](https://github.com/gabyshev/chat_monolith).

### Assessment

Functions:
- User can register in the app.
- User can login in the app
- Logged user can chat with other  users.
- Chat allow user to send and receive messages.

Realization:
- application should consist 2 microservices
  - First microservice - Ruby on Rails application implementing business logic
  - Second microservice - Node.js application implementing char and async websockets

###  Realization

##### Ruby on Rails app microservice (**API**)

This microservice is responsible for user management and storing/sending conversation data among users.
Communication between docker containers is implemented via REST JSON API. Every successfully logged in user get [JWT](http://jwt.io/) token from the server. `Conversations` and `Messages` controllers authorize user through `verify_jwt_token` method.

##### Node.js app microservice (**WEB**)

Express webserver is watching urls:
- `/message`
- `/api`

In all other cases it sends static http with AngualarJS application.

Endpoints:
`/message` - responsible for publishing messages into websocket channel. Websockets implemented using [Faye](http://faye.jcoglan.com/)
`/api` - Node.js will catch all requests pointing here and proxying them to Ruby on Rails docker container.

### Running application

You should have `Docker Compose` on your host machine.

```
cd ../path/to/app
docker-compose build
docker-compose up
```

If you run application from OS X check your env var $DOCKER_HOST and open it. From Linux just open localhost

### Suggested improvements

1. Tests will be implemented later.
2. Due to demonstration purposes I used one repo for Node.js and RoR applications. Usually in real world different teams will work on that application. Therefore you should split them into different repos.
3. Error processing. In my case due to testing purposes in most cases I do not process errors. In the real application you should always process possible errors.
4. Docker Compose is not for production environment. Depending on the size of you application there are many Orchestration tools.
5. For easy reading I leaved whole AngularJS application in one `core.js` file. In the production environment the application will grow so you should organize it into different files.
6. Mircoservices architecture assumes you have automated containers monitoring tool.
7. Additional security enhancement for Node.js container. Right now anyone can POST into `/messages` and thus can break into conversation. I think the possible solution can be securing conversation channels by hashing `CONVERSATION_ID` so that hacker wont guess it.
