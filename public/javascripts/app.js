var app = angular.module('myApp', ["ngRoute", "angularjsToast"]);

app.config(function ($routeProvider, $locationProvider) {
	$routeProvider
		.when("/", {
			templateUrl: "/javascripts/templates/dashboard.html"
		});
		// enable html5Mode for pushstate ('#'-less URLs)
		// $locationProvider.html5Mode(true);
		// $locationProvider.hashPrefix('!');
});

app.controller('myCtrl', function ($scope, $http, $window, toast) {

	var BASE_URL = 'http://localhost:8080';

	$scope.moment = moment;

	var ts = Math.round((new Date()).getTime() / 1000);
	var defaultEvent = {
		subject: 'New Event',
		fromTime: moment.unix(ts).format("YYYY-MM-DD HH:mm"),
		toTime: moment.unix(ts).format("YYYY-MM-DD HH:mm"),
		location: '5004 44th St',
		type: 'appointment'
	};

	var defaultUser = {
		username: 'jahanzaibaslam',
		outlookEmail: 'jahanzaib.aslam@outlook.com',
		googleEmail: 'jahanzaibaslam156@gmail.com'
	};

	$scope.eventsList = [];
	$scope.currentEvent = defaultEvent;
	$scope.user = defaultUser;
	$scope.currentUser = localStorage.getItem('username');

	$scope.setCurrentEvent = function (event) {
		$scope.currentEvent = event;
	};
	$scope.resetCurrentEvent = function () {
		$scope.currentEvent = defaultEvent;
	};

	$scope.getEventsList = function () {
		$http({
			method: 'GET',
			url: BASE_URL + '/events/' + localStorage.getItem('username'),
			headers: {
				'username': localStorage.getItem('username')
			}
		}).then(function successCallback(response) {
			$scope.eventsList = response.data || [];
			_.forEach($scope.eventsList, event => {
				event.fromTime = moment.unix(event.fromTime).format("YYYY-MM-DD HH:mm");
				event.toTime = moment.unix(event.toTime).format("YYYY-MM-DD HH:mm");
			});
		}, function errorCallback(error) {
			console.log(error);

		});
	};

	$scope.syncGoogleEvents = function () {
		$http({
			method: 'GET',
			url: BASE_URL +'/google/'+ localStorage.getItem('username') + '/sync',
			headers: {
				'username': localStorage.getItem('username')
			}
		}).then(function successCallback(response) {
			console.log(response);
		}, function errorCallback(error) {
			console.log(error);
		});
	};

	$scope.syncOutlookEvents = function () {
		$http({
			method: 'GET',
			url: BASE_URL + '/outlook/' + localStorage.getItem('username') + '/sync',
			headers: {
				'username': localStorage.getItem('username')
			}
		}).then(function successCallback(response) {
			console.log(response);
		}, function errorCallback(error) {
			console.log(error);
		});
	};

	$scope.upsertEvent = function (event) {
		var endpoint = BASE_URL + '/events/' + localStorage.getItem('username');
		var Method = 'POST';

		if (event.id) {
			endpoint = endpoint + '/' + event.id;
			Method = 'PUT';
		}

		$http({
			method: Method,
			url: endpoint,
			headers: {
				'username': localStorage.getItem('username')
			},
			data: event
		}).then(function successCallback(response) {
			if (!event.id) {
				response.data.fromTime = moment.unix(response.data.fromTime).format("YYYY-MM-DD HH:mm")
				response.data.toTime = moment.unix(response.data.toTime).format("YYYY-MM-DD HH:mm")
				$scope.eventsList.push(response.data);
			}
			toast({
				duration: 10000,
				message: "SUCCESS: Event Saved!",
				className: "alert-success"
			});
		}, function errorCallback(error) {
			console.log(error);
			toast({
				duration: 10000,
				message: "ERROR! " + error.data.response.errorMessage,
				className: "alert-danger"
			});
		});
	};

	$scope.deleteEvent = function (event) {
		var isConfirm = confirm('are you sure?');
		if (!isConfirm) return false;

		var endpoint = BASE_URL + '/events/' + localStorage.getItem('username') + '/' + event.id;
		var Method = 'DELETE';
		$http({
			method: Method,
			url: endpoint,
			headers: {
				'username': localStorage.getItem('username')
			}
		}).then(function successCallback(response) {
			console.log(response);
			_.remove($scope.eventsList, {
				id: event.id
			});
			toast({
				duration: 10000,
				message: "SUCCESS: Event Deleted!",
				className: "alert-success"
			});
		}, function errorCallback(error) {
			console.log(error);
			toast({
				duration: 10000,
				message: "ERROR! check API console",
				className: "alert-danger"
			});
		});
	};

	$scope.createUser = function () {

		var user = $scope.user;
		var endpoint = BASE_URL + '/users/' + user.username;

		$http({
			method: 'POST',
			url: endpoint,
			data: user
		}).then(function successCallback(response) {
			localStorage.setItem('username', user.username);
			$scope.user = null;
			$window.location.href = window.location.href + 'dashboard';
			toast({
				duration: 10000,
				message: "SUCCESS: User Saved!",
				className: "alert-success"
			});

		}, function errorCallback(error) {
			console.log(error);
			toast({
				duration: 10000,
				message: "ERROR! " + error.data.response.errorMessage,
				className: "alert-danger"
			});
		});
	};
});
