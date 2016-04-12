/**
 * Module dependencies
 */

var test = require('tap').test,
    http = require('http'),
    STATUS_CODES = http.STATUS_CODES,
    HTTPError = require('./../');

/**
 * Create little hello server for test suite
 */

var server = http.createServer(function (req, res) {
  res.writeHead(500, {'Content-Type': 'text/plain'});
  res.end('Oops something went wrong\n');
})

server.listen(1337, '127.0.0.1');

server.on('listening', function(){

    /**
     * Test suite
     */

    test('new HTTPError(req, res, message)',function(t){
        var req = http.get('http://127.0.0.1:1337',function(res){
            res.setEncoding('utf-8');
            var text = '';
            res.on('data',function(chunk){
                text += chunk;
            });
            res.on('end', function(){
                res.body = text;
                var err = new HTTPError(req,res,'Querying locahost');
                t.equal(err.name,'HTTPError');
                var expectedMessage = 'Querying locahost\r\n'
                    + 'Request URL: http://127.0.0.1:1337/\r\n'
                    + 'Request method: GET\r\n'
                    + 'Status code: 500 - Internal Server Error\r\n'
                    + 'Request headers: \r\n'
                    + 'host: 127.0.0.1:1337\r\n'
                    + 'Response headers: \r\n'
                    + 'content-type: text/plain\r\n'
                    + 'date: ' + res.headers.date + '\r\n'
                    + 'connection: keep-alive\r\n'
                    + 'transfer-encoding: chunked\r\n'
                    + 'Response body: \r\n'
                    + 'Oops something went wrong\n';
                t.equal(err.message, expectedMessage);
                t.ok(err.stack);
                t.end();
                server.close();
            });
        });
    });

});

