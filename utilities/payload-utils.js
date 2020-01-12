/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var url = require('url'),
  fs = require('fs'),
  fileType = require('file-type'),
  request = require('request'),
  path = require('path'),
  toArray = require('stream-to-array'),
  stream = require('stream');

function PayloadUtils() {}

PayloadUtils.prototype = {
  check: function() {
    return 'IBM Watson Node-RED Utilities for Payload Handling';
  },

  // Function that checks if the input string is a url
  urlCheck: function(str) {
    var parsed = url.parse(str);
    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
  },

  // Function that checks if the input is a valid json object
  isJsonObject: function (payload) {
    if (payload instanceof Array || payload instanceof Object ||
          'object' === typeof payload || Array.isArray(payload)) {
      return true;
    }
    return false;
  },

  // Function that is syncing up the asynchronous nature of the stream
  // so that the full file can be sent to the API.
  stream_buffer: function(file, contents, cb) {
    fs.writeFile(file, contents, function(err) {
      if (err) {
        throw err;
      }
      var ft = fileType(contents);
      cb(ft ? ft.ext : 'tmp');
    });
  },

  // Function that is syncing up the asynchronous nature of the stream
  // so that the full file can be sent to the API.
  stream_url: function(file, url, cb) {
    var wstream = fs.createWriteStream(file);

    wstream.on('finish', function() {
      fs.readFile(file, function(err, buf) {
        var fmt = null,
          error = null;

        if (err) {
          error = err;
        }
        if (fileType(buf)) {
          fmt = fileType(buf).ext;
        } else {
          error = 'Unrecognised file format';
        }
        cb(error, fmt);
      });
    });
    request(url).pipe(wstream);
  },

  // Function that matches the buffer streaming so that they can be used together.
  stream_url_format: function(file, url, cb) {
    var wstream = fs.createWriteStream(file);

    wstream.on('finish', function() {
      fs.readFile(file, function(err, buf) {
        var fmt = null,
          error = null;

        if (err) {
          throw err;
        }
        if (fileType(buf)) {
          fmt = fileType(buf).ext;
        }
        cb(fmt);
      });
    });
    request(url).pipe(wstream);
  },

  // Convert filestream in msg.payload to a buffer
  checkForStream: function (msg) {
    let me = this;
    return new Promise(function resolver(resolve, reject) {
      if (me.isReadableStream(msg.payload)) {
        //msg.payload.resume();
        toArray(msg.payload)
          .then(function(parts) {
            var buffers = [], part = null;

            for (var i = 0; i < parts.length; ++i) {
              part = parts[i];
              buffers.push((part instanceof Buffer) ? part : new Buffer(part));
            }

            msg.payload = Buffer.concat(buffers);
            resolve();
          });
      } else {
        resolve();
      }
    });
  },

  runThroughErrOptions: function(err) {
    let messageTxt = err;
    if (err.error) {
      messageTxt = err.error;
    } else if (err.description) {
      messageTxt = err.description;
    } else if (err.message) {
      messageTxt = err.message;
    }
    return messageTxt;
  },

  reportError: function (node, msg, err) {
    let messageTxt = err;

    if (err.body && 'string' === typeof err.body) {
      messageTxt = err.body;
      try {
        let errBody = JSON.parse(err.body);
        messageTxt = PayloadUtils.prototype.runThroughErrOptions(errBody);
      } catch(e) {}
    } else {
      messageTxt = PayloadUtils.prototype.runThroughErrOptions(err);
    }

    msg.watsonerror = messageTxt;
    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(messageTxt, msg);
    return messageTxt;
  },

  isReadableStream : function (obj) {
    return obj instanceof stream.Stream &&
        typeof (obj._read === 'function') &&
        typeof (obj._readableState === 'object');
  },

  langTransToSTTFormat : function (code) {
    switch (code) {
    case 'pt':
      code = 'pt-BR';
      break;
    case 'de':
      code = 'de-DE';
      break;
    case 'ko':
      code = 'ko-KR';
      break;
    case 'fr':
      code = 'fr-FR';
      break;
    case 'en':
      code = 'en-US';
      break;
    case 'ja':
      code = 'ja-JP';
      break;
    case 'es':
      code = 'es-ES';
      break;
    case 'ar':
      code = 'ar-AR';
      break;
    case 'zh':
      code = 'zh-CN';
      break;
    }
    return code;
  },

  // Function that is returns a function to count
  // the characters in each language.
  word_count: function(ct) {
    var count = require('word-count'),
      fn = function(txt, cb) {
        // default
        return cb(txt.split(' ').length);
      };

    if (ct === 'ja') {
      fn = function(txt, cb) {
        cb(200);
      };
    } else if (ct === 'ko') {
      fn = function(txt, cb) {
        cb(count(txt));
      };
    }
    return fn;
  }
};

var payloadutils = new PayloadUtils();

module.exports = payloadutils;
