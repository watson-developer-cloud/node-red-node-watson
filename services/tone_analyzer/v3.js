/**
 * Copyright 2013,2016 IBM Corp.
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

module.exports = function (RED) {
  var cfenv = require('cfenv');

  var username, password;

  var service = cfenv.getAppEnv().getServiceCreds(/tone analyzer/i)

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-tone-analyzer/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var message = '';

      if (!msg.payload) {
        message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      username = username || this.credentials.username;
      password = password || this.credentials.password;

      if (!username || !password) {
        message = 'Missing Tone Analyzer service credentials';
        node.error(message, msg);
        return;
      }

      var tones = msg.tones || config.tones;
      var sentences = msg.sentences || config.sentences;
      var contentType = msg.contentType || config.contentType

      var watson = require('watson-developer-cloud');

      var tone_analyzer = watson.tone_analyzer({
        username: username,
        password: password,
        version: 'v3',
        version_date: '2016-05-19'
      });

      var hasJSONmethod = (typeof msg.payload.toJSON === 'function') ;
      var isBuffer = false;

      if (hasJSONmethod === true) {
        if (msg.payload.toJSON().type === 'Buffer') {
          isBuffer = true;
        }      
      }

      // Payload (text to be analysed) must be a string (content is either raw string or Buffer)
      if (typeof msg.payload === 'string' ||  isBuffer === true) {
        var options = {
          text: msg.payload,
          sentences: sentences,
          isHTML: contentType
        };

        if (tones !== 'all') {
          options.tones =   tones;
        }

        node.status({fill:'blue', shape:'dot', text:'requesting'});
        tone_analyzer.tone(options, function (err, response) {
          node.status({})
          if (err) {
            node.error(err, msg);
          } else {
            msg.response = response;
          }

          node.send(msg);
        });
      } else {
        message = 'The payload must be either a string or a Buffer';
        node.status({fill:'red', shape:'dot', text:message}); 
        node.error(message, msg);         
      }
    });
  }
  RED.nodes.registerType('watson-tone-analyzer-v3', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
