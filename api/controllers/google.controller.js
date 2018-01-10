const env = process.env.NODE_ENV || 'development';
var config = require('./../../config/config')[env];

var firebase = require('./../../config/connection.js');
var ref = firebase.ref('users');

var moment = require('moment');
var _ = require('lodash');

var util = require('util');
var express = require('express');
var router = express.Router();

var gcal = require('google-calendar');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(new GoogleStrategy({
		clientID: config.google.consumer_key,
		clientSecret: config.google.consumer_secret,
		callbackURL: config.google.redirectUri,
		scope: config.google.permissions,
		// accessType: 'offline', 
		// approvalPrompt: 'force'
		// prompt: 'consent'
		// accessType: 'offline',
		// approvalPrompt: 'force'
	},
	function (accessToken, refreshToken, profile, done) {
		profile.access_token = accessToken;
		// profile.refreshToken = refreshToken;
		profile.email = profile.emails[0].value;
		return done(null, profile);
	}
));

router.get('/auth', passport.authenticate('google', {
	session: false
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
			var auth = {};
			auth.access_token = user.access_token;
			auth.email = user.email;
			// auth.refresh_token = token.token.refresh_token;

			let username = '';
			let counter = 1;
			ref.orderByChild('googleEmail').equalTo(user.email).on('value', function (snapshot) {
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

router.all('/sync', function (req, res) {

	if (!req.headers.google || !req.headers.google.access_token) {
		return res.status(400).json({
			headers: req.headers,
			error: 'Invalid google access Token'
		});
	}

	//Create an instance from accessToken
	let username = req.headers.username;
	let accessToken = req.headers.google.access_token;
	let calendarId = req.headers.google.email;
	console.log(calendarId);
	// Set up our sync window from midnight on the current day to
	// midnight 7 days from now.
	let startDate = moment().startOf('day');
	let endDate = moment(startDate).add(2, 'days');
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
		if (err) return res.status(500).json(err);

		let googleEventList = _.filter(data.items, function (item) {
			if (item.creator && item.creator.email === calendarId) {
				return item;
			}
		});
		let filterStartDate = moment(startDate).unix();
		let filterToDate = moment(endDate).unix();
		let firebaseEventList = [];
		let responseList = [];
		ref.child(`/${username}/events`).orderByChild("date").startAt(filterStartDate).endAt(filterToDate).once("value").then(function (snapshot) {
			var snapshotVal = snapshot.val();
			firebaseEventList = (snapshotVal) ? Object.values(snapshotVal) : [];

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

		// return res.send(result);
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
