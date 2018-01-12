const env = process.env.NODE_ENV || 'development';
const config = require('./../../config/config')[env];

const express = require('express');
const router = express.Router();
const moment = require('moment');
const _ = require('lodash');
const async = require('async');

const DEFAULT = require('./../../config/constants.js');

const outlookAuthHelper = require('./../helpers/outlook.auth.helper');
const errorHelper = require('./../helpers/errors.handler');

const outlook = require('node-outlook');

const firebase = require('./../../config/connection.js');
const ref = firebase.ref('users');

router.get('/authorize', function (req, res) {
	var authCode = req.query.code;
	if (authCode) {
		outlookAuthHelper.getTokenFromCode(authCode, tokenReceived, req, res);
	} else {
		return res.status(500).json({
			error: '/authorize called without a code parameter'
		});
	}
});

function tokenReceived(req, res, error, auth) {
	if (error) {
		console.log('ERROR getting token:' + error);
		return res.json('ERROR getting token: ' + error);
	} else {

		auth.token.expires_at = moment(auth.token.expires_at).unix();
		auth.token.email = outlookAuthHelper.getEmailFromIdToken(auth.token.id_token);
		let email = auth.token.email;
		var username = '';
		var counter = 1;
		ref.orderByChild('outlookEmail').equalTo(email).on('value', function (snapshot) {
			// return res.json(token)
			if (counter === 1) {
				counter++;
				snapshot.forEach(function (user) {
					username = user.key;
				});
				var payload = {
					outlook: auth.token
				};
				var stringifyData = JSON.stringify(payload.outlook);
				if (username) {
					ref.child(`/${username}`).update(payload);
					// var redirectURL = config.apps.web.redirectUri + `?username=${username}&user=${stringifyData}`;
					var redirectURL = config.apps.web.redirectUri;
					res.redirect(redirectURL);
					// return res.json(payload.outlook);
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

		var token = (result && result.outlook && result.outlook.access_token) ? result.outlook.access_token : undefined;
		var email = (result && result.outlook && result.outlook.email) ? result.outlook.email : undefined;
		var timezone = (result && result.settings && result.settings.timezone) ? result.settings.timezone : 'America/New_York';

		if (!token || !email) {
			return res.status(400).json({
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
			if (error) {
				res.send(JSON.stringify(error));
			} else {
				if (response.statusCode !== 200) {
					res.send('API Call returned ' + response.statusCode);
				} else {
					let nextLink = response.body['@odata.nextLink'];
					if (nextLink !== undefined) {
						req.session.syncUrl = nextLink;
					}
					let deltaLink = response.body['@odata.deltaLink'];
					if (deltaLink !== undefined) {
						// req.session.syncUrl = deltaLink;
					}

					let outlookEventList = outlookAuthHelper.parseOutlookResponse(response.body.value);

					let filterStartDate = moment(startDate).unix();
					let filterToDate = moment(endDate).unix();

					let firebaseEventList = [];
					ref.child(`/${username}/events`).orderByChild("date").startAt(filterStartDate).endAt(filterToDate).once("value").then(function (snapshot) {
						var snapshotVal = snapshot.val();
						firebaseEventList = (snapshotVal) ? Object.values(snapshotVal) : [];

						_.forEach(outlookEventList, function (outlookEvent) {
							let firebaseEvent = _.find(firebaseEventList, {
								outlookEventId: outlookEvent.outlookEventId
							});

							let eventId;
							if (firebaseEvent && firebaseEvent.id) {
								eventId = firebaseEvent.id;
							} else {
								eventId = ref.push().key;
								outlookEvent.source = 'outlook';
							}

							outlookEvent.id = eventId;
							ref.child(`/${username}/events/${eventId}`).update(outlookEvent);
						});
						return res.json(outlookEventList);
					}).catch(function (err) {
						return res.json(err);
					});
				}
			}
		});
	});
});


function refreshedTokenReceived(req, res, error, auth) {
	if (error) {
		return res.json('ERROR getting token: ' + error);
	} else {
		return res.json(auth);
	}
}

router.get('/:username/refreshtoken', (req, res) => {
	let username = req.params.username || req.headers.username;
	if (!username) {
		return res.status(errorHelper.usernameError.status).json(errorHelper.usernameError);
	} else {
		ref.child(`/${username}/outlook`).once('value').then(function (snapshot) {
			let snapshotVal = snapshot.val();
			let currentUnixTime = moment(new Date()).unix();
			let isTokenExpired = (snapshotVal) ? moment(currentUnixTime).isAfter(snapshotVal.expires_at) : false;
			let refresh_token = (snapshotVal) ? snapshotVal.refresh_token : false;
			if (true || isTokenExpired && refresh_token) {
				outlookAuthHelper.getTokenFromRefreshToken(refresh_token, function refreshedTokenReceived(req, res, error, auth) {
					if (error) {
						return res.json('ERROR getting token: ' + error);
					} else {
						auth.token.expires_at = moment(auth.token.expires_at).unix();
						let refreshedToken = auth.token;
						ref.child(`/${username}/outlook`).update(refreshedToken);			
						return res.json(refreshedToken);
					}
				}, req, res);
			} else {
				return res.status(errorHelper.usernameError.status).json(errorHelper.usernameError);
			}
		}).catch(function (err) {
			return res.json(err);
		});
	}
});

var createEvent = function (req, res) {
	var username = req.params.username;
	var access_token = req.headers.access_token || req.query.access_token;
	var eventData = req.body;
	var eventId = req.body.id;

	if (!eventId || !access_token) {
		return res.status(400).json({
			error: 'event id or access token is missing.'
		});
	}

	var newEvent = {
		'Subject': eventData.subject,
		'Body': {
			'ContentType': 'TEXT',
			'Content': eventData.body
		},
		'Start': {
			'DateTime': eventData.fromTime,
			'TimeZone': eventData.timezone || DEFAULT.timezone,
		},
		'End': {
			'DateTime': eventData.toTime,
			'TimeZone': eventData.timezone || DEFAULT.timezone,
		},
		'Location': {
			'DisplayName': eventData.location,
		}
	};

	var createEventParameters = {
		token: access_token,
		event: newEvent
	};

	outlook.calendar.createEvent(createEventParameters, function (error, event) {
		if (error) {
			return res.status(500).json(event);
		} else {
			let outlookEvent = outlookAuthHelper.parseOutlookEvent(event);
			eventData.outlookEventId = outlookEvent.outlookEventId;
			ref.child(`/${username}/events/${eventId}`).update(eventData).then(function (result) {
				return res.json(outlookEvent);
			});
		}
	});
};
router.post('/:username/events', createEvent);

var updateEvent = function (req, res) {
	var eventId = req.params.id;
	var username = req.params.username;
	var access_token = req.headers.access_token || req.query.access_token;

	if (!eventId || !access_token) {
		return res.status(400).json({
			error: 'event id or access token is missing.'
		});
	}

	var eventData = req.body;
	var updatePayload = {
		'Subject': eventData.subject,
		'Body': {
			'ContentType': 'TEXT',
			'Content': eventData.body
		},
		'Start': {
			'DateTime': eventData.fromTime,
			'TimeZone': eventData.timezone || DEFAULT.timezone,
		},
		'End': {
			'DateTime': eventData.toTime,
			'TimeZone': eventData.timezone || DEFAULT.timezone,
		},
		'Location': {
			'DisplayName': eventData.location
		},
		'Organizer': {
			'EmailAddress': {
				'Name': eventId,
			}
		}
	};

	var updateEventParameters = {
		token: access_token,
		eventId: eventData.outlookEventId,
		update: updatePayload
	};

	outlook.calendar.updateEvent(updateEventParameters, function (error, event) {
		if (error) {
			return res.status(500).json(event);
		} else {
			return res.json(event);
		}
	});
};
router.post('/:username/events/:id', updateEvent);
router.put('/:username/events/:id', updateEvent);

router.delete('/:username/events/:id', function (req, res) {
	var eventId = req.params.id;
	var username = req.params.username;
	var access_token = req.headers.access_token || req.query.access_token;

	if (!eventId || access_token === undefined) {
		return res.status(400).json({
			error: 'event id or access token is missing.'
		});
	}

	var deleteEventParameters = {
		token: access_token,
		eventId: eventId
	};

	async.waterfall([
		function (cb) {
			ref.child(`/${username}/events/${eventId}`).once('value').then(function (snapshot) {
				let snapshotVal = snapshot.val();
				cb(null, snapshotVal);
			});
		},
		function (event, cb) {
			if (accessToken) {
				var deleteEventParameters = {
					token: accessToken,
					eventId: event.outlookEventId
				};
				outlook.calendar.deleteEvent(deleteEventParameters, function (error, event) {
					return res.json(event);
					if (error) {
						cb(true, event);
					} else {
						let result = {
							success: 'event is delete from outlook calendar.'
						};
						cb(null, result);
					}
				});
			} else {
				cb(null, event);
			}
		}
	], function (error, data) {
		if (error) {
			return res.json(data);
		} else {
			return res.json(data);
		}
	});
});

module.exports = router;
