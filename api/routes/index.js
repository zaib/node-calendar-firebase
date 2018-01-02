var express = require('express');
var router = express.Router();
var config = require('./../../config/config');
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

	var username = req.query.username || 'jahanzaib';
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
    });

});

router.get('/app/settings', function (req, res) {
	var authUrl = authHelper.getAuthUrl();
	return res.json({
		outlook: {
      authUrl: authUrl
    }
	});
});

module.exports = router;
