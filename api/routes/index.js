
const env = process.env.NODE_ENV || 'development';
var config = require('./../../config/config')[env];

var express = require('express');
var router = express.Router();
var authHelper = require('./../helpers/outlook.auth.helper');
var outlook = require('node-outlook');
var moment = require('moment');
var rp = require('request-promise');

/* GET home page. */
router.get('/', function (req, res, next) {
	var authUrl = authHelper.getAuthUrl();
	res.render('index', {
		title: 'Express',
		authUrl: authUrl
	});
});

router.get('/dashboard', function (req, res, next) {
	// res.json(req.query);
	res.render('dashboard', {
		title: 'Express'
	});
	/* var username = req.query.username;
	var endpoint = config.apps.api.baseUrl + `/users/${username}`;
	rp(endpoint)
    .then(function (result) {
		var data = JSON.parse(result);
		res.render('dashboard', {
			title: 'Express',
			data: data
		});
    })
    .catch(function (err) {
		res.send(err);
    }); */

});

router.get('/app/settings', function (req, res) {
	var authUrl = authHelper.getAuthUrl();
	return res.json({
		outlook: {
      authUrl: authUrl
    }
	});
});


router.get('/outlook/access', function (req, res) {
	var authUrl = authHelper.getAuthUrl();
	res.redirect(authUrl);
});

module.exports = router;
