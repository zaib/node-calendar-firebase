
var config = require('./../../config/config');

var clientId = config.outlook.clientId;
var clientSecret = config.outlook.clientSecret;
var redirectUri = config.outlook.redirectUri;

var scopes = config.outlook.permissions;

var credentials = {
	clientID: clientId,
	clientSecret: clientSecret,
	site: 'https://login.microsoftonline.com/common',
	authorizationPath: '/oauth2/v2.0/authorize',
	tokenPath: '/oauth2/v2.0/token'
};

var oauth2 = require('simple-oauth2')(credentials);
var _ = require('lodash');
var moment = require('moment');


module.exports = {
	getAuthUrl: function () {
		var returnVal = oauth2.authCode.authorizeURL({
			redirect_uri: redirectUri,
			scope: scopes.join(' ')
		});
		console.log('');
		console.log('Generated auth url: ' + returnVal);
		return unescape(returnVal);
	},

	getTokenFromCode: function (auth_code, callback, request, response) {
        // console.log(auth_code);
		oauth2.authCode.getToken({
			code: auth_code,
			redirect_uri: redirectUri,
			scope: scopes.join(' ')
		}, function (error, result) {
			if (error) {
                console.log('Access token error: ', error);
                // return response.json(error);
				callback(request, response, error, null);
			} else {
				var token = oauth2.accessToken.create(result);
				// console.log('');
				// console.log('Token created: ', token.token);
				callback(request, response, null, token);
			}
		});
	},

	getEmailFromIdToken: function (id_token) {
		// JWT is in three parts, separated by a '.'
		var token_parts = id_token.split('.');

		// Token content is in the second part, in urlsafe base64
		var encoded_token = new Buffer(token_parts[1].replace('-', '+').replace('_', '/'), 'base64');

		var decoded_token = encoded_token.toString();

		var jwt = JSON.parse(decoded_token);

		// Email is in the preferred_username field
		return jwt.preferred_username
	},

	getTokenFromRefreshToken: function (refresh_token, callback, request, response) {
		var token = oauth2.accessToken.create({
			refresh_token: refresh_token,
			expires_in: 0
		});
		token.refresh(function (error, result) {
			if (error) {
				console.log('Refresh token error: ', error.message);
				callback(request, response, error, null);
			} else {
				console.log('New token: ', result.token);
				callback(request, response, null, result);
			}
		});
	},

	parseOutlookResponse: function (data) {
		var events = [];
		var dateDifference, meetingDuration;

		if (data.length) {
			_.forEach(data, function (item) {
				dateDifference = moment(item.End.DateTime).diff(item.Start.DateTime);
				meetingDuration = moment.utc(dateDifference).format("mm");
				meetingDuration = parseInt(meetingDuration);

				events.push({
					id: item.Id,
					subject: item.Subject,
					startTime: item.Start.DateTime,
					endTime: item.End.DateTime,
					date: moment(item.Start.DateTime).format('YYYY-MM-DD'),
					meetingDuration: meetingDuration,
					type: 'appointment',
					source: 'outlook'
				});
			});
		}

		return events;
	}
};