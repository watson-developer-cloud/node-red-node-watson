/**
 * Copyright 2017 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'text-to-speech';
  var request = require('request'),
    cfenv = require('cfenv'),
    url = require('url'),
    temp = require('temp'),
    fs = require('fs'),
    fileType = require('file-type'),
    serviceutils = require('../../utilities/service-utils'),
    TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = '', password = '', sUsername = '', sPassword = '';

  temp.track();

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the username and password will be stored in
  // the variables sUsername and sPassword.
  //
  // This separation between sUsername and username is to allow
  // the end user to modify the credentials when the service is not bound.
  // Otherwise, once set credentials are never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  function reportError (node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    msg.ttserror = messageTxt;

    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(messageTxt, msg);
  }


  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-text-to-speech-v1-query-builder/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // API used by widget to fetch available voices
  RED.httpAdmin.get('/watson-text-to-speech-v1-query-builder/voices', function (req, res) {
    console.log('Received request for voices');
    var tts = new TextToSpeechV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd
    });

    console.log('Checking Voices');
    tts.voices({}, function(err, voices){
      if (err) {
        if (!err.error) {
          err.error = 'Error ' + err.code + ' in fetching voices';
        }
        res.json(err);
      } else {
        console.log('Voices Found');
        console.log(voices);
        res.json(voices);
      }
    });
  });


  // This is the Speech to Text V1 Query Builder Node
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var method = config['tts-custom-mode'],
        message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;

      if (!username || !password) {
        message = 'Missing Watson Text to Speech service credentials';
      } else if (!method || '' === method) {
        message = 'Required mode has not been specified';
      }

      if (message) {
        reportError(node, msg, message);
        return;
      }

    });
  }

  RED.nodes.registerType('watson-text-to-speech-v1-query-builder', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });

};
