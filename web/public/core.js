angular.module('chatApp', ['ngRoute'])
  // если запрос не авторизованный, перенаправлять на sign_in
  // будучи не авторизованным пользователь может посетить только sign_in или sign_up
  .run(["$rootScope", "$location", function ($rootScope, $location) {
    $rootScope.$on("$routeChangeError", function (event, current, previous, eventObj) {
      if (eventObj.authenticated === false) {
        $location.path("/sign_in");
      }
    });
  }])

  .controller('MainCtrl', function($scope, $location) {
  })
  // основной контроллер реализующий логику чата
  .controller('ChatCtrl', ["$scope", "chatFactory", function($scope, chatFactory) {
    $scope.websocket_client = new Faye.Client("/faye");
    $scope.currentChat = null;
    $scope.currentSubscription = null;

    // если объет "текущий чат" меняется, то отписывается от текущей подписки на канал и подписываемся на новый
    $scope.$watch("currentChat", function (newValue, oldValue) {
      if (newValue === oldValue) {
        return;
      }
      if ($scope.currentSubscription) {
        $scope.currentSubscription.cancel();
      }
      $scope.currentSubscription = $scope.websocket_client.subscribe("/conversation/" + newValue.id, function (data) {
        $scope.messages.push(data);
        $scope.$apply();
      });
    });

    // при инициализации контроллера подтягиваем сразу список доступных для чата пользователей
    function activate() {
      chatFactory.getUsers().then(function (result){
        $scope.users = result.data;
      });
    };

    function loadMessages(chat_id) {
      chatFactory.loadMessages(chat_id).then(function (result) {
        $scope.messages = result.data;
      })
    };

    $scope.startChatWith = function(user) {
      chatFactory.getConversation(user).then(function (result) {
        $scope.currentChat = result.data;
        loadMessages(result.data.id)
      });
    };

    $scope.sendMessage = function (chat) {
      chatFactory.sendMessage(chat.id, $scope.messageBody).then(function (result) {
        $scope.messageBody = null;
        chatFactory.publishMessage(result.data);
      })
    }

    //  инициализируем чат контроллер
    activate();
  }])
  // контроллеры SignUpCtrl и SignInCtrl  тянут запросы по авторизации и регистрации с фактори authFactory
  .controller('SignUpCtrl', ["$scope", "$location", "authFactory", function ($scope, $location, authFactory) {
    $scope.signUp = function () {
      authFactory.signUp($scope.email, $scope.password, $scope.passwordConfirmation)
        .then(function (result) {
          $location.path("/sign_in");
        }, function (error) {
          alert("Error: " + error.statusText);
          console.log(error);
        })
    };
  }])
  .controller('SignInCtrl', ["$scope", "$location", "authFactory", function ($scope, $location, authFactory) {
    $scope.userInfo = null;
    $scope.login = function () {
      authFactory.login($scope.email, $scope.password)
        .then(function (result) {
          $scope.userInfo = result;
          $location.path("/chat");
        }, function (error) {
          alert("Error: " + error.statusText);
          console.log(error);
        })
    };
  }])

  // Роуты фронтенд приложеиня
  // без авторизации можно зайти только на sign_up/sign_in в остальных случаях будет редирект на sign_in
  .config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode({enabled: true, requireBase: false});
    $routeProvider
      .when('/sign_in', {
        templateUrl: "sign_in.html",
        controller: "SignInCtrl"
      })
      .when('/sign_up', {
        templateUrl: 'sign_up.html',
        controller: 'SignUpCtrl'
      })
      .when('/chat', {
        templateUrl: 'chat.html',
        controller: 'ChatCtrl',
        resolve: {
          auth: ["$q", "authFactory", function ($q, authFactory) {
            var userInfo = authFactory.getUserInfo();

            if (userInfo) {
              return $q.when(userInfo)
            } else {
              return $q.reject({ authenticated: false });
            }
          }]
        }
      })
      .otherwise({
        resolve: {
          auth: ["$q", "authFactory", function ($q, authFactory) {
            var userInfo = authFactory.getUserInfo();

            if (userInfo) {
              return $q.when(userInfo)
            } else {
              return $q.reject({ authenticated: false });
            }
          }]
        }
      })
  })

  // Фактори для работы с базой Чатов(Conversation) и Сообщений
  .factory('chatFactory', function ($http, $q, authFactory) {
    var credentials = authFactory.getUserInfo();
    // Передаем в хедерах аутентификационные данные вида:
    // Authorization: Bearer my@email.ru MYTOKEN
    $http.defaults.headers.common.Authorization = "Bearer " + credentials.email + " " + credentials.token;

    // Паблиш сообщения по вебсокетам
    function publishMessage(data) {
      $http.post("/message", {
        conversation_id: data.conversation_id,
        message: {
          body: data.body,
          from: authFactory.getUserInfo().email
        }
      });
    };

    // При общении с API сервер используется  Deferred объекты
    // функция создания сообщения в чате
    function sendMessage(chat_id, messageBody) {
      var deferred = $q.defer();
      $http.post("api/conversations/" + chat_id + "/messages.json", {
        conversation_id: chat_id,
        message: {
          body: messageBody,
          user_id: authFactory.getUserInfo().id
        }
      }).then(function (result) {
        deferred.resolve(result);
      }, function (error) {
        deferred.reject(error);
      })
      return deferred.promise;
    };

    // подгрузка сообщений с текущего чата
    function loadMessages(chat_id) {
      var deferred = $q.defer();
      $http.get("api/conversations/" + chat_id + "/messages.json")
        .then(function (result) {
          deferred.resolve(result);
        }, function (error) {
          deferred.reject(error);
        })
      return deferred.promise;
    }

    //  подгрузка доступных юзеров для чата
    function getUsers(){
      var deferred = $q.defer();
      $http.get("api/conversations.json")
        .then(function (result) {
          deferred.resolve(result);
        }, function (error) {
          deferred.reject(error);
        })
      return deferred.promise;
    };

    // получаение объекта Conversation
    function getConversation(user) {
      var deferred = $q.defer();
      $http.post("api/conversations.json", {
        sender_id:    credentials.id,
        recipient_id: user.id
      }).then(function (result) {
          deferred.resolve(result);
        }, function (error) {
          deferred.reject(error);
        })
      return deferred.promise;
    };

    return {
      getUsers: getUsers,
      getConversation: getConversation,
      loadMessages: loadMessages,
      sendMessage: sendMessage,
      publishMessage: publishMessage
    };
  })

  // Фактори отвечающий за регистрацию и логин пользователей
  .factory('authFactory', function($http, $q, $window) {
    var userInfo;

    // в  userInfo лежит информация о текущей сессии пользователя: токен, почта и id пользователя
    // переменная userInfo инициализируется сразу, наполняется данными при успешном логине и сохраняется в SessionStorage браузера
    function getUserInfo() {
      return userInfo;
    }

    function login(email, password) {
      var deferred = $q.defer();

      $http.post("api/users/sign_in.json", {
        user: {
          email: email,
          password: password
        }
      }).then(function(result) {
        userInfo = {
          id: result.data.id,
          token: result.data.token,
          email: result.data.user
        };
        $window.sessionStorage["userInfo"] = JSON.stringify(userInfo);
        deferred.resolve(userInfo);
      }, function(error) {
        deferred.reject(error);
      });

      return deferred.promise;
    }

    function signUp(email, password, passwordConfirmation) {
      var deferred = $q.defer();

      $http.post("api/users.json", {
        user: {
          email: email,
          password: password,
          password_confirmation: passwordConfirmation
        }
      }).then(function (result) {
        deferred.resolve(userInfo);
      }, function (error) {
        deferred.reject(error);
      })

      return deferred.promise;
    }

    // в userInfo всегда лежат актуальные данные, например при рефреше страницы
    // функция init() обновляет переменную
    function init() {
      if ($window.sessionStorage["userInfo"]) {
        userInfo = JSON.parse($window.sessionStorage["userInfo"]);
      }
    }

    init();

    return {
      login: login,
      getUserInfo: getUserInfo,
      signUp: signUp
    };
  })
