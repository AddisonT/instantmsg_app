'use strict'

var msgApp = angular.module('myApp',['ngRoute','angular-jwt','ui.router']);

msgApp.config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});

// msgApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
// 	$routeProvider
// 	.when('/',{
// 		templateUrl: "/templates/index.ejs",
// 		controller: 'MainCtrl'
// 	})
// 	.when('/signup',{
// 		templateUrl: '/templates/signup.ejs',
// 		controller: 'MainCtrl'
// 	})
// 	.when('/login',{
// 		templateUrl: '/templates/login.ejs',
// 		controller: 'MainCtrl'
// 	}).when('/users',{
// 		templateUrl: '/templates/user.ejs',
// 		controller: 'MainCtrl'
// 	})
// 	.when('/chat/:id',{
// 		templateUrl: '/templates/chat.ejs',
// 		controller: 'ChatCtrl'
// 	})
// 	.otherwise({
// 		redirectTo: '/'
// 	});

// 	$locationProvider.html5Mode(true);
// }]);

msgApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){
	$urlRouterProvider.otherwise('/');

	$stateProvider
	.state('root',{
		url: '/',
		templateUrl: "/templates/index.ejs",
		controller: 'MainCtrl'
	})
	.state('signup',{
		url: '/signup',
		templateUrl: "/templates/signup.ejs",
		controller: 'MainCtrl'
	})
	.state('login',{
		url: '/login',
		templateUrl: "/templates/login.ejs",
		controller: 'MainCtrl'
	})
	.state('users',{
		url: '/users',
		templateUrl: "/templates/user.ejs",
		controller: 'MainCtrl'
	})
	.state('chat',{
		url: '/chat',
		templateUrl: "/templates/chat.ejs",
		controller: 'ChatCtrl',
		params: {id: null}
	});

}]);

msgApp.controller('MainCtrl',
	['$scope', 'socket', '$http', '$location', '$window','jwtHelper', '$state', '$stateParams',
	function($scope, socket, $http, $location, $window, jwtHelper, $state, $stateParams){
	$scope.test = "Angular is working!";

	if($window.sessionStorage.token){
		getFriends();
	}

	$scope.signup = function(){

		$http.post('/signup',{person: $scope.person})
		.success(function(data){
			//$location.path('/login');
			$state.go('login');
		}).error(function(err){
			//$location.path('/signup');
			$state.go('signup');
		}); 
	};

	$scope.login = function(){

		//authenticate user and get 
		$http.post('/login',{person: $scope.person})
		.success(function(data, status, headers, config){
			//set the JWT token here
			console.log("THIS IS THE TOKEN FROM SERVER: "+data.token);
			$window.sessionStorage.token = data.token;

			//$location.path('/users');
			$state.go('users');
		}).error(function(err){
			delete $window.sessionStorage.token;

			//$location.path('/login');
			$state.go('login');
		}); 
	};

	$scope.joinChat = function(roomName){
		console.log("Client side room name: "+ roomName);
		socket.emit('create room', roomName);
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

	function getFriends(){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		$http.get('/api/friends/'+userInfo.id).success(function(f){
			//$scope.friends = f.friends;
			var friendHash = [];

			for(var i = 0; i < f.friends.length;i++){
				if( userInfo.id < f.friends[i]){
					friendHash.push({friend: f.friends[i], roomname: ""+userInfo.id+"-"+f.friends[i]});
				} else {
					friendHash.push({friend: f.friends[i], roomname: ""+f.friends[i]+"-"+userInfo.id});
				}
			}

			$scope.friends = friendHash;

		}).error(function(err){
			console.log(err);
		});
	};

}]);

msgApp.controller('ChatCtrl',
	['$scope', '$window', 'socket', 'jwtHelper', '$location', '$routeParams','$state', '$stateParams', 
	function($scope, $window, socket, jwtHelper, $location, $routeParams, $state, $stateParams){

	socket.on('chat message', function(msg){
		console.log("Attached msg");
		console.log(angular.element('#messages'));
		angular.element('#messages').append($('<li>').text(msg));
	});

	socket.on('chat', function(msg){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);
		console.log("Client msg received "+msg[0]);
		console.log("Client msg received userID is "+msg[2]);
		angular.element('#messages').append($('<li>').text(msg[0]));

		if(msg[2] !== userInfo.id){
			$scope.yourString = "";
		} 
	});

	$scope.send = function(){
		$scope.test = "clicked button!";
		console.log("You clicked the send button");

		socket.emit('chat message', $scope.message);
		$scope.message = "";
	};

	// $scope.$watch('myString', function(newValue, oldValue) {
	// 		$scope.myString = newValue;
	// });

	$scope.chat = function(){
		console.log("scope is", $scope);
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		var message = ""+userInfo.name+": "+$scope.message;
		//console.log("This is route params "+ $routeParams.id);
		
		socket.emit('chat', [message, $stateParams.id, userInfo.id]);
		
		$scope.message = "";
		$scope.myString = "";
	};

	//////////////////////////////////////
	$scope.myString = "";
	$scope.yourString = "";

	socket.on('key press', function(msg){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);
		console.log("This is the key pressed received from server: "+msg[1]);
			
		if(msg[2] === userInfo.id){
			$scope.myString = msg[0];
		} else {
			$scope.yourString = msg[0];
		}
	});

	$scope.onKeyS = function($event){
		var enterKeyCode = 13;
		console.log("THIS IS KEY CODE ", $event.keyCode );


		setTimeout(function(){
			if ($event.keyCode !== enterKeyCode){

			var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

			var message = ""+userInfo.name+": "+$scope.message;

			socket.emit('key press', [message, $stateParams.id, userInfo.id]);
			console.log("I HAVE PRESSED A KEY ON CLIENT SIDE IT IS: ", message);
		}
		}, 20);
		// if ($event.keyCode !== enterKeyCode){

		// 	var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		// 	var message = ""+userInfo.name+": "+$scope.message;

		// 	socket.emit('key press', [message, $stateParams.id, userInfo.id]);
		// 	console.log("I HAVE PRESSED A KEY ON CLIENT SIDE IT IS: ", message);
		// }
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



