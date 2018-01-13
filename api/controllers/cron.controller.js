const express = require('express');
const router = express.Router();

const rp = require('request-promise');
const async = require('async');
const moment = require('moment');
const _ = require('lodash');

const firebase = require('./../../config/connection.js');
const ref = firebase.ref('users');


router.get('/refreshtoken', function (req, res) {

	let inActiveDate = moment().subtract(14, 'day').unix();
	ref.orderByChild('recentActivityTime').endAt(inActiveDate).once("value").then(function (snapshot) {
		// console.log(snapshot.val());
		let snapshotVal = snapshot.val();
		let usersList = (snapshotVal) ? Object.values(snapshotVal) : [];
		if (usersList.length) {
			_.forEach(usersList, (user) => {
				console.log(user.username);
				let username = user.username;
				async.series([
					function (cb) {
						if (user.outlook) {
							let refreshTokenUrl = req.protocol + '://' + req.get('host') + `/outlook/${username}/refreshtoken`;
							let options = {
								uri: refreshTokenUrl,
								headers: {
									refresh_token: user.outlook.refresh_token
								}
							};
							rp(options)
								.then(function (result) {
									cb(null, result);
								})
								.catch(function (err) {
									cb(err);
								});
						} else {
							cb();
						}
					},
					function (cb) {
						if (user.google) {
							let refreshTokenUrl = req.protocol + '://' + req.get('host') + `/google/${username}/refreshtoken`;
							let options = {
								uri: refreshTokenUrl,
								headers: {
									refresh_token: user.google.refresh_token,
									google: user.google,
								}
							};
							rp(options)
								.then(function (result) {
									cb(null, result);
								})
								.catch(function (err) {
									cb(err);
								});

						} else {
							cb();
						}
					}
				], function (err, result) {
					if (err) {
						return res.json(err);
					} else if (result) {
						let currentUnixTime = moment(new Date()).unix();
						let payload = {
							recentActivityTime: currentUnixTime
						};
						ref.child(`/${username}`).update(payload);
						return res.json(result);
					}
				});
			});
		} else {
			return res.json({
				message: 'no in-active user found.'
			});
		}
	}).catch(function (err) {
		return res.json(err);
	});
});

module.exports = router;
