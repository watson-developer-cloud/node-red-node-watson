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

function ToneUtils () {
}


ToneUtils.prototype = {
  check: function () {
    return '"IBM Watson Node-RED Utilities for Tone Analyser';
  },

  // Function that checks the payload and determines
  // whether it is JSON or a Buffer
  checkPayload: function(payload) {
    var message = null;
    var isBuffer = false;

    var hasJSONmethod = (typeof payload.toJSON === 'function') ;

    if (hasJSONmethod === true) {
      if (payload.toJSON().type === 'Buffer') {
        isBuffer = true;
      }      
    }      
    // Payload (text to be analysed) must be a string (content is either raw string or Buffer)
    if (typeof payload !== 'string' &&  isBuffer !== true) {
      message = 'The payload must be either a string or a Buffer';
    }

    return message;
  },

  // Function to parse and determine tone setting
  // 'all' is the setting which needs be be blanked
  // if not the service will throw an error
  parseToneOption: function(msg, config) {
    var tones = msg.tones || config.tones;

    return (tones === 'all' ? '' : tones);  	
  }


};

var toneutils = new ToneUtils();

module.exports = toneutils;