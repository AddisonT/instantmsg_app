'use strict'

var msgApp = angular.module('myApp',[]);

msgApp.controller('MainCtrl', ['$scope', 'socket', '$http', function($scope, socket, $http){
	$scope.test = "Angular is working!";

	$scope.send = function(){
		$scope.test = "clicked button!";
		console.log("You clicked the send button");

		socket.emit('chat message', $scope.message, function(){
			$scope.message = "";
		});
		

		socket.on('chat message', function(msg){
			console.log("Attached msg");
			angular.element('#messages').append($('<li>').text(msg));
		});
	};

	function getFriends(){
		$http.get('/friends/'+id).success(function(f){
			$scope.friends = f;
		}).error(function(err){
			console.log(err);
		});
	};

	$scope.addFriend = function(){
		$http.post('/friends/'+id, {'friends': $scope.newFriend})
		.success(function(res){
			getFriends();
		}).error(function(err){
			console.log(err);
		});
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



