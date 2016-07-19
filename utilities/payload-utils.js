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

var url = require('url');
var fs = require('fs');
var fileType = require('file-type');
var request = require('request');

function PayloadUtils () {
}

PayloadUtils.prototype = {
  check: function () {
    return '"IBM Watson Node-RED Utilities for Payload Handling';
  },

  // Function that checks if the input string is a url
  urlCheck: function(str) {
    var parsed = url.parse(str);
    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
  }
};

var payloadutils = new PayloadUtils();

module.exports = payloadutils;
