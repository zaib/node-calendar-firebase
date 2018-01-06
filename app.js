var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var app = express();

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


app.use(express.static(path.join(__dirname, 'public')));

var index = require('./api/routes/index');
var usersCtrl = require('./api/controllers/users.controller');
var eventsCtrl = require('./api/controllers/events.controller');
var syncEventsCtrl = require('./api/controllers/sync.events.controller');
var outlookCtrl = require('./api/controllers/outlook.controller');

app.use('/', index);
app.use('/events', eventsCtrl);
app.use('/sync/events', syncEventsCtrl);
app.use('/users', usersCtrl);
app.use('/outlook', outlookCtrl);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error('Not Found');
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
