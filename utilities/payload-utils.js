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
  path = require('path');

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

  // Function that is syncing up the asynchronous nature of the stream
  // so that the full file can be sent to the API.
  stream_buffer: function(file, contents, cb) {
    fs.writeFile(file, contents, function(err) {
      if (err) {
        throw err;
      }
      cb(fileType(contents).ext);
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
  // Function that is returns a function to count
  // the characters in each language.
  word_count: function(ct) {
    var kuromoji = require('kuromoji'),
      fn = function(txt) { // default
        return txt.split(' ').length;
      };
      dic_path = '/../node_modules/kuromoji/dist/dict',
      dic_dir = path.normalize(__dirname + dic_path),
      tokenizer = null;
    if (ct === 'ja') {
            fn = function(txt) {
              return tokenizer.tokenize(txt).length;
            };
            kuromoji.builder({dicPath: dic_dir}).build(function(err, tknz) {
              tokenizer = tknz;
            });
    }
    return fn;
  }
};

var payloadutils = new PayloadUtils();

module.exports = payloadutils;
