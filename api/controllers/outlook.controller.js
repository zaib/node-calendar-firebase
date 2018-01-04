var express = require('express');
var router = express.Router();
var moment = require('moment');
var _ = require('lodash');

var config = require('./../../config/config');
var authHelper = require('./../helpers/outlook.auth.helper');
var outlook = require('node-outlook');

var firebase = require('./../../config/connection.js');
var ref = firebase.ref('users');

router.get('/authorize', function (req, res) {
	var authCode = req.query.code;
	if (authCode) {
		console.log(authCode);
		authHelper.getTokenFromCode(authCode, tokenReceived, req, res);
	} else {
		return res.status(500).json({
			error: '/authorize called without a code parameter'
		});
	}
});

function tokenReceived(req, res, error, token) {
	if (error) {
		console.log('ERROR getting token:' + error);
		return res.json('ERROR getting token: ' + error);
	} else {
		// save tokens in session
		/* req.session.outlook = {};
        req.session.access_token = token.token.access_token;
		req.session.refresh_token = token.token.refresh_token;
        req.session.email = authHelper.getEmailFromIdToken(token.token.id_token); */
		// res.redirect('/logincomplete');

		var auth = {};
		auth.access_token = token.token.access_token;
		auth.refresh_token = token.token.refresh_token;
		auth.email = authHelper.getEmailFromIdToken(token.token.id_token);

		var username = null;
		var counter = 1;
		ref.orderByChild('outlookEmail').equalTo(auth.email).on('value', function (snapshot) {
			if (counter === 1) {
				counter++;
				snapshot.forEach(function (user) {
					username = user.key;
				});
				var payload = {
					outlook: {
						access_token: token.token.access_token,
						refresh_token: token.token.refresh_token,
						email: auth.email
					}
				};
				if (username) {
					ref.child(`/${username}`).update(payload);
					var redirectURL =	config.apps.web.redirectUri + `?username=${username}`;
					res.redirect(redirectURL);
					// return res.json(payload);
				} else {
					return res.status(500).json({
						error: 'email address does not exist in our database.'
					});
				}
			}
		});
	}
}


router.get('/:username/sync', function (req, res) {

	var username = req.params.username;
	var counter = 1;
	ref.child(`/${username}`).once('value').then(function (snapshot) {
		
		var result = snapshot.val();
		
		var token = (result && result.outlook.access_token) ? result.outlook.access_token : undefined;
		var email = (result && result.outlook.email) ? result.outlook.email: undefined;
		var timezone = (result && result.settings.timezone) ? result.settings.timezone: undefined;
		

		if (token === undefined || email === undefined) {
			return res.staus(400).json({
				error: 'bad Request. missing email address or access token.'
			});
		}		
		// Set the endpoint to API v2
		outlook.base.setApiEndpoint('https://outlook.office.com/api/v2.0');
		// Set the user's email as the anchor mailbox
		outlook.base.setAnchorMailbox(email);
		// Set the preferred time zone
		outlook.base.setPreferredTimeZone(timezone);

		// Use the syncUrl if available
		var requestUrl = (req.session.outlook) ? req.session.syncUrl : null;
		if (!requestUrl) {
			// Calendar sync works on the CalendarView endpoint
			requestUrl = outlook.base.apiEndpoint() + '/Me/CalendarView';
		}

		// Set up our sync window from midnight on the current day to
		// midnight 7 days from now.
		var startDate = moment().startOf('day');
		var endDate = moment(startDate).add(30, 'days');
		// The start and end date are passed as query parameters
		var params = {
			startDateTime: startDate.toISOString(),
			endDateTime: endDate.toISOString()
		};

		// Set the required headers for sync
		var headers = {
			Prefer: [
				// Enables sync functionality
				'odata.track-changes',
				// Requests only 5 changes per response
				'odata.maxpagesize=5'
			]
		};

		var apiOptions = {
			url: requestUrl,
			token: token,
			headers: headers,
			query: params
		};

		outlook.base.makeApiCall(apiOptions, function (error, response) {
			console.log(error, response);
			if (error) {
				console.log(JSON.stringify(error));
				res.send(JSON.stringify(error));
			} else {
				if (response.statusCode !== 200) {
					console.log('API Call returned ' + response.statusCode);
					res.send('API Call returned ' + response.statusCode);
				} else {
					var nextLink = response.body['@odata.nextLink'];
					if (nextLink !== undefined) {
						req.session.syncUrl = nextLink;
					}
					var deltaLink = response.body['@odata.deltaLink'];
					if (deltaLink !== undefined) {
						// req.session.syncUrl = deltaLink;
					}

					var result = authHelper.parseOutlookResponse(response.body.value);
					var eventKey;
					var username = req.params.username;

					_.forEach(result, function (event) {
						eventKey = event.id;
						ref.child(`/${username}/events/${eventKey}`).update(event);
					});
					return res.json(result);
				}
			}
		});
	});
});

module.exports = router;
