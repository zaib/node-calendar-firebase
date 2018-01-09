var util = require('util');
var express = require('express');
var router = express.Router();

var config = require('./../../config/config');
var gcal = require('google-calendar');

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(new GoogleStrategy({
        clientID: config.development.google.consumer_key,
        clientSecret: config.development.google.consumer_secret,
        callbackURL: "http://localhost:8080/google/auth/callback",
        scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
    },
    function (accessToken, refreshToken, profile, done) {
        profile.accessToken = accessToken;
        return done(null, profile);
    }
));

router.get('/auth',
    passport.authenticate('google', {
        session: false
    }));

router.get('/auth/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/google/login'
    }),
    function (req, res) {
        req.session.access_token = req.user.accessToken;
        console.log(req.user.email)
        res.redirect(`/google/${req.user.emails[0].value}`);

    });


/*
  ===========================================================================
                               Google Calendar
  ===========================================================================
*/

router.all('/', function (req, res) {

    if (!req.session.access_token) return res.redirect('/google/auth');

    //Create an instance from accessToken
    var accessToken = req.session.access_token;

    gcal(accessToken).calendarList.list(function (err, data) {
        if (err) return res.send(500, err);
        return res.send(data);
    });
});

router.get('/:calendarId', function (req, res) {

    if (!req.session.access_token) return res.redirect('/google/auth');

    //Create an instance from accessToken
    var accessToken = req.session.access_token;
    var calendarId = req.params.calendarId;

    gcal(accessToken).events.list(calendarId, {
        maxResults: 10000
    }, function (err, data) {
        if (err) return res.send(500, err);

        console.log(data)
        if (data.nextPageToken) {
            gcal(accessToken).events.list(calendarId, {
                maxResults: 10000,
                pageToken: data.nextPageToken
            }, function (err, data) {
                console.log(data.items)
            })
        }


        return res.send(data);
    });
});


router.get('/:calendarId/:eventId', function (req, res) {

    if (!req.session.access_token) return res.redirect('/google/auth');

    //Create an instance from accessToken
    var accessToken = req.session.access_token;
    var calendarId = req.params.calendarId;
    var eventId = req.params.eventId;

    gcal(accessToken).events.get(calendarId, eventId, function (err, data) {
        if (err) return res.send(500, err);
        return res.send(data);
    });
});

router.post('/:calendarId/add', function (req, res) {

    if (!req.session.access_token) return res.redirect('/auth');

    var accessToken = req.session.access_token;
    var calendarId = req.params.calendarId;
    var text = req.query.text || 'Hello World';

    gcal(accessToken).events.quickAdd(calendarId, text, function (err, data) {
        if (err) return res.send(500, err);
        return res.redirect('/' + calendarId);
    });
});

router.put('/:calendarId/:eventId', function (req, res) {

    if (!req.session.access_token) return res.redirect('/auth');

    var accessToken = req.session.access_token;
    var calendarId = req.params.calendarId;
    var text = req.query.text || 'Hello World';

    gcal(accessToken).events.update(calendarId, eventId, text, {}, function (err, data) {
        if (err) return res.send(500, err);
        return res.redirect('/' + calendarId);
    });
});

router.delete('/:calendarId/:eventId/remove', function (req, res) {

    if (!req.session.access_token) return res.redirect('/auth');

    var accessToken = req.session.access_token;
    var calendarId = req.params.calendarId;
    var eventId = req.params.eventId;

    gcal(accessToken).events.delete(calendarId, eventId, function (err, data) {
        if (err) return res.send(500, err);
        return res.redirect('/' + calendarId);
    });
});

module.exports = router;