angular.module('chatApp', ['ngRoute'])
  .run(["$rootScope", "$location", function ($rootScope, $location) {
    $rootScope.$on("$routeChangeError", function (event, current, previous, eventObj) {
      if (eventObj.authenticated === false) {
        $location.path("/sign_in");
      }
    });
  }])

  .controller('MainCtrl', function($scope, $location) {
  })
  .controller('ChatCtrl', function($scope, $location) {
  })
  .controller('SignUpCtrl', ["$scope", "$location", "authFactory", function ($scope, $location, authFactory) {
    $scope.userInfo = "blabla";
    $scope.signUp = function () {
      authFactory.signUp($scope.email, $scope.password, $scope.passwordConfirmation)
        .then(function (result) {
          console.log(result);
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

  .factory('authFactory', function($http, $q, $window) {
    var userInfo;

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