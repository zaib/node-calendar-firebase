const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const passport = require('passport');

const firebase = require('./config/connection.js');
const ref = firebase.ref('users');

const CronJob = require('cron').CronJob;
const moment = require('moment');
const _ = require('lodash');
const async = require('async');
const rp = require('request-promise');

const env = process.env.NODE_ENV || 'development';
const config = require('./config/config')[env];

const DEFAULT = require('./config/constants.js');
const errorHelper = require('./api/helpers/errors.handler');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(session({
	secret: '0dc529ba-5051-4cd6-8b67-c9a901bb8bdf',
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'public')));

const passAcessTokens = (req, res, next) => {
	let username = req.headers.username;
	let currentUnixTime = moment(new Date()).unix();
	let isOutlookTokenExpired = false;
	let isGoogleTokenExpired = false;
	if (username) {
		ref.child(`/${username}`).once('value').then(function (snapshot) {
			let snapshotVal = snapshot.val();
			let user = snapshotVal;
			if (user) {
				isOutlookTokenExpired = moment(currentUnixTime).isAfter(user.outlook.expires_at);
				isGoogleTokenExpired = moment(currentUnixTime).isAfter(user.google.expires_at);
				async.series([
					function (cb) {
						if (isOutlookTokenExpired && user.outlook) {
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
							cb(null, user.outlook);
						}
					},
					function (cb) {
						if (isGoogleTokenExpired && user.google) {
							let refreshTokenUrl = req.protocol + '://' + req.get('host') + `/google/${username}/refreshtoken`;
							let options = {
								uri: refreshTokenUrl,
								headers: {
									refresh_token: user.google.refresh_token
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
							cb(null, user.google);
						}
					},
				], function (err, results) {
					if (results[0]) {
						req.headers.access_token = results[0].access_token;
					}
					if (results[1]) {
						req.headers.google_token = results[1].access_token;
						req.headers.email = results[1].email;
					}
					next();
				});

			} else {
				return res.status(errorHelper.usernameError.status).json(errorHelper.usernameError);
			}
		}).catch(function (err) {
			return res.json(err);
		});
	} else {
		next();
	}
};

// last activity logger
app.use((req, res, next) => {
	let username = req.headers.username || req.params.username || req.query.username;
	if (username) {
		// let currentUnixTime = moment(new Date()).unix();
		let currentUnixTime = moment().subtract(30, 'day').unix();
		let payload = {
			recentActivityTime: currentUnixTime
		};
		ref.child(`/${username}`).update(payload);
		next();
	} else {
		next();
	}
});

// Cron Job
// const sample = 'Seconds Minutes Hours Day Month Day-of-Week';
const runDaily = '0 0 0 * * *';
const runEverySecond = '* * * * * *';
new CronJob(runDaily, function () {
		let refreshTokenUrl = config.apps.api.baseUrl + '/cron/refreshtoken';
		let options = {
			uri: refreshTokenUrl
		};
		rp(options)
			.then(function (result) {
				console.log('tokens refreshed.');
			})
			.catch(function (err) {
				console.log(err);
			});
	}, function () {
		/* This function is executed when the job stops */
		console.log("CRON Stop");
	},
	true, /* Start the job right now */
	DEFAULT.timezone /* Time zone of this job. */
);


const index = require('./api/routes/index');
const usersCtrl = require('./api/controllers/users.controller');
const eventsCtrl = require('./api/controllers/events.controller');
const syncEventsCtrl = require('./api/controllers/sync.events.controller');
const outlookCtrl = require('./api/controllers/outlook.controller');
const googleCtrl = require('./api/controllers/google.controller');
const cronCtrl = require('./api/controllers/cron.controller');

app.use('/', index);
app.use('/cron', cronCtrl);
app.use('/users', usersCtrl);
// app.use('/events', eventsCtrl);
app.use('/events', passAcessTokens, syncEventsCtrl);
app.use('/sync/events', passAcessTokens, syncEventsCtrl);
app.use('/outlook', outlookCtrl);
app.use('/google', passAcessTokens, googleCtrl);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
