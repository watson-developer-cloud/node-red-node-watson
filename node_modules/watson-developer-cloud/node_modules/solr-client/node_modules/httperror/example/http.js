var http = require('http');
var HTTPError = require('./../');

var req = http.get('http://google.com',function(res){
	var err = new HTTPError(req,res,'Querying google.com');
	throw err;
});

// Output
// HTTPError: Querying google.com
// Request URL: http://google.com/
// Request method: GET
// Status code: 301 - Moved Permanently
// Request headers:
// host: google.com
// Response headers:
// location: http://www.google.com/
// content-type: text/html; charset=UTF-8
// date: Sun, 06 Oct 2013 23:22:07 GMT
// expires: Tue, 05 Nov 2013 23:22:07 GMT
// cache-control: public, max-age=2592000
// server: gws
// content-length: 219
// x-xss-protection: 1; mode=block
// x-frame-options: SAMEORIGIN
// alternate-protocol: 80:quic
//     at ClientRequest.<anonymous> (/home/lbdremy/workspace/nodejs/HTTPError/example/http.js:5:12)
//     at ClientRequest.g (events.js:192:14)
//     at ClientRequest.EventEmitter.emit (events.js:96:17)
//     at HTTPParser.parserOnIncomingClient [as onIncoming] (http.js:1588:7)
//     at HTTPParser.parserOnHeadersComplete [as onHeadersComplete] (http.js:111:23)
//     at Socket.socketOnData [as ondata] (http.js:1491:20)
//     at TCP.onread (net.js:404:27)