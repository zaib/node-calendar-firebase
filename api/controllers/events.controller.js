const express = require('express');
const router = express.Router();

const firebase = require('./../../config/connection.js');
const ref = firebase.ref('users');

const moment = require('moment');
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
			var snapshotVal = snapshot.val();
			let events =  (snapshotVal) ? Object.values(snapshotVal) : [];
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

	ref.child(`/${username}/events/${eventId}`).set(payload);
	return res.json(payload);
};
router.post('/:username', createEvent);

var updateEvent = function updateEvent(req, res) {
	let username = req.params.username;
	let eventId = req.params.id;

	let payload = req.body;
	payload.id = eventId;
	
	// conver fromTime/toTime to unix timestamp
	payload.date = moment(payload.fromTime, 'YYYY-MM-DD').unix();
	payload.fromTime = moment(payload.fromTime).unix();
	payload.toTime = moment(payload.toTime).unix();

	// payload validation	
	var schemaValidation = payloadCheck.validator(payload, eventSchema, requiredFields, isNullValuesAllowed);
	if (!schemaValidation.success) {
		return res.json(schemaValidation);
	}

	ref.child(`/${username}/events/${eventId}`).update(payload).then(function (result) {
		return res.json(payload);
	}).catch(function(err) {
		return res.json(err);
	});
};
router.post('/:username/:id', updateEvent);
router.put('/:username/:id', updateEvent);

var deleteEvent = function upsertEvent(req, res) {
	let username = req.params.username;
	let eventId = req.params.id;
	ref.child(`/${username}/events/${eventId}`).remove().then(function (result) {
		return res.json({
			message: 'event deleted.'
		});
	});
};
router.delete('/:username/:id', deleteEvent);

module.exports = router;
