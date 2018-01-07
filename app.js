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

const passAcessTokens = (req, res, next) => {
	let username = req.headers.username;
	ref.child(`/${username}/outlook`).once('value').then(function (snapshot) {
		let snapshotVal = snapshot.val();
		if (snapshotVal && snapshotVal.access_token) {
			req.headers.access_token = snapshotVal.access_token;
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
// app.use('/events', eventsCtrl);
app.use('/events', syncEventsCtrl);
app.use('/sync/events', syncEventsCtrl);
app.use('/users', passAcessTokens, usersCtrl);
app.use('/outlook', outlookCtrl);
app.use('/google', googleCtrl);

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