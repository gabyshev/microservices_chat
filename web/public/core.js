angular.module('chatApp', ['ngRoute'])
  // if request is not authorized redirect it to sign_in
  // as anonymous user can visit only sign_in and sign_up
  .run(["$rootScope", "$location", function ($rootScope, $location) {
    $rootScope.$on("$routeChangeError", function (event, current, previous, eventObj) {
      if (eventObj.authenticated === false) {
        $location.path("/sign_in");
      }
    });
  }])

  .controller('MainCtrl', function($scope, $location) {
  })
  // main controller implementing chat logic
  .controller('ChatCtrl', ["$scope", "chatFactory", function($scope, chatFactory) {
    $scope.websocket_client = new Faye.Client("/faye");
    $scope.currentChat = null;
    $scope.currentSubscription = null;

    // if current chat object is changed
    //  - cancel current subscribtion
    //  - subscribe to new channel
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

    // At controller initialisation get other users available for chat
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

    //  initialize chat controller
    activate();
  }])
  // controllers SignUpCtrl and SignInCtrl requesting authorization and authentication from authFactory
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

  // Front end routes
  // anonymously user can visist only  sign_up/sign_in in all other cases he will be redirected to sign_in
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

  // Factory for Conversations and Messages
  .factory('chatFactory', function ($http, $q, authFactory) {
    var credentials = authFactory.getUserInfo();
    // Puts auth headers in format:
    // Authorization: Bearer my@email.ru MYTOKEN
    $http.defaults.headers.common.Authorization = "Bearer " + credentials.email + " " + credentials.token;

    // Publish new message in websockets channel
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
    // To communicate with API I used Deferred objects

    // creating message in a chat
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

    // loading messages from current conversation
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

    // loading available users for chat
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

    // getting Conversation object
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

  // Factory responsible for registation and login
  .factory('authFactory', function($http, $q, $window) {
    var userInfo;

    // userInfo consist information about current session: token, email, user's id
    // userInfo initializes immidiately and filled with information after successfull login and saved in browser's SessionStorage
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

    // userInfo always consist actual information
    // init() function refreshes the variable
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
