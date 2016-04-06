var request = require('request');
var HTTPError = require('./../');

var req = request({
		uri : 'http://google.com',
		headers : { 'x-lol' : 'cool'}
	},function(err,res,body){
	var err = new HTTPError(req,res);
	throw err;
});


// console.error(err);
// console.log(err.stack); // here is the stack