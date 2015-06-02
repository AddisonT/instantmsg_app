'use strict'

var msgApp = angular.module('myApp',['ngRoute','angular-jwt']);

msgApp.config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});

msgApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
	$routeProvider
	.when('/',{
		templateUrl: "/templates/index.ejs",
		controller: 'MainCtrl'
	})
	.when('/signup',{
		templateUrl: '/templates/signup.ejs',
		controller: 'MainCtrl'
	})
	.when('/login',{
		templateUrl: '/templates/login.ejs',
		controller: 'MainCtrl'
	}).when('/users',{
		templateUrl: '/templates/user.ejs',
		controller: 'MainCtrl'
	})
	.when('/chat',{
		templateUrl: '/templates/chat.ejs',
		controller: 'MainCtrl'
	});

	$locationProvider.html5Mode(true);
}]);

msgApp.controller('MainCtrl', ['$scope', 'socket', '$http', '$location', '$window','jwtHelper',function($scope, socket, $http, $location, $window, jwtHelper){
	$scope.test = "Angular is working!";

	$scope.signup = function(){

		$http.post('/signup',{person: $scope.person})
		.success(function(data){
			$location.path('/login');
		}).error(function(err){
			$location.path('/signup');
		}); 
	};

	$scope.login = function(){

		//authenticate user and get 
		$http.post('/login',{person: $scope.person})
		.success(function(data, status, headers, config){
			//set the JWT token here
			console.log("THIS IS THE TOKEN FROM SERVER: "+data.token);
			$window.sessionStorage.token = data.token;

			$location.path('/users');
		}).error(function(err){
			delete $window.sessionStorage.token;

			$location.path('/login');
		}); 
	};


	//friends code
	$scope.addFriend = function(){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		$http.post('/api/friends/'+userInfo.id, {friend: $scope.newFriend})
		.success(function(res){
			$scope.newFriend = "";
			getFriends();
		}).error(function(err){
			console.log(err);
		});
	};

	if($window.sessionStorage.token){
		getFriends();
	}

	function getFriends(){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		$http.get('/api/friends/'+userInfo.id).success(function(f){
			$scope.friends = f.friends;
		}).error(function(err){
			console.log(err);
		});
	};

	//socket chat code
	socket.on('chat message', function(msg){
		console.log("Attached msg");
		console.log(angular.element('#messages'));
		angular.element('#messages').append($('<li>').text(msg));
	});

	$scope.send = function(){
		$scope.test = "clicked button!";
		console.log("You clicked the send button");

		socket.emit('chat message', $scope.message);
		angular.element('#m').val('');
		$scope.message = "";
	};

}]);

msgApp.factory('authInterceptor', function ($rootScope, $q, $window, $location) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;
      }
      return config;
    },
    response: function (response) {
      if (response.status === 401) {
        $location.path('/login');
      }
      return response || $q.when(response);
    }
  };
});

msgApp.factory('socket', function($rootScope){
	var socket = io.connect();
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {  
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		}
	};
});



