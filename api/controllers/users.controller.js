var express = require('express');
var router = express.Router();

var firebase = require('./../../config/connection.js');
var ref = firebase.ref('users');

/* GET users listing. */
router.get('/', function (req, res, next) {
	res.send('respond with a resource');
});

router.get('/:username', function (req, res) {
	var username = req.params.username;
	ref.child(`/${username}`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
});


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


var upsertMeeting = function upsertMeeting(req, res) {
	var payload = {};
	payload = req.body;
	
	var username = req.params.username;
	var meetingKey = (req.params.meetingKey) ? req.params.meetingKey : ref.push().key;

	ref.child(`/${username}/meetings/${meetingKey}`).update(payload);
	return res.json(payload);
};
router.post('/:username/meetings', upsertMeeting);
router.post('/:username/meetings/:meetingKey', upsertMeeting);
router.put('/:username/meetings/:meetingKey', upsertMeeting);


var getMeetingsList = function getMeetingsList(req, res){
	var username = req.params.username;
	var meetingKey = req.params.meetingKey;

	ref.child(`/${username}/meetings`).once('value').then(function (snapshot) {
		return res.json(snapshot);
  });
};
router.get('/:username/meetings', getMeetingsList);

var getMeetingDetail = function getMeetingDetail(req, res) {
	var username = req.params.username;
	var meetingKey = req.params.meetingKey;

	ref.child(`/${username}/meetings/${meetingKey}`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
};
router.get('/:username/meetings/:meetingKey', getMeetingDetail);

module.exports = router;
