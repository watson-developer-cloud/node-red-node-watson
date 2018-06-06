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
  var pkg = require('../../package.json'),
    TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    ttsutils = require('./tts-utils'),
    endpoint = '',
    sEndpoint = 'https://stream.watsonplatform.net/text-to-speech/api',
    apikey = '', sApikey = '',
    username = '', password = '', sUsername = '', sPassword = '';
  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the username and password will be stored in
  // the variables sUsername and sPassword.
  //
  // This separation between sUsername and username is to allow
  // the end user to modify the credentials when the service is not bound.
  // Otherwise, once set credentials are never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  var service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
    sEndpoint = service.url;
  }

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-text-to-speech/vcap', function(req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-text-to-speech/voices', function (req, res) {
    var tts = ttsutils.initTTSService(req, sApikey, sUsername, sPassword, sEndpoint);

    tts.listVoices({}, function(err, voices){
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

  // API used by widget to fetch available customisations
  RED.httpAdmin.get('/watson-text-to-speech/customs', function (req, res) {
    var tts = ttsutils.initTTSService(req, sApikey, sUsername, sPassword, sEndpoint);

    tts.listVoiceModels({}, function(err, customs){
      if (err) {
        res.json(err);
      } else {
        res.json(customs);
      }
    });
  });

  function Node(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    function initialCheck(username, password, apikey) {
      if (!apikey && (!username || !password)) {
        return Promise.reject('Missing Text To Speech service credentials');
      }
      return Promise.resolve();
    }

    function payloadCheck(msg) {
      if (!msg.payload) {
        return Promise.reject('Missing property: msg.payload');
      }
      return Promise.resolve();
    }

    function buildParams(msg) {
      var params = {
        text: msg.payload,
        voice: msg.voice || config.voice,
        accept: config.format
      };

      // Check the params for customisation options
      if (config.langcustom && 'NoCustomisationSetting' !== config.langcustom) {
        params.customization_id = config.langcustom;
      }
      return Promise.resolve(params);
    }

    function performTTS(msg, params) {
      var p = new Promise(function resolver(resolve, reject) {
        var tts = ttsutils.buildStdSettings(apikey, username, password, endpoint);

        tts.synthesize(params, function (err, body, response) {
          if (err) {
            reject(err);
          } else {
            resolve(body);
          }
        });
      });
      return p;
    }

    function processResponse(msg, body) {
      msg.speech = body;
      if (config['payload-response']) {
        msg.payload = body;
      }
      return Promise.resolve();
    }

    this.on('input', function(msg) {

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;
      apikey = sApikey || this.credentials.apikey || config.apikey;

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});

      initialCheck(username, password, apikey)
      .then(function(){
        return payloadCheck(msg);
      })
      .then(function(){
        return buildParams(msg);
      })
      .then(function(params){
        node.status({fill:"blue", shape:"dot", text:"requesting"});
        return performTTS(msg, params);
      })
      .then(function(body){
        return processResponse(msg, body);
      })
      .then(function(){
        node.status({});
        node.send(msg);
      })
      .catch(function(err){
        payloadutils.reportError(node,msg,err);
      });
    })
  }
  RED.nodes.registerType('watson-text-to-speech', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'},
      apikey: {type:'password'}
    }
  });
};
