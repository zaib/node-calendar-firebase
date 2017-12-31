
var firebase = require("firebase-admin");
var serviceAccount = require("./connecpath-firebase-adminsdk.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://connecpath.firebaseio.com"
});

module.exports = firebase.database();