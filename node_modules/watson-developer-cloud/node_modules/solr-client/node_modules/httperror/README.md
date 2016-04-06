# httperror - HTTPError class for node.js

## Install

```sh
npm install httperror
```

## Usage

```js
var http = require('http');
var HTTPError = require('httperror');

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

```

__N.B:__ This constructor does not make any difference between the _"good or bad"_ status code. It will create an error whatever request/response you give to its.

## Test

```sh
npm test
```

## Licence

(The MIT License)

Copyright 2013 Rémy Loubradou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.