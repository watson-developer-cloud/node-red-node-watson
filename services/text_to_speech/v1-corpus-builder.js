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
  var temp = require('temp'),
    fs = require('fs'),
    fsp = require('fs').promises,
    fileType = require('file-type'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    ttsutils = require('./tts-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    endpoint = '',
    sEndpoint = 'https://stream.watsonplatform.net/text-to-speech/api',
    apikey = '', sApikey = '',
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
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
    sEndpoint = service.url;
  }

  function parseResponseFor(msg, response, field) {
    if (response && response.result) {
      if (response.result[field]) {
        msg[field] = response.result[field];
      } else {
        msg[field] = response.result;
      }
    } else {
      msg[field] = response;
    }
  }

  function executeCreateCustomisation(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.createVoiceModel(params)
        .then((response) => {
          if (response && response.result) {
            msg['customization_id'] = response.result;
          } else {
            msg['customization_id'] = response;
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeListCustomisations(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.listVoiceModels(params)
        .then((response) => {
          parseResponseFor(msg, response, 'customizations');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeListVoices(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.listVoices(params)
        .then((response) => {
          parseResponseFor(msg, response, 'voices');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetCustomisation(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.getVoiceModel(params)
        .then((response) => {
          if (response && response.result) {
            msg['customization'] = response.result;
          } else {
            msg['customization'] = response;
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteCustomisation(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.deleteVoiceModel(params)
        .then((response) => {
          msg['response'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeGetPronounce(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.getPronunciation(params)
        .then((response) => {
          parseResponseFor(msg, response, 'pronunciation');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }


  function executeAddWords(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.addWords(params)
        .then((response) => {
          msg['addwordsresponse'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeGetWords(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.listWords(params)
        .then((response) => {
          parseResponseFor(msg, response, 'words');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteWord(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      tts.deleteWord(params)
        .then((response) => {
          msg['deletewordsresponse'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeUnknownMethod(node, tts, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      payloadutils.reportError(node, msg, 'Unknown Mode');
      msg.error = 'Unable to process as unknown mode has been specified';
      node.send(msg);
      resolve();
    });
  }

  function executeMethod(node, method, params, msg) {
    let tts = ttsutils.buildStdSettings(apikey, username, password, endpoint);
    let p = null;

    node.status({fill:'blue', shape:'dot', text:'executing'});

    switch (method) {
    case 'createCustomisation':
      p = executeCreateCustomisation(node, tts, params, msg);
      break;
    case 'listCustomisations':
      p = executeListCustomisations(node, tts, params, msg);
      break;
    case 'listVoices':
      p = executeListVoices(node, tts, params, msg);
      break;
    case 'getCustomisation':
      p = executeGetCustomisation(node, tts, params, msg);
      break;
    case 'deleteCustomisation':
      p = executeDeleteCustomisation(node, tts, params, msg);
      break;
    case 'getPronounce':
      p = executeGetPronounce(node, tts, params, msg);
      break;
    case 'addWords':
      p = executeAddWords(node, tts, params, msg);
      break;
    case 'getWords':
      p = executeGetWords(node, tts, params, msg);
      break;
    case 'deleteWord':
      p = executeDeleteWord(node, tts, params, msg);
      break;
    default:
      p = executeUnknownMethod(node, tts, params, msg);
      break;
    }

    return p;
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
    return new Promise(function resolver(resolve, reject) {
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
        fsp.writeFile(info.path, msg.payload)
          .then(() => {
            switch (method) {
            case 'addWords':
              try {
                params.words = JSON.parse(fs.readFileSync(info.path, 'utf8'));
              } catch (err) {
                params.words = fs.createReadStream(info.path);
              }
            }
            resolve();
          })
          .catch((err) => {
            reject(err);
          })
      });

    });
  }

  function checkForFile(method) {
    switch (method) {
    case 'addWords':
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
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
        params['customizationId'] = config['tts-custom-id'];
      }
    } else if ( config['tts-voice'] ) {
      params['voice'] = config['tts-voice'];
    }

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
    //case 'listCustomisations':
    case 'getCustomisation':
    case 'deleteCustomisation':
    case 'addWords':
    case 'getWords':
      if (config['tts-custom-id']) {
        params['customizationId'] = config['tts-custom-id'];
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
    var tts = ttsutils.initTTSService(req, sApikey, sUsername, sPassword, sEndpoint);

    tts.listVoices({})
      .then((response) => {
        let voices = response;
        if (response.result) {
          voices = response.result;
        }
        res.json(voices);
      })
      .catch((err) => {
        if (!err.error) {
          err.error = 'Error ' + err.code + ' in fetching voices';
        }
        res.json(err);
      });
  });

  // This is the Speech to Text V1 Query Builder Node
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg, send, done) {
      var method = config['tts-custom-mode'],
        message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;
      apikey = sApikey || this.credentials.apikey || config.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      if (!apikey && (!username || !password)) {
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

      checkForFile(method)
        .then((lookForBuffer) => {
          if (msg.payload instanceof Buffer) {
            console.log('Processing as a Buffer');
            return loadFile(node, method, params, msg);
          } else {
            params = setFileParams(method, params, msg);
            return Promise.resolve();
          }
        })
        .then(() => {
          return executeMethod(node, method, params, msg);
        })
        .then(() => {
          node.status({});
          send(msg);
          temp.cleanup();
          done();
        })
        .catch((err) => {
          node.status({});
          payloadutils.reportError(node, msg, err);
          temp.cleanup();
          done(err);
        })
      });
  }

  RED.nodes.registerType('watson-text-to-speech-v1-query-builder', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'},
      apikey: {type:'password'}
    }
  });

};
