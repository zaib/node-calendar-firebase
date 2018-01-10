const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const passport = require('passport');

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


const firebase = require('./config/connection.js');
const ref = firebase.ref('users');

const moment = require('moment');
const async = require('async');
var rp = require('request-promise');

const passAcessTokens = (req, res, next) => {
	let auth = {
		outlook: {},
		google: {}
	};
	let username = req.headers.username;
	let isOutlookTokenExpired = false;
	async.waterfall([
		function (cb) {
			ref.child(`/${username}/outlook`).once('value').then(function (snapshot) {
				let snapshotVal = snapshot.val();
				isOutlookTokenExpired = moment(new Date()).isAfter(snapshotVal.expires_at);
				cb(null, snapshotVal);
			}).catch(function (err) {
				cb(err);
			});
		},
		function (outlook, cb) {
			if (isOutlookTokenExpired) {
				let refreshTokenUrl = req.protocol + '://' + req.get('host') + `/outlook/${username}/refreshtoken`;
				let options = {
					uri: refreshTokenUrl,
					headers: {
						refresh_token: outlook.refresh_token
					}
				};
				rp(options)
					.then(function (result) {
						let refreshOutlookToken = result;
						auth.outlook = refreshOutlookToken;
						cb(null, auth);
					})
					.catch(function (err) {
						cb(err);
					});
			} else {
				auth.outlook = outlook;
				cb(null, auth);
			}
		},
		function (authObj, cb) {
			ref.child(`/${username}/google`).once('value').then(function (snapshot) {
				let snapshotVal = snapshot.val();
				auth.google = snapshotVal;
				cb(null, auth);
			}).catch(function (err) {
				cb(err);
			});
		},
	], function (err, auth) {
		if (auth && auth.outlook && auth.outlook.access_token) {
			req.headers.access_token = auth.outlook.access_token;
		}
		if (auth && auth.google && auth.google.access_token) {
			req.headers.google = auth.google;
		}
		next();
	});
};


const index = require('./api/routes/index');
const usersCtrl = require('./api/controllers/users.controller');
const eventsCtrl = require('./api/controllers/events.controller');
const syncEventsCtrl = require('./api/controllers/sync.events.controller');
const outlookCtrl = require('./api/controllers/outlook.controller');
const googleCtrl = require('./api/controllers/google.controller');

app.use('/', index);
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
