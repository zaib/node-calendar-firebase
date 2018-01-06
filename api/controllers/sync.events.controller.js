const express = require('express');
const router = express.Router();
const moment = require('moment');
const _ = require('lodash');
const async = require('async');
const outlook = require('node-outlook');
const outlookAuthHelper = require('./../helpers/outlook.auth.helper');
const DEFAULT = require('./../../config/constants.js');

const firebase = require('./../../config/connection.js');
const ref = firebase.ref('users');

const payloadCheck = require('payload-validator');
const eventSchema = {
	subject: '', // '' means data type is string 
	fromTime: 0, // 0 means data type is number
	toTime: 0,
	date: 0,
	location: '',
	type: '',
	source: '',
};
const requiredFields = [];
const isNullValuesAllowed = false;


var getAllEvents = function getAllEvents(req, res) {
	let username = req.params.username;

	let fromDate = req.query.fromDate;
	let toDate = req.query.toDate;

	if (fromDate && toDate) {

		fromDate = moment(fromDate).unix();
		toDate = moment(toDate).unix();

		ref.child(`/${username}/events`).orderByChild("date").startAt(fromDate).endAt(toDate).once("value").then(function (snapshot) {
			var snapshotVal = snapshot.val();
			let events =  (snapshotVal) ? Object.values(snapshotVal) : [];
			return res.json(events);			
		}).catch(function (err) {
			return res.json(err);
		});

	} else {
		ref.child(`/${username}/events`).once('value').then(function (snapshot) {
			let events = Object.values(snapshot.val());
			return res.json(events);
		}).catch(function (err) {
			return res.json(err);
		});
	}
};
router.get('/:username', getAllEvents);

var getEventDetail = function getEventDetail(req, res) {
	let username = req.params.username;
	let eventKey = req.params.id;
	ref.child(`/${username}/events/${eventKey}`).once('value').then(function (response) {
		return res.json(response);
	});
};
router.get('/:username/:id', getEventDetail);

