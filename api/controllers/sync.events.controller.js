const express = require('express');
const router = express.Router();
const moment = require('moment');
const _ = require('lodash');
const async = require('async');
var gcal = require('google-calendar');
const outlook = require('node-outlook');
const outlookAuthHelper = require('./../helpers/outlook.auth.helper');
const DEFAULT = require('./../../config/constants.js');

const firebase = require('./../../config/connection.js');
const ref = firebase.ref('users');

const payloadCheck = require('payload-validator');
const eventSchema = {
	subject: '', // '' means data type is string 
	fromTime: '', // 0 means data type is number
	toTime: '',
	type: ''
};
const requiredFields = [];
const isNullValuesAllowed = false;


const getAllEvents = function getAllEvents(req, res) {
	let username = req.params.username;

	let fromDate = req.query.fromDate;
	let toDate = req.query.toDate;

	if (fromDate && toDate) {

		fromDate = moment(fromDate).unix();
		toDate = moment(toDate).unix();

		ref.child(`/${username}/events`).orderByChild("date").startAt(fromDate).endAt(toDate).once("value").then(function (snapshot) {
			let snapshotVal = snapshot.val();
			let events = (snapshotVal) ? Object.values(snapshotVal) : [];
			return res.json(events);
		}).catch(function (err) {
			return res.json(err);
		});

	} else {
		ref.child(`/${username}/events`).once('value').then(function (snapshot) {
			let snapshotVal = snapshot.val();
			let events = (snapshotVal) ? Object.values(snapshotVal) : [];
			return res.json(events);
		}).catch(function (err) {
			return res.json(err);
		});
	}
};
router.get('/:username', getAllEvents);

const getEventDetail = function getEventDetail(req, res) {
	let username = req.params.username;
	let eventKey = req.params.id;
	ref.child(`/${username}/events/${eventKey}`).once('value').then(function (response) {
		return res.json(response);
	});
};
router.get('/:username/:id', getEventDetail);

