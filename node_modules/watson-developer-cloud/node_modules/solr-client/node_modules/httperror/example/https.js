var https = require('https');
var HTTPError = require('./../');

var req = https.get('https://google.com',function(res){
	var err = new HTTPError(req,res);
	throw err;
});