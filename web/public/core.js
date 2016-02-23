angular.module('chatApp', ['ngRoute'])
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
