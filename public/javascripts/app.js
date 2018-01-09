var app = angular.module('myApp', ["ngRoute", "angularjsToast"]);

app.config(function ($routeProvider) {
	$routeProvider
		.when("/", {
			templateUrl: "/javascripts/templates/dashboard.html"
		});
});

app.controller('myCtrl', function ($scope, $http, toast) {

	var BASE_URL = 'http://localhost:8080';
	var USERNAME = 'jahanzaib';

	$scope.moment = moment;

	var ts = Math.round((new Date()).getTime() / 1000);
	var defaultEvent = {
		subject: '',
		fromTime: moment.unix(ts).format("YYYY-MM-DD HH:mm"),
		toTime: moment.unix(ts).format("YYYY-MM-DD HH:mm"),
		location: '',
		type: ''
	}

	$scope.eventsList = [];
	$scope.currentEvent = defaultEvent;

	$scope.setCurrentEvent = function (event) {
		$scope.currentEvent = event;
	};
	$scope.resetCurrentEvent = function () {
		$scope.currentEvent = defaultEvent;
	};


	_getEventsList();

	function _getEventsList() {
		$http({
			method: 'GET',
			url: BASE_URL + '/events/' + USERNAME,
			headers: {
				'username': 'jahanzaib'
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
	}

	$scope.upsertEvent = function (event) {
		var endpoint = BASE_URL + '/events/' + USERNAME;
		var Method = 'POST';

		if (event.id) {
			endpoint = endpoint + '/' + event.id;
			Method = 'PUT';
		}

		$http({
			method: Method,
			url: endpoint,
			headers: {
				'username': 'jahanzaib'
			},
			data: event
		}).then(function successCallback(response) {
			if (!event.id) {
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
        if(!isConfirm) return false;

		var endpoint = BASE_URL + '/events/' + USERNAME + '/' + event.id;
		var Method = 'DELETE';
		$http({
			method: Method,
			url: endpoint,
			headers: {
				'username': 'jahanzaib'
			}
		}).then(function successCallback(response) {
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

});
