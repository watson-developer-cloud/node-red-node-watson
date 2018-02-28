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
    endpoint = '',
    sEndpoint = 'https://stream.watsonplatform.net/text-to-speech/api',
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
    sUsername = service.username;
    sPassword = service.password;
    sEndpoint = service.url;
  }

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-text-to-speech/vcap', function(req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-text-to-speech/voices', function (req, res) {
    endpoint = req.query.e ? req.query.e : sEndpoint;
    var tts = new TextToSpeechV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd,
      url: endpoint,
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
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

  // API used by widget to fetch available customisations
  RED.httpAdmin.get('/watson-text-to-speech/customs', function (req, res) {
    endpoint = req.query.e ? req.query.e : sEndpoint;
    var tts = new TextToSpeechV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd,
      url: endpoint,
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });

    tts.getCustomizations({}, function(err, customs){
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

    function initialCheck(username, password) {
      if (!username || !password) {
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
        var text_to_speech = null,
          serviceSettings = {
            username: username,
            password: password,
            headers: {
              'User-Agent': pkg.name + '-' + pkg.version
            }
          };

        if (endpoint) {
          serviceSettings.url = endpoint;
        }

        text_to_speech = new TextToSpeechV1(serviceSettings);
        console.log('------------');
        console.log('Running TTS with params ', params);
        text_to_speech.synthesize(params, function (err, body, response) {
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

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});

      initialCheck(username, password)
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

/*


      text_to_speech.synthesize(params, function (err, body, response) {
        node.status({})
        if (err) {
          node.error(err, msg);
        } else {
          msg.speech = body;
        }
        node.send(msg);
      })

*/

    })
  }
  RED.nodes.registerType("watson-text-to-speech", Node, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
