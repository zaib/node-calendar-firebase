module.exports = {
	firebase: {
		"type": "service_account",
		"project_id": "connecpath",
		"private_key_id": "a1bb91bc51d52c61ff14a000a778fd5f210a5df8",
		"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDLv4mXHxoO5A84\nQyguPIWlPSkrwMjb6hykLmRPZNkhjGkwDHB9nUZvcpMJtzYYNSIMdxictOWbXtd1\neowHfAaT7259sGWRPzgcIA/zAZQ2KEIHgU66NYqQxa4s4RuByhzvZJkie/0ACUYD\nR+XIznE9AYq/PF0HhHLD5R6ZNUhDSSVwfVpvxDW0HmpuUzY4z6ZUv2Ir9CNnucHc\n8JBQXNFLrVfFjOnbOvZyRN8b+WpTFnHvP768eUp+wTK0fRYjQW1jiV8/TtYSdBfd\nsqVRCAd4ZYDHRHC3DTrlGScVJ6tBSpbD3ARCl8bWHDHduaGUk5OPU00xwiUnhxeu\nBty0Dhv5AgMBAAECggEAOGjUrqbZP5MrlY+eUcLG25tFyUvMMHquKFSByCtrJCss\nOjXPdS+0fwmRJQj47JXVUe8tPMGmqjAFZgyiNTZE2fNZu2m5jQ+cOMk1sTlYL/BQ\na6SEx/An53IbiWhfhb0P6sWG0jHSt45ZuHHQ8Bob5uCE6fJL7VdhsNO/93n1gk8A\ne2K4ww/w3UwEqqY4iOB1j/d5TUii3dT1Zc42Sn6AFTXj16SbiylX1rwN7gLj0H+u\n69IsLQiZLwiFazl2MD6cNv9O6/auuci2RX8HZetCraFqm2u6I4HSsOFRuWRp/n+h\n+LtE4GGhgOfTKZMQi5V4/+pT6hRWor/j2qOp0h2kewKBgQD8WSg0iv9do/sh8YWY\nT78Op8s3gx2N07hBqmuh08r3XwQhk+87LbJGq/3VYNtfsofyzqKvevO2EpSzWQFO\n09wHOvZlUGSFQuE+AJhYUazmUEfwvc5S0nwFvWy+/pUtpb6/cFxzhgZqoWeoTlKs\neLRCz633UB2NF/X7qUvaIze7PwKBgQDOslZ6rzj50oouKGetUOZYFJyd5AweXW2F\n1IRLmlJIQrY/ZHOD3EV+IYzDHVqAOEjOeBSne00ZOnNx76+J2wylsIq1p/slHakZ\nnn8+q6qcaDQ/Gmw2IPQ/7m0cwejTMZt7N74aEGOXo6yy6GthAUpxjbPbIoFcYr7v\nEvAfrsbyxwKBgDhUGoJoCIq5gORZyk1ud6Jo2BbjIKS4/udBiFcONL81KXHpWLxn\n/eSCnd2UikN5UZlkgLIVCvO4gBLsqjsTVYkTo06IPHf2rtqtPVRxntumTfiyFa0t\nKNwLJYwYven7lnGbPjfXUfVZZA8QtKmlI+/J9fY/nukQ0SrE5pahx933AoGAWcti\nBGRQ9T8A5rKI7+NgXk1+CJ3EogBmjyhW3N1K97d7oyiJgnRUAEqk8zKyWVeaUZAb\nMPNA+D/LXWkKMnJmGSkL6YTzdxlemBGiJ+C9+rrOT8ez0QQZ+BglcMPQ2McJS8tY\nm8wY6Ayj/wk3dOnxpEkyJHXmCvOfDQ+GH813AosCgYBN7uhfLX/wy11siSn8BrVo\n8zHFxrW7uJw+fEjgNniuWRv3PmvVDnNldKEvCcxxTT3U71hEdPKx/pqN15uQPK//\nyXgWYbQt2PeQRDSI8p991csc92mI5AoZYlpGmMIhhDIcqL5QCkr14KtwBbLQXR2Y\nQ3oSzOVyq3bHSwacoM+ziw==\n-----END PRIVATE KEY-----\n",
		"client_email": "firebase-adminsdk-sj1xa@connecpath.iam.gserviceaccount.com",
		"client_id": "115117624531364934751",
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://accounts.google.com/o/oauth2/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-sj1xa%40connecpath.iam.gserviceaccount.com"
	},
	outlook: {
		clientId: '3fe26a67-390c-421f-9f81-484cdc69ac0e',
		clientSecret: 'cgsgjVRBDS2037$_{gsIM2#',
		redirectUri: 'http://localhost:8080/outlook/authorize',
		permissions: [
			'openid',
			'profile',
			'offline_access',
			'https://outlook.office.com/calendars.readwrite'
		]
	},
	apps: {
		api: {
			baseUrl: 'http://localhost:8080'
		},
		web: {
			appId: 101,
			redirectUri: 'http://localhost:8080/dashboard'
		},
		ios: {
			appId: 102,
			redirectUri: ''
		},
		android: {
			appId: 103,
			redirectUri: ''
		}
	}
};
