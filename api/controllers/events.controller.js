var express = require('express');
var router = express.Router();
var _ = require('lodash');

var firebase = require('./../../config/connection.js');
var ref = firebase.ref('users');


var getAllEvents = function getAllEvents(req, res){
	var username = req.params.username;
	ref.child(`/${username}/events`).once('value').then(function (response) {
		var result = response.val();
		var events = Object.values(result);
		return res.json(events);
  });
};
router.get('/:username', getAllEvents);

var getEventDetail = function getEventDetail(req, res) {
	var username = req.params.username;
	var eventKey = req.params.eventKey;
	ref.child(`/${username}/events/${eventKey}`).once('value').then(function (response) {
		return res.json(response);
	});
};
router.get('/:username/:eventKey', getEventDetail);

var upsertEvent = function upsertEvent(req, res) {
	var payload = {};
	payload = req.body;
	
	var username = req.params.username;
	var eventKey = (req.params.eventKey) ? req.params.eventKey : ref.push().key;

	if(username && eventKey) {
		ref.child(`/${username}/events/${eventKey}`).update(payload);
		return res.json(payload);
	} else {
		var error = "param missing";
		return res.json({error});
	}
};
router.post('/:username', upsertEvent);
router.post('/:username/:eventKey', upsertEvent);
router.put('/:username/:eventKey', upsertEvent);

module.exports = router;
