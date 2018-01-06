var express = require('express');
var router = express.Router();

var firebase = require('./../../config/connection.js');
var ref = firebase.ref('users');

var payloadCheck = require('payload-validator');
var userSettingsSchema = {
	location: '',
	timezone: '',
	meetingDuration: [0, 0, 0, 0],
	studentMeetingLimit: 0,
	timeLimitBeforeSchedule: 0,
};
var requiredFields = [];
var isNullValuesAllowed = false;

/* GET users listing. */
router.get('/', function (req, res, next) {
	res.send('Users -> OK');
});

var getUser = function getUser(req, res) {
	var username = req.params.username;
	ref.child(`/${username}`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
};
router.get('/:username', getUser);

var upsertUser = function upsertUser(req, res) {
	var username = req.params.username;
	var payload = {};
	payload = req.body;
	payload.username = username;
	ref.child(`/${username}`).update(payload);
	return res.json(payload);
};
router.post('/:username', upsertUser);
router.put('/:username', upsertUser);

var deleteUser = function (req, res) {
	var username = req.params.username;
	ref.child(`/${username}`).remove().then((err) => console.log(err));
	return res.json({
		message: 'record deleted.'
	});
};
router.delete('/:username', deleteUser);

var getUserSettings = function getUserSettings(req, res) {
	var username = req.params.username;
	ref.child(`/${username}/settings`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
};
router.get('/:username/settings', getUserSettings);

var upsertUserSettings = function upsertUserSettings(req, res) {
	var username = req.params.username;
	var payload = req.body;

	var schemaValidation = payloadCheck.validator(payload, userSettingsSchema, requiredFields, isNullValuesAllowed);
	if (!schemaValidation.success) {
		return res.json(schemaValidation);
	}

	ref.child(`/${username}/settings`).update(payload);
	return res.json(payload);
};
router.post('/:username/settings', upsertUserSettings);
router.put('/:username/settings', upsertUserSettings);

module.exports = router;