const createEvent = function createEvent(req, res) {

	let accessToken = req.headers.access_token || req.query.access_token;
	let username = req.params.username;

	let payload = req.body;
	payload.id = ref.push().key;
	let eventId = payload.id;

	// payload validation
	let schemaValidation = payloadCheck.validator(payload, eventSchema, requiredFields, isNullValuesAllowed);
	if (!schemaValidation.success) {
		return res.status(500).json(schemaValidation);
	}

	// conver fromTime/toTime to unix timestamp
	let formatedFromTime = moment(payload.fromTime).format(DEFAULT.outlookTimeFormat);
	let formatedToTime = moment(payload.toTime).format(DEFAULT.outlookTimeFormat);

	payload.date = moment(payload.fromTime, 'YYYY-MM-DD').unix();
	payload.fromTime = moment(payload.fromTime).unix();
	payload.toTime = moment(payload.toTime).unix();
	payload.source = 'connecpath';

	let eventData = payload;

	let userSettings = {};
	let outlookEvent = {};
	let firebaseEvent = payload;

	async.waterfall([
		function (cb) {
			ref.child(`/${username}/settings`).once('value').then(function (snapshot) {
				userSettings = snapshot.val();
				cb(null, firebaseEvent);
			});
		},
		function (event, cb) {
			if (accessToken) {
				let eventData = event;
				let newEvent = {
					'Subject': eventData.subject,
					'Body': {
						'ContentType': 'Text',
						'Content': (eventData.body) ? eventData.body : ''
					},
					'Start': {
						'DateTime': formatedFromTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'End': {
						'DateTime': formatedToTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'Location': {
						'DisplayName': (eventData.location) ? eventData.location : userSettings.location,
					}
				};

				let createEventParameters = {
					token: accessToken,
					event: newEvent
				};

				outlook.calendar.createEvent(createEventParameters, function (error, data) {
					if (event.statusCode && event.statusCode !== 200) {
						cb(data);
					} else {
						outlookEvent = outlookAuthHelper.parseOutlookEvent(data);
						eventData.outlookEventId = outlookEvent.outlookEventId;
						cb(null, outlookEvent);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function (event, cb) {
			if (req.headers.google && req.headers.google.access_token && req.headers.google.email) {
				let googleToken = req.headers.google.access_token;
				let calendarId = req.headers.google.email;
			
				let payload = {
					'summary': eventData.subject,
					'location': eventData.location,
					'description': eventData.body,
					'start': {
						'dateTime': formatedFromTime,
						'timeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'end': {
						'dateTime': formatedToTime,
						'timeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					// 'recurrence': ['RRULE:FREQ=DAILY;COUNT=2'],
					'recurrence': [],
					'attendees': [{
						'email': calendarId
					}],
					'reminders': {
						'useDefault': false,
						'overrides': [{
								'method': 'email',
								'minutes': 24 * 60
							},
							{
								'method': 'popup',
								'minutes': 10
							},
						],
					},
				};
				gcal(googleToken).events.insert(calendarId, payload, {}, function (err, data) {
					if (err) {
						cb(err);
					} else {
						eventData.googleEventId = data.id;
						cb(null, event);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function (event, cb) {
			event.id = eventId;
			ref.child(`/${username}/events/${eventId}`).set(eventData);
			firebaseEvent = eventData;
			cb(null, event);
		},
	], function (error, data) {
		if (error) {
			return res.json(error);
		} else {
			let result = _.assign({}, firebaseEvent, outlookEvent);
			return res.json(result);
		}
	});
};
router.post('/:username', createEvent);


const updateEvent = function updateEvent(req, res) {

	let accessToken = req.headers.access_token || req.query.access_token;
	let username = req.params.username;

	let payload = {};
	payload = req.body;
	payload.id = req.params.id;
	let eventId = req.params.id;

	// payload validation
	let schemaValidation = payloadCheck.validator(payload, eventSchema, requiredFields, isNullValuesAllowed);
	if (!schemaValidation.success) {
		return res.status(500).json(schemaValidation);
	}

	// conver fromTime/toTime to unix timestamp
	let formatedFromTime = moment(payload.fromTime).format(DEFAULT.outlookTimeFormat);
	let formatedToTime = moment(payload.toTime).format(DEFAULT.outlookTimeFormat);

	payload.date = moment(payload.fromTime, 'YYYY-MM-DD').unix();
	payload.fromTime = moment(payload.fromTime).unix();
	payload.toTime = moment(payload.toTime).unix();
	// payload.source = 'connecpath';
	
	let eventData = payload;
	
	let userSettings = {};
	let outlookEvent = {};
	let firebaseEvent = {};
	
	async.waterfall([
		function (cb) {
			ref.child(`/${username}/settings`).once('value').then(function (snapshot) {
				userSettings = snapshot.val();
				cb(null, userSettings);
			});
		},
		function (user, cb) {
			ref.child(`/${username}/events/${eventId}`).once('value').then(function (snapshot) {
				firebaseEvent = snapshot.val();
				cb(null, firebaseEvent);
			});
		},
		function (event, cb) {
			if (accessToken && firebaseEvent.outlookEventId) {
				var updatePayload = {
					'Subject': eventData.subject,
					'Body': {
						'ContentType': 'TEXT',
						'Content': eventData.body
					},
					'Start': {
						'DateTime': formatedFromTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'End': {
						'DateTime': formatedToTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'Location': {
						'DisplayName': (eventData.location) ? eventData.location : userSettings.location,						
					}
				};

				let updateEventParameters = {
					token: accessToken,
					eventId: eventData.outlookEventId,
					update: updatePayload
				};

				outlook.calendar.updateEvent(updateEventParameters, function (error, event) {
					if (event.statusCode && event.statusCode !== 200) {
						error = {
							message: 'error received while updating an event on outlook calendar.'
						};
						cb(true, event);
					} else {
						// outlookEvent = outlookAuthHelper.parseOutlookEvent(event);
						cb(null, event);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function (event, cb) {
			if (req.headers.google && req.headers.google.access_token && req.headers.google.email) {
			
				let googleToken = req.headers.google.access_token;
				let calendarId = req.headers.google.email;
				
				let googleEventPayload = {
					'summary': eventData.subject,
					'location': eventData.location,
					'description': eventData.body,
					'start': {
						'dateTime': formatedFromTime,
						'timeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'end': {
						'dateTime': formatedToTime,
						'timeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					// 'recurrence': ['RRULE:FREQ=DAILY;COUNT=2'],
					'recurrence': [],
					'attendees': [{
						'email': calendarId
					}],
					'reminders': {
						'useDefault': false,
						'overrides': [{
								'method': 'email',
								'minutes': 24 * 60
							},
							{
								'method': 'popup',
								'minutes': 10
							},
						],
					},
				};
				gcal(googleToken).events.update(calendarId, eventData.googleEventId, googleEventPayload, {}, function (err, data) {
					if (err) {
						cb(err);
					} else {
						cb(null, event);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function (event, cb) {
			ref.child(`/${username}/events/${eventId}`).update(eventData);
			cb(null, eventData);
		}
	], function (error, data) {
		if (error) {
			return res.json(error);
		} else {
			// let result = _.assign({}, firebaseEvent, outlookEvent);
			return res.json(data);
		}
	});
};
router.post('/:username/:id', updateEvent);
router.put('/:username/:id', updateEvent);


var deleteEvent = function deleteEvent(req, res) {

	let accessToken = req.headers.access_token || req.query.access_token;
	let username = req.params.username;
	let googleToken = req.headers.google.access_token;
	let calendarId = req.headers.google.email;
	let eventId = req.params.id;

	async.waterfall([
		function (cb) {
			ref.child(`/${username}/events/${eventId}`).once('value').then(function (snapshot) {
				let snapshotVal = snapshot.val();
				cb(null, snapshotVal);
			});
		},
		function (event, cb) {
			if (accessToken && event && event.outlookEventId) {
				var deleteEventParameters = {
					token: accessToken,
					eventId: event.outlookEventId
				};
				outlook.calendar.deleteEvent(deleteEventParameters, function (error, result) {
					if (error) {
						cb(error);						
					} else {
						cb(null, event);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function(event, cb) {
			if (googleToken && calendarId && event.googleEventId) {

				gcal(googleToken).events.delete(calendarId, event.googleEventId, {}, function (err, data) {
					if (err) {
						cb(err);
					} else {
						cb(null, event);
					}
				});
			} else {
				cb(null, event);				
			}
		},
		function (event, cb) {
			ref.child(`/${username}/events/${eventId}`).remove().then((err) => console.log(err));
			cb(null, event);
		},
	], function (error, data) {
		if(error) {
			return res.json(error);
		} else {
			return res.json(data);
		}
	});
};
router.delete('/:username/:id', deleteEvent);

module.exports = router;
