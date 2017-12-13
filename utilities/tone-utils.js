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

  isJsonString: function(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },

  isJsonObject: function(str) {
    if (str instanceof Array || str instanceof Object) {
      return true;
    }
    return false;
  },

  // Function that checks the payload and determines
  // whether it is JSON or a Buffer
  checkPayload: function(payload) {
    var message = null,
      isJSON = this.isJsonString(payload) || this.isJsonObject(payload);

    // Payload (text to be analysed) must be a string (content is either raw string or Buffer)
    if (typeof payload !== 'string' && isJSON !== true) {
      message = 'The payload must be either a string, JSON or a Buffer';
    }

    return message;
  },

  // Function to parse and determine tone setting
  // 'all' is the setting which needs be be blanked
  // if not the service will throw an error
  parseToneOption: function(msg, config) {
    var tones = msg.tones || config.tones;

    return (tones === 'all' ? '' : tones);
  },

  // function to parse through the options in preparation
  // for the sevice call.
  parseOptions: function(msg, config) {
    var options = {};

    if (!config['tone-method']) {
      config['tone-method'] = 'generalTone';
    }

    switch (config['tone-method']) {
    case 'generalTone' :
      options.sentences = msg.sentences || config.sentences;
      options.isHTML = msg.contentType || config.contentType;
      options.tones = this.parseToneOption(msg, config);
      options.text = this.isJsonObject(msg.payload) ?
                            JSON.stringify(msg.payload) :
                            msg.payload;
      break;
    case 'customerEngagementTone' :
      options.utterances = this.isJsonString(msg.payload) ?
                                      JSON.parse(msg.payload) :
                                      msg.payload;
      break;
    }

    return options;
  },

  // function to splice in language options into header
  parseLanguage: function(msg, config, options) {
    var inputlang = config.inputlang ? config.inputlang : 'en';
    //outputlang = config.outputlang ? config.outputlang : 'en';

    // The SDK is currently ignoring this, but this is how it should be done.
    // If you need it, then Personality Insights as full set of accept-language
    //options.headers = {
    //  'content-language': inputlang,
    //  'accept-language': outputlang
    //}

    // This is how it is currently working.
    options.language = inputlang;
    return options;
  }

};

var toneutils = new ToneUtils();

module.exports = toneutils;
