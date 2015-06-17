'use strict'

var msgApp = angular.module('myApp',['ngRoute','angular-jwt','ui.router']);

msgApp.config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});

msgApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){
	$urlRouterProvider.otherwise('/');

	$stateProvider
	.state('root',{
		url: '/',
		templateUrl: "/templates/home.ejs",
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
			$state.go('login');
		}).error(function(err){
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

			$state.go('users');
		}).error(function(err){
			delete $window.sessionStorage.token;

			$state.go('login');
		}); 
	};

	//method called when clicking on a friend's name that makes the user join a room
	//specific to user and his friend 
	$scope.joinChat = function(roomName){
		console.log("Client side room name: "+ roomName);
		socket.emit('create room', roomName);
	};

	//makes an AJAX post to the server to add a new friend to the current user
	//and then updates the list by calling getFriends();
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

	//gets the list of friends of the user from the server and stores them in hash with
	//the room name so a room can be made on the namespace of the user.
	function getFriends(){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		$http.get('/api/friends/'+userInfo.id).success(function(f){
			
			var friendArr = [];

			for(var i = 0; i < f.friends.length;i++){
				if( userInfo.id < f.friends[i]){
					friendArr.push({friend: f.friends[i], roomname: ""+userInfo.id+"-"+f.friends[i]});
				} else {
					friendArr.push({friend: f.friends[i], roomname: ""+f.friends[i]+"-"+userInfo.id});
				}
			}

			$scope.friends = friendArr;

		}).error(function(err){
			console.log(err);
		});
	};

}]);

//controller for the chat page
msgApp.controller('ChatCtrl',
	['$scope', '$window', 'socket', 'jwtHelper', '$location', '$state', '$stateParams', '$anchorScroll',
	function($scope, $window, socket, jwtHelper, $location, $state, $stateParams, $anchorScroll){

	// socket.on('chat message', function(msg){
	// 	console.log("Attached msg");
	// 	console.log(angular.element('#messages'));
	// 	angular.element('#messages').append($('<li>').text(msg));
	// });
	
	//removes the listener when moving from a different controller so we don't
	//recreate the listener when switching back to this controller
	$scope.$on('$destroy', function (event) {
		socket.getSocket().removeAllListeners();
	});

	//recieves a message from the server and appends it before the input display of the li 
	//element. If the message received is from the other user, then reset the other user's
	//display string value to empty
	socket.on('chat', function(msg){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);
		console.log("Client msg received "+msg[0]);
		console.log("Client msg received userID is "+msg[2]);
		//angular.element('#messages').append($('<li>').text(msg[0]));
		angular.element($('<li>').text(msg[0])).insertBefore('#myMsg');
		if(msg[2] !== userInfo.id){
			$scope.yourString = "";
		} 
	});

	//sends the message that the user wrote and resets the values of the message
	//and display string to be empty
	$scope.chat = function(){
		console.log("scope is", $scope);
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);

		var message = ""+userInfo.name+": "+$scope.message;
		//console.log("This is route params "+ $routeParams.id);
		$scope.roomName = $stateParams.id;
		socket.emit('chat', [message, $stateParams.id, userInfo.id]);
		
		$scope.message = "";
		$scope.myString = "";
	};

	//function that emits the roomname to the server side to leave the room
	$scope.leaveRoom = function(){
		console.log("you've left the room ", $scope.roomName);
		socket.emit('leave room', $scope.roomName);
	}
	//////////////////////////////////////
	$scope.myString = "";
	$scope.yourString = "";

	//when we receieve a key press event from the server we need to determine if that message
	//is from the user or the other person the user is chatting with and then display the message
	socket.on('key press', function(msg){
		var userInfo = jwtHelper.decodeToken($window.sessionStorage.token);
		console.log("This is the key pressed received from server: "+msg[1]);
			
		if(msg[2] === userInfo.id){
			$scope.myString = msg[0];
		} else {
			$scope.yourString = msg[0];
		}
	});

	//method that emits the current value of input message each time a keydown event occurs
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
		//scrolls the chat view to the li element where the input msg is being displayed of the user
		$location.hash('yourMsg');
		$anchorScroll();
	};

}]);

//factory for authenticating the JWT token 
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

//socket factory to get socket.io working on the frontend with angular
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
		},
		getSocket: function() {
			return socket;
		}
	};
});



