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
  const SERVICE_IDENTIFIER = 'speech-to-text';
  var temp = require('temp'),
    fs = require('fs'),
    fsp = require('fs').promises,
    fileType = require('file-type'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    responseutils = require('../../utilities/response-utils'),
    sttutils = require('./stt-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = '', password = '', sUsername = '', sPassword = '',
    apikey = '', sApikey = '',
    endpoint = '',
    sEndpoint = 'https://stream.watsonplatform.net/speech-to-text/api';

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

  function executeCreateCustomisation(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.createLanguageModel(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'customization_id');
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeListCustomisations(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.listLanguageModels(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'customizations');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetCustomisation(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.getLanguageModel(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'customization');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteCustomisation(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.deleteLanguageModel(params)
        .then((response) => {
          msg['delcustomresponse'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeUpgradeCustomisation(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.upgradeLanguageModel(params)
        .then((response) => {
          msg['updcustomresponse'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }


  function executeResetCustomisation(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.resetLanguageModel(params)
        .then((response) => {
          msg['rescustomresponse'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeAddCorpus(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.addCorpus(params)
        .then((response) => {
          msg['addcorpusresponse'] = response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function executeGetCorpora(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.listCorpora(params)
      .then((response) => {
        responseutils.parseResponseFor(msg, response, 'corpora');
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeGetCorpus(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.getCorpus(params)
      .then((response) => {
        responseutils.parseResponseFor(msg, response, 'corpus');
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeTrain(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.trainLanguageModel(params)
      .then((response) => {
        msg['train'] = response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeGetCustomWords(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.listWords(params)
      .then((response) => {
        responseutils.parseResponseFor(msg, response, 'words');
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeAddWords(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.addWords(params)
      .then((response) => {
        msg['addwordsresponse'] = response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeDeleteCorpus(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.deleteCorpus(params)
      .then((response) => {
        msg['delcorpusresponse'] = response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeDeleteWord(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      stt.deleteWord(params)
      .then((response) => {
        msg['delwordresponse'] = response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      })
    });
  }

  function executeUnknownMethod(node, stt, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      msg.error = 'Unable to process as unknown mode has been specified';
      reject(msg.error);
    });
  }

  function determineService() {
    return sttutils.determineService(apikey, username, password, endpoint);
  }


  function executeMethod(node, method, params, msg) {
    let stt = determineService();
    let p = null;

    node.status({fill:'blue', shape:'dot', text:'executing'});

    switch (method) {
    case 'createCustomisation':
      p = executeCreateCustomisation(node, stt, params, msg);
      break;
    case 'listCustomisations':
      p = executeListCustomisations(node, stt, params, msg);
      break;
    case 'getCustomisation':
      p = executeGetCustomisation(node, stt, params, msg);
      break;
    case 'deleteCustomisation':
      p = executeDeleteCustomisation(node, stt, params, msg);
      break;
    case 'resetCustomisation':
      p = executeResetCustomisation(node, stt, params, msg);
      break;
    case 'upgradeCustomisation':
      p = executeUpgradeCustomisation(node, stt, params, msg);
      break;
    case 'addCorpus':
      p = executeAddCorpus(node, stt, params, msg);
      break;
    case 'getCorpora':
      p = executeGetCorpora(node, stt, params, msg);
      break;
    case 'getCorpus':
      p = executeGetCorpus(node, stt, params, msg);
      break;
    case 'train':
      p = executeTrain(node, stt, params, msg);
      break;
    case 'listCustomWords':
      p = executeGetCustomWords(node, stt, params, msg);
      break;
    case 'addWords':
      p = executeAddWords(node, stt, params, msg);
      break;
    case 'deleteCorpus':
      p = executeDeleteCorpus(node, stt, params, msg);
      break;
    case 'deleteCustomWord':
      p = executeDeleteWord(node, stt, params, msg);
      break;
    default:
      p = executeUnknownMethod(node, stt, params, msg);
      break;
    }

    return p;
  }

  function paramsForNewCustom(config) {
    var params = {};

    if (config['stt-base-model']) {
      params['baseModelName'] = config['stt-base-model'];
    }
    if (config['stt-custom-model-name']) {
      params['name'] = config['stt-custom-model-name'];
    }
    if (config['stt-custom-model-description']) {
      params['description'] = config['stt-custom-model-description'];
    }

    return params;
  }

  function paramsForCorpus(config, method) {
    var params = {};

    if (config['stt-corpus-name']) {
      params['corpusName'] = config['stt-corpus-name'];
    }
    if (config['stt-custom-id']) {
      params['customizationId'] = config['stt-custom-id'];
    }
    if ('addCorpus' === method) {
      params['allowOverwrite'] = config['stt-allow-overwrite'];
    }

    return params;
  }


  function buildParams(msg, method, config) {
    var params = {};

    switch (method) {
    case 'createCustomisation':
      params = paramsForNewCustom(config);
      break;
    case 'listCustomisations':
      break;
    case 'deleteCustomWord':
      if (config['stt-word-name']) {
        params['wordName'] = config['stt-word-name'];
      }
      // Deliberate no break;
    case 'getCustomisation':
    case 'getCorpora':
    case 'train':
    case 'listCustomWords':
    case 'addWords':
    case 'deleteCustomisation':
    case 'upgradeCustomisation':
    case 'resetCustomisation':
      if (config['stt-custom-id']) {
        params['customizationId'] = config['stt-custom-id'];
      }
      break;
    case 'addCorpus':
    case 'getCorpus':
    case 'deleteCorpus':
      params = paramsForCorpus(config, method);
      break;
    }

    return params;
  }

  function setFileParams(method, params, msg) {
    switch (method) {
    case 'addCorpus':
      params.corpusFile = msg.payload;
      break;
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
          reject(err);
        }

        // Syncing up the asynchronous nature of the stream
        // so that the full file can be sent to the API.
        fsp.writeFile(info.path, msg.payload)
          .then(() => {
            switch (method) {
            case 'addCorpus':
              params.corpusFile = fs.createReadStream(info.path);
              break;
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
    case 'addCorpus':
    case 'addWords':
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }


  // These are APIs that the node has created to allow it to dynamically fetch IBM Cloud
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-speech-to-text-v1-query-builder/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


   // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-speech-to-text-v1-query-builder/models', function (req, res) {
    endpoint = req.query.e ? req.query.e : sEndpoint;

    var stt = sttutils.initSTTService(req, sApikey, sUsername, sPassword, sEndpoint);

    stt.listModels({})
      .then((response) => {
        let models = response;
        if (response.result) {
          models = response.result;
        }
        res.json(models);
      })
      .catch((err) => {
        res.json(err);
      })
  });


  // This is the Speech to Text V1 Query Builder Node
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg, send, done) {
      var method = config['stt-custom-mode'],
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
        message = 'Missing Watson Speech to Text service credentials';
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
          if (! lookForBuffer) {
            return Promise.resolve();
          } else if (msg.payload instanceof Buffer) {
            return loadFile(node, method, params, msg);
          } else {
            params = setFileParams(method, params, msg);
            return Promise.resolve();
          }
        })
        .then(() => {
          return executeMethod(node, method, params, msg)
        })
        .then(() => {
          node.status({});
          send(msg);
          temp.cleanup();
          done();
        })
        .catch((err) => {
          node.status({});
          let errMsg = payloadutils.reportError(node, msg, err);
          temp.cleanup();
          done(errMsg);
        });

    });
  }

  RED.nodes.registerType('watson-speech-to-text-v1-query-builder', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'},
      apikey: {type:'password'}
    }
  });

};
