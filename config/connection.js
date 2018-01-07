
const firebase = require('firebase-admin');
const env = process.env.NODE_ENV || 'development';
const config = require('./config')[env];

const serviceAccount = config.firebase;
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: config.databaseURL
});

module.exports = firebase.database();