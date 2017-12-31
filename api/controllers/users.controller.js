var express = require('express');
var router = express.Router();

var firebase = require('./../../config/connection.js');
var ref = firebase.ref('users');
// var settingsRef = ref.child('settings');

/* GET users listing. */
router.get('/', function (req, res, next) {
	res.send('respond with a resource');
});

const getUser = (req, res) => {
	let username = req.params.username;
	ref.child(`/${username}`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
};

/* const saveUserData = (req, res) => {
	// console.log(req.body, req.params.username);
	ref.set({[req.params.username]: req.body});
	return res.json(req.body);
} */

const upsertUser = (req, res) => {

	let username = req.params.username;
	let payload = req.body;
  
  ref.child(`/${username}`).update(req.body);
	return res.json(req.body);
};


const upsertMeeting = (req, res) => {

  let payload = {};
  let meetingKey = (req.params.meetingKey)? req.params.meetingKey: ref.push().key;
  let username = req.params.username;
  
  ref.child(`/${username}/meetings/${meetingKey}`).update(req.body);
	return res.json(req.body);
};


const getMeetingDetail = (req, res) => {
  let username = req.params.username;
  let meetingKey = req.params.meetingKey;
  
	ref.child(`/${username}/meetings/${meetingKey}`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
};

const getMeetingsList = (req, res) => {
  let username = req.params.username;
  let meetingKey = req.params.meetingKey;
  
	ref.child(`/${username}/meetings`).once('value').then(function (snapshot) {
		return res.json(snapshot);
	});
};

router.get('/:username', getUser);

router.post('/:username', upsertUser);
router.put('/:username', upsertUser);

router.post('/:username/meetings', upsertMeeting);
router.post('/:username/meetings/:meetingKey', upsertMeeting);
router.put('/:username/meetings/:meetingKey', upsertMeeting);

router.get('/:username/meetings', getMeetingsList);
router.get('/:username/meetings/:meetingKey', getMeetingDetail);

module.exports = router;