var createEvent = function createEvent(req, res) {

	let accessToken = req.headers.access_token || req.query.access_token;
	let username = req.params.username;

	let payload = req.body;
	payload.id = ref.push().key;
	let eventId = payload.id;

	// conver fromTime/toTime to unix timestamp
	payload.date = moment(payload.fromTime, 'YYYY-MM-DD').unix();
	payload.fromTime = moment(payload.fromTime).unix();
	payload.toTime = moment(payload.toTime).unix();	

	// payload validation
	let schemaValidation = payloadCheck.validator(payload, eventSchema, requiredFields, isNullValuesAllowed);
	if (!schemaValidation.success) {
		return res.json(schemaValidation);
	}
	
	let userSettings = {};
	let outlookEvent = {};
	let firebaseEvent = {};

	async.waterfall([
		function(cb) {
			var username = req.params.username;
			ref.child(`/${username}/settings`).once('value').then(function (snapshot) {
				userSettings = snapshot.val();
				cb(null, userSettings);
			});
		},
		function (user, cb) {
			firebaseEvent = payload;
			ref.child(`/${username}/events/${eventId}`).set(firebaseEvent);
			cb(null, firebaseEvent);
		},
		function (event, cb) {
			if (accessToken) {
				let eventData = event;
				let newEvent = {
					'Subject': eventData.subject,
					'Body': {
						'ContentType': 'HTML',
						'Content': (eventData.body) ? eventData.body : ""
					},
					'Start': {
						'DateTime': eventData.fromTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'End': {
						'DateTime': eventData.toTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,						
					},
					'Location': {
						'DisplayName': (userSettings && userSettings.location) ? userSettings.location : '',	 
					}
				};

				let createEventParameters = {
					token: accessToken,
					event: newEvent
				};
				// return res.json(createEventParameters);

				outlook.calendar.createEvent(createEventParameters, function (error, event) {
					if(event.statusCode && event.statusCode !== 200) {
						cb(event);					
					} else {
						outlookEvent = outlookAuthHelper.parseOutlookEvent(event);
						cb(null, outlookEvent);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function (event, cb) {
			ref.child(`/${username}/events/${eventId}`).update(event);
			cb(null, event);
		}
	], function (error, data) {
		if(error) {
			return res.json(error);
		} else {
			let result = _.assign({}, firebaseEvent, outlookEvent);
			return res.json(result);
		}
	});

};
router.post('/:username', createEvent);


var updateEvent = function updateEvent(req, res) {

	let accessToken = req.headers.access_token || req.query.access_token;
	let username = req.params.username;
	
	let payload = req.body;
	payload.id = req.params.id;
	let eventId = req.params.id;

	// conver fromTime/toTime to unix timestamp
	payload.date = moment(payload.fromTime, 'YYYY-MM-DD').unix();
	payload.fromTime = moment(payload.fromTime).unix();
	payload.toTime = moment(payload.toTime).unix();	

	// payload validation
	let schemaValidation = payloadCheck.validator(payload, eventSchema, requiredFields, isNullValuesAllowed);
	if (!schemaValidation.success) {
		return res.json(schemaValidation);
	}
	
	let userSettings = {};
	let outlookEvent = {};
	let firebaseEvent = {};

	async.waterfall([
		function(cb) {
			ref.child(`/${username}`).once('value').then(function (snapshot) {
				userSettings = snapshot.val();
				cb(null, userSettings);
			});
		},
		function (user, cb) {
			firebaseEvent = payload;
			ref.child(`/${username}/events/${eventId}`).update(firebaseEvent);
			cb(null, firebaseEvent);
		},
		function(event, cb) {
			ref.child(`/${username}/events/${eventId}`).once('value').then(function (snapshot) {
				firebaseEvent = snapshot.val();
				cb(null, firebaseEvent);
			});
		},
		function (event, cb) {
			if (accessToken) {
				let eventData = event;
				var updatePayload = {
					'Subject': eventData.subject,
					'Body': {
						'ContentType': 'HTML',
						'Content': eventData.body
					},
					'Start': {
						'DateTime': eventData.fromTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,
					},
					'End': {
						'DateTime': eventData.toTime,
						'TimeZone': (userSettings && userSettings.timezone) ? userSettings.timezone : DEFAULT.timezone,						
					},
					'Location': {
						'DisplayName': (userSettings && userSettings.location) ? userSettings.location : '',	 
					}
				};

				let updateEventParameters = {
					token: accessToken,
					eventId: eventData.outlookEventId,
					update: updatePayload
				};
				outlook.calendar.updateEvent(updateEventParameters, function (error, event) {
					if(event.statusCode && event.statusCode !== 200) {
						error = {message: 'error received while creating an event on outlook calendar.'};
						cb(true, event);					
					} else {
						outlookEvent = outlookAuthHelper.parseOutlookEvent(event);
						cb(null, outlookEvent);
					}
				});
			} else {
				cb(null, event);
			}
		},
		function (event, cb) {
			ref.child(`/${username}/events/${eventId}`).update(event);
			cb(null, event);
		}
	], function (error, data) {
		if(error) {
			return res.json(data);
		} else {
			let result = _.assign({}, firebaseEvent, outlookEvent);
			return res.json(result);
		}
	});
};
router.post('/:username/:id', updateEvent);
router.put('/:username/:id', updateEvent);


var deleteEvent = function upsertEvent(req, res) {

	let accessToken = req.headers.access_token || req.query.access_token;
	let username = req.params.username;
	let eventId = req.params.id;

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
					if (error) {
						console.log(error);
						res.send(error);
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
		},
		function (event, cb) {
			ref.child(`/${username}/events/${eventId}`).remove().then((err) => console.log(err));
			cb(null, event);
		},
	], function (error, data) {
		return res.json(data);
	});
};

router.delete('/:username/:id', deleteEvent);

module.exports = router;
