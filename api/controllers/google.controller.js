const env = process.env.NODE_ENV || 'development';
const config = require('./../../config/config')[env];

const firebase = require('./../../config/connection.js');
const ref = firebase.ref('users');

const errorHelper = require('./../helpers/errors.handler');
const moment = require('moment');
const _ = require('lodash');
const async = require('async');


const util = require('util');
const express = require('express');
const router = express.Router();

const google = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const gcal = require('google-calendar');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// create auth client
const oauth2Client = new OAuth2(
	config.google.consumer_key,
	config.google.consumer_secret,
	config.google.redirectUri
);

const strategy = new GoogleStrategy({
		clientID: config.google.consumer_key,
		clientSecret: config.google.consumer_secret,
		callbackURL: config.google.redirectUri
	},
	function (accessToken, refreshToken, params, profile, done) {

		params.refresh_token = refreshToken;
		params.email = profile.emails[0].value;
		// params.expires_at = parseInt(moment().add(params.expires_in, "s").format("X"));
		params.expires_at = moment().add(1, 'day').unix();

		profile.params = params;

		return done(null, profile);
	}
);
passport.use(strategy);

router.get('/auth', passport.authenticate('google', {
	session: false,
	scope: config.google.permissions,
	accessType: 'offline',
	prompt: 'consent'
}));

router.get('/auth/callback',
	passport.authenticate('google', {
		session: false,
		failureRedirect: '/google/login'
	}),
	function (req, res) {
		// return res.json(req.user);
		let user = req.user;

		if (!req.user) {
			return res.json('ERROR getting token: ');
		} else {
			// return res.json(user);
			let auth = user.params;
			let email = user.params.email;
			let username = '';
			let counter = 1;
			ref.orderByChild('googleEmail').equalTo(email).on('value', function (snapshot) {
				if (counter === 1) {
					counter++;
					snapshot.forEach(function (user) {
						username = user.key;
					});
					var payload = {
						google: auth
					};
					if (username) {
						ref.child(`/${username}`).update(payload);
						// var redirectURL = config.apps.web.redirectUri + `?username=${username}&user=${stringifyData}`;
						var redirectURL = config.apps.web.redirectUri;
						res.redirect(redirectURL);
						// return res.json(payload.outlook);
						// res.redirect(`/google/${req.user.emails[0].value}`);

					} else {
						return res.status(500).json({
							error: 'email address does not exist in our database.'
						});
					}
				}
			});
		}
	});


router.get('/:username/refreshtoken', function (req, res) {
	// check for user
	let username = req.params.username || req.headers.username;
	let refreshAccessToken = req.headers.refresh_token || req.query.refresh_token;
	if (!username || !refreshAccessToken) {
		return res.status(errorHelper.requiredParamMissing.status).json(errorHelper.requiredParamMissing);
	} else {
		let isTokenExpired = false;
		let currentUnixTime = moment(new Date()).unix();
		// set the current users access and refresh token
		oauth2Client.credentials = {
			refresh_token: refreshAccessToken
		};
		// request a new token
		oauth2Client.refreshAccessToken(function (err, token) {
			if (err) {
				return res.json(err);
			}
			token.expires_at = token.expiry_date;
			delete token.expiry_date;
			token.expires_at = moment().add(1, 'day').unix();

			ref.child(`/${username}/google`).update(token);
			return res.json(token);
		});
	}
});

/*
  ===========================================================================
                               Google Calendar
  ===========================================================================
*/

router.all('/', function (req, res) {

	if (!req.session.access_token) return res.redirect('/google/auth');

	//Create an instance from accessToken
	var accessToken = req.session.access_token;

	gcal(accessToken).calendarList.list(function (err, data) {
		if (err) return res.send(500, err);
		return res.send(data);
	});
});

