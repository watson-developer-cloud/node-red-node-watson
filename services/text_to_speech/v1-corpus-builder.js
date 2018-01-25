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
  var pkg = require('../../package.json'),
    request = require('request'),
    url = require('url'),
    temp = require('temp'),
    fs = require('fs'),
    fileType = require('file-type'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    endpoint = '',
    sEndpoint = 'https://stream.watsonplatform.net/text-to-speech/api',
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
    sEndpoint = service.url;
  }

  function executeCreateCustomisation(node, tts, params, msg) {
    tts.createCustomization(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['customization_id'] = response;
      }
      node.send(msg);
    });
  }

  function executeListCustomisations(node, tts, params, msg) {
    tts.getCustomizations(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['customizations'] = response.customizations ?
                                      response.customizations: response;
      }
      node.send(msg);
    });
  }

  function executeGetCustomisation(node, tts, params, msg) {
    tts.getCustomization(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['customization'] = response ;
      }
      node.send(msg);
    });
  }

  function executeGetPronounce(node, tts, params, msg) {
    tts.pronunciation(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['pronunciation'] = response.pronunciation ?
                                    response.pronunciation : response;
      }
      node.send(msg);
    });
  }


  function executeAddWords(node, tts, params, msg) {
    tts.addWords(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['addwordsresponse'] = response ;
      }
      node.send(msg);
    });
  }

  function executeGetWords(node, tts, params, msg) {
    tts.getWords(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['words'] = response.words ? response.words: response;
      }
      node.send(msg);
    });
  }

  function executeDeleteWord(node, tts, params, msg) {
    tts.deleteWord(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['deletewordsresponse'] = response;
      }
      node.send(msg);
    });
  }

  function executeUnknownMethod(node, tts, params, msg) {
    payloadutils.reportError(node, msg, 'Unknown Mode');
    msg.error = 'Unable to process as unknown mode has been specified';
    node.send(msg);
  }

  function executeMethod(node, method, params, msg) {
    var tts = null,
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

    tts = new TextToSpeechV1(serviceSettings);

    node.status({fill:'blue', shape:'dot', text:'executing'});

    switch (method) {
    case 'createCustomisation':
      executeCreateCustomisation(node, tts, params, msg);
      break;
    case 'listCustomisations':
      executeListCustomisations(node, tts, params, msg);
      break;
    case 'getCustomisation':
      executeGetCustomisation(node, tts, params, msg);
      break;
    case 'getPronounce':
      executeGetPronounce(node, tts, params, msg);
      break;
    case 'addWords':
      executeAddWords(node, tts, params, msg);
      break;
    case 'getWords':
      executeGetWords(node, tts, params, msg);
      break;
    case 'deleteWord':
      executeDeleteWord(node, tts, params, msg);
      break;
    default:
      executeUnknownMethod(node, tts, params, msg);
      break;
    }
  }

  function setFileParams(method, params, msg) {
    switch (method) {
    case 'addWords':
      params.words = msg.payload;
      break;
    }
    return params;
  }

  function loadFile(node, method, params, msg) {
    temp.open({
      suffix: '.txt'
    }, function(err, info) {
      if (err) {
        node.status({
          fill: 'red',
          shape: 'dot',
          text: 'Error receiving the data buffer for training'
        });
        throw err;
      }

      // Syncing up the asynchronous nature of the stream
      // so that the full file can be sent to the API.
      fs.writeFile(info.path, msg.payload, function(err) {
        if (err) {
          node.status({
            fill: 'red',
            shape: 'dot',
            text: 'Error processing data buffer for training'
          });
          throw err;
        }

        switch (method) {
        case 'addWords':
          try {
            params.words = JSON.parse(fs.readFileSync(info.path, 'utf8'));
          } catch (err) {
            params.words = fs.createReadStream(info.path);
          }
        }

        executeMethod(node, method, params, msg);
        temp.cleanup();
      });
    });
  }

  function checkForFile(method) {
    switch (method) {
    case 'addWords':
      return true;
    }
    return false;
  }

  function paramsForNewCustom(config) {
    var params = {};

    if (config['tts-lang']) {
      params['language'] = config['tts-lang'];
    }
    if (config['tts-custom-model-name']) {
      params['name'] = config['tts-custom-model-name'];
    }
    if (config['tts-custom-model-description']) {
      params['description'] = config['tts-custom-model-description'];
    }
    return params;
  }

  function paramsForGetPronounce(config) {
    var params = {};

    if (config['tts-custom-word']) {
      params['text'] = config['tts-custom-word'];
    }
    if (config['tts-custom-format']) {
      params['format'] = config['tts-custom-format'];
    }
    if ('custom' === config['tts-voice-or-custom']) {
      if (config['tts-custom-id']) {
        params['customization_id'] = config['tts-custom-id'];
      }
    } else if ( config['tts-voice'] ) {
      params['voice'] = config['tts-voice'];
    }

    console.log('Params will be :', params);
    return params;
  }


  function buildParams(msg, method, config) {
    var params = {};

    switch (method) {
    case 'createCustomisation':
      params = paramsForNewCustom(config);
      break;
    case 'getPronounce':
      params = paramsForGetPronounce(config);
      break;
    case 'deleteWord':
      if (config['tts-custom-word']) {
        params['word'] = config['tts-custom-word'];
      }
    // No break here as want the custom id also
    case 'listCustomisations':
    case 'getCustomisation':
    case 'addWords':
    case 'getWords':
      if (config['tts-custom-id']) {
        params['customization_id'] = config['tts-custom-id'];
      }
      break;
    }

    return params;
  }

  // These are APIs that the node has created to allow it to dynamically fetch IBM Cloud
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-text-to-speech-v1-query-builder/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // API used by widget to fetch available voices
  RED.httpAdmin.get('/watson-text-to-speech-v1-query-builder/voices', function (req, res) {
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

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      if (!username || !password) {
        message = 'Missing Watson Text to Speech service credentials';
      } else if (!method || '' === method) {
        message = 'Required mode has not been specified';
      } else {
        params = buildParams(msg, method, config);
      }

      if (message) {
        payloadutils.reportError(node, msg, message);
        return;
      }

      if (checkForFile(method)) {
        if (msg.payload instanceof Buffer) {
          loadFile(node, method, params, msg);
          return;
        }
        params = setFileParams(method, params, msg);
      }

      executeMethod(node, method, params, msg);
    });
  }

  RED.nodes.registerType('watson-text-to-speech-v1-query-builder', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });

};
