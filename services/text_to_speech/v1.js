/**
 * Copyright 2015 IBM Corp.
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

module.exports = function(RED) {
  const SERVICE_IDENTIFIER = 'text-to-speech';
  var cfenv = require('cfenv');
  //var watson = require('watson-developer-cloud');
  var TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
  var serviceutils = require('../../utilities/service-utils');

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the username and password will be stored in
  // the variables sUsername and sPassword.
  //
  // This separation between sUsername and username is to allow
  // the end user to modify the credentials when the service is not bound.
  // Otherwise, once set credentials are never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  var username, password, sUsername, sPassword;

  //var service = cfenv.getAppEnv().getServiceCreds(/text to speech/i)
  var service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-text-to-speech/vcap', function(req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-text-to-speech/voices', function (req, res) {
    //var tts = watson.text_to_speech({
    var tts = new TextToSpeechV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd //,
      //version: 'v1',
      //url: 'https://stream.watsonplatform.net/text-to-speech/api'
    });

    tts.voices({}, function(err, voices){
      if (err) {
        if (!err.error) {
          err.error = 'Error ' + err.code + ' in fetching voices';
        }
        res.json(err);
      } else {
        res.json(voices);
      }
    });
  });

  function Node(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;

      if (!username || !password) {
        var message = 'Missing Speech To Text service credentials';
        node.error(message, msg);
        return;
      }

      //var text_to_speech = watson.text_to_speech({
      var text_to_speech = new TextToSpeechV1({
        username: username,
        password: password //,
        //version: 'v1',
        //url: 'https://stream.watsonplatform.net/text-to-speech/api'
      });

      var params = {
        text: msg.payload,
        voice: msg.voice || config.voice,
        accept: config.format
      };

      node.status({fill:"blue", shape:"dot", text:"requesting"});
      text_to_speech.synthesize(params, function (err, body, response) {
        node.status({})
        if (err) {
          node.error(err, msg);
        } else {
          msg.speech = body;
        }
        node.send(msg);
      })
    })
  }
  RED.nodes.registerType("watson-text-to-speech", Node, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