router.get('/:username/sync', function (req, res) {

	let username = req.params.username || req.headers.username;
	let accessToken = req.headers.google_token;
	let calendarId = req.headers.email;
	if (!username || !accessToken || !calendarId) {
		return res.status(errorHelper.usernameError.status).json(errorHelper.usernameError);
	}

	// Set up our sync window from midnight on the current day to
	// midnight 7 days from now.
	let startDate = moment().startOf('day');
	let endDate = moment(startDate).add(30, 'days');
	// The start and end date are passed as query parameters
	let params = {
		start: {
			dateTime: startDate.toISOString()
		},
		end: {
			dateTime: endDate.toISOString()
		}
	};

	gcal(accessToken).events.list(calendarId, params, function (err, data) {
		if (err) return res.status(err.code).json(err);
		let googleEventList = _.filter(data.items, function (item) {
			if (item.creator && item.creator.email === calendarId) {
				return item;
			}
		});
		let filterStartDate = moment(startDate).unix();
		let filterToDate = moment(endDate).unix();
		let responseList = [];
		ref.child(`/${username}/events`).orderByChild("date").startAt(filterStartDate).endAt(filterToDate).once("value").then(function (snapshot) {
			let snapshotVal = snapshot.val();
			let firebaseEventList = (snapshotVal) ? Object.values(snapshotVal) : [];
			_.forEach(googleEventList, function (gEvent) {
				let firebaseEvent = _.find(firebaseEventList, {
					googleEventId: gEvent.id
				});
				let googleEvent = parseGoogelEvent(gEvent);
				let eventId;
				if (firebaseEvent && firebaseEvent.id) {
					eventId = firebaseEvent.id;
				} else {
					eventId = ref.push().key;
					googleEvent.source = 'google';
				}
				googleEvent.id = eventId;
				ref.child(`/${username}/events/${eventId}`).update(googleEvent);
				responseList.push(googleEvent);
			});
			return res.json(responseList);
		}).catch(function (err) {
			return res.json(err);
		});
	});
});

router.get('/:calendarId', function (req, res) {
	return res.json(req.headers);

	if (!req.headers.google_token) return res.redirect('/google/auth');

	//Create an instance from accessToken
	var accessToken = req.headers.google_token;
	var calendarId = req.params.calendarId;

	gcal(accessToken).events.list(calendarId, {
		maxResults: 10000
	}, function (err, data) {
		if (err) return res.send(500, err);

		console.log(data)
		if (data.nextPageToken) {
			gcal(accessToken).events.list(calendarId, {
				maxResults: 10000,
				pageToken: data.nextPageToken
			}, function (err, data) {
				console.log(data.items)
			})
		}
		return res.send(data);
	});
});


router.get('/:calendarId/:eventId', function (req, res) {

	if (!req.session.access_token) return res.redirect('/google/auth');

	//Create an instance from accessToken
	var accessToken = req.session.access_token;
	var calendarId = req.params.calendarId;
	var eventId = req.params.eventId;

	gcal(accessToken).events.get(calendarId, eventId, function (err, data) {
		if (err) return res.send(500, err);
		return res.send(data);
	});
});

router.post('/:calendarId/add', function (req, res) {

	if (!req.session.access_token) return res.redirect('/auth');

	var accessToken = req.session.access_token;
	var calendarId = req.params.calendarId;
	var text = req.query.text || 'Hello World';

	gcal(accessToken).events.quickAdd(calendarId, text, function (err, data) {
		if (err) return res.send(500, err);
		return res.redirect('/' + calendarId);
	});
});

router.put('/:calendarId/:eventId', function (req, res) {

	if (!req.session.access_token) return res.redirect('/auth');

	var accessToken = req.session.access_token;
	var calendarId = req.params.calendarId;
	var text = req.query.text || 'Hello World';

	gcal(accessToken).events.update(calendarId, eventId, text, {}, function (err, data) {
		if (err) return res.send(500, err);
		return res.redirect('/' + calendarId);
	});
});

router.delete('/:calendarId/:eventId/remove', function (req, res) {

	if (!req.session.access_token) return res.redirect('/auth');

	var accessToken = req.session.access_token;
	var calendarId = req.params.calendarId;
	var eventId = req.params.eventId;

	gcal(accessToken).events.delete(calendarId, eventId, function (err, data) {
		if (err) return res.send(500, err);
		return res.redirect('/' + calendarId);
	});
});


function parseGoogelEvent(event) {
	let parsedEvent = {};
	if (event) {
		parsedEvent = {
			googleEventId: event.id,
			subject: event.summary,
			// body: event.Body.Content,
			fromTime: moment(event.start.dateTime).unix(),
			toTime: moment(event.end.dateTime).unix(),
			date: moment(event.start.dateTime, 'YYYY-MM-DD').unix(),
			location: (event.location) ? event.location : '',
			type: 'appointment'
		};
	}
	return parsedEvent;
}

module.exports = router;
