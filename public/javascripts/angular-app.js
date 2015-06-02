'use strict'

var msgApp = angular.module('myApp',['ngRoute']);

// msgApp.config(function Config($httpProvider, jwtInterceptorProvider){

	
// });

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

msgApp.controller('MainCtrl', ['$scope', 'socket', '$http', '$location', function($scope, socket, $http, $location){
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
		.success(function(data){
			//set the JWT token here
			$location.path('/users');
		}).error(function(err){
			$location.path('/login');
		}); 
	};


	//friends code
	function getFriends(){
		$http.get('/friends/'+userId).success(function(f){
			$scope.friends = f;
		}).error(function(err){
			console.log(err);
		});
	};

	$scope.addFriend = function(){
		$http.post('/friends/'+userId, {friends: $scope.newFriend})
		.success(function(res){
			getFriends();
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



