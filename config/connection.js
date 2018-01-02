
var firebase = require("firebase-admin");
var serviceAccount = require('./config').firebase;
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://connecpath.firebaseio.com"
});

module.exports = firebase.database();