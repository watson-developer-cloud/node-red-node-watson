/**
 * Copyright 2013,2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then they are stored in sUsername and sPassword, as the
  // service credentials. This separation from sUsername and username to allow
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.
  const SERVICE_IDENTIFIER = 'language-translator',
    LanguageTranslatorV3 = require('ibm-watson/language-translator/v3'),
    { IamAuthenticator } = require('ibm-watson/auth');

  var pkg = require('../../package.json'),
    //cfenv = require('cfenv'),
    payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    translatorutils = require('./translator-utils'),
    responseutils = require('../../utilities/response-utils'),
    fs = require('fs'),
    temp = require('temp'),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    apikey = null,
    sApikey = null,
    //service = cfenv.getAppEnv().getServiceCreds(/language translator/i),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/language-translator/api';
    //endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

  temp.track();

  if (service) {
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
    sEndpoint = service.url;
  }

  // These are APIs that the node has created to allow it to dynamically fetch IBM Cloud
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-translator/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-translator/models', function (req, res) {
    //endpoint = sEndpoint ? sEndpoint : req.query.e;
    endpoint = req.query.e ? req.query.e : sEndpoint;
    var lt = null,
      authSettings = {},
      serviceSettings = {
        version: '2018-05-01',
        url: endpoint,
        headers: {
          'User-Agent': pkg.name + '-' + pkg.version
        }
      };

    if (sApikey || req.query.key) {
      authSettings.apikey = sApikey ? sApikey : req.query.key;
    } else {
      authSettings.username = sUsername ? sUsername : req.query.un;
      authSettings.password = sPassword ? sPassword : req.query.pwd;
    }
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    lt = new LanguageTranslatorV3(serviceSettings);

    lt.listModels({})
      .then((response) => {
        let models = [];
        if (response && response.result && response.result.models) {
          models = response.result;
        }
        res.json(models);
      })
      .catch((err) => {
        res.json(err);
      });
  });


  // This is the Language Translation Node.
  // The node supports four modes
  //
  // 1. translate, for which it will specify a domain, obtained from the available models
  //    along with source and target languages. The node will have only displayed
  //    available translations for the model / domain
  // 2. train, for which a glossary file is required.
  // 3. status, to determine whethere a trained corpus is available
  // 4. delete, to remove a trained corpus extension.

  function SMTNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    function payloadCheck(msg) {
      if (!msg.payload) {
        return Promise.reject('Missing property: msg.payload');
      }
      return Promise.resolve();
    }

    function checkForGlobalOverides(msg) {
      // If the selection is to use global overrides then
      // look for them
      if (config.lgparams2 === false) {
        var globalContext = this.context().global,
          tmpmodel_id = globalContext.get('g_model_id');

        if (tmpmodel_id && tmpmodel_id.length > 1) {
          var result = tmpmodel_id.split('-');
          //msg.model_id = tmpmodel_id;
          msg.domain = result[2];
          msg.srclang = result[0];
          msg.destlang = result[1];
        }
      }
      return Promise.resolve();
    }

    // If a translation is requested, then the model id will have been
    // built by the calling function based on source, target and domain.
    function doTranslate(language_translator, msg, model_id) {
      let p = new Promise(function resolver(resolve, reject) {
        // Please be careful when reading the below. The first parameter is
        // a structure, and the tabbing enforced by codeacy imho obfuscates
        // the code, rather than making it clearer. I would have liked an
        // extra couple of spaces.
        language_translator.translate({
          text: msg.payload,
          modelId: model_id
        })
          .then((response) => {
            responseutils.parseResponseFor(msg, response, 'translations');
            msg.translation = msg.translations;
            msg.payload = msg.translations[0].translation;
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
      return p;
    }

    function determineModelId(msg) {
      let domain = msg.domain || config.domain,
        srclang = msg.srclang || config.srclang,
        destlang = msg.destlang || config.destlang,
        model_id = '';

      if (!domain) {
        return Promise.reject('Missing translation domain, message not translated');
      }
      if (!srclang) {
        return Promise.reject('Missing source language, message not translated');
      }
      if (!destlang) {
        return Promise.reject('Missing target language, message not translated');
      }

      model_id = srclang + '-' + destlang;
      if (domain !== 'news' && domain !== 'general') {
        model_id += ('-' + domain);
      }
      return Promise.resolve(model_id);
    }

    function determineCustomModelId(msg) {
      var custom = msg.custom || config.custom;
      if (!custom) {
        return Promise.reject('Missing customised model, message not translated');
      }
      return Promise.resolve(custom);
    }

    function performTrainPreChecks(msg) {
      var basemodel = msg.basemodel || config.basemodel,
        filetype = msg.filetype || config.filetype;

      if (!basemodel) {
        return Promise.reject('Base Model needs must be set for train mode');
      }
      if (!filetype) {
        return Promise.reject('Filetype needs must be set for train mode');
      }
      return Promise.resolve({ basemodel:basemodel, filetype:filetype});
    }

    function loadFile() {
      var p = new Promise(function resolver(resolve, reject){
        temp.open({
          suffix: '.xml'
        }, function(err, info) {
          if (err) {
            reject(err);
          } else {
            resolve(info);
          }
        });
      });
      return p;
    }

    function syncFile(msg, info) {
      var p = new Promise(function resolver(resolve, reject){
        // Syncing up the asynchronous nature of the stream
        // so that the full file can be sent to the API.
        fs.writeFile(info.path, msg.payload, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return p;
    }

    function setTrainParams(msg, info, td) {
      var params = {};

      // only letters and numbers allowed in the submitted file name
      // Default the name to a string representing now
      params.name = (new Date()).toString().replace(/[^0-9a-z]/gi, '');
      if (msg.filename) {
        params.name = msg.filename.replace(/[^0-9a-z]/gi, '');
      }
      if (params.name.length > 32) {
        params.name = params.name.slice(0, 32);
      }

      params.baseModelId = td.basemodel;

      switch (td.filetype) {
      case 'forcedglossary':
        params.forcedGlossary = fs.createReadStream(info.path);
        break;
      case 'parallelcorpus':
        params.parallelCorpus = fs.createReadStream(info.path);
        break;
      }

      return Promise.resolve(params);
    }

    function doTrain(language_translator, msg, params) {
      var p = new Promise(function resolver(resolve, reject){
        language_translator.createModel(params)
          .then((response) => {
            responseutils.parseResponseFor(msg, response, 'result');
            if (msg.result && msg.result.name && msg.result.model_id) {
              msg.payload = 'Model ' + msg.result.name + ' successfully sent for training with id: ' + msg.result.model_id;
              msg.trained_model_id = msg.result.model_id;
            } else {
              msg.payload = result;
            }
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
      return p;
    }

    function executeDelete(language_translator, msg) {
      let p = new Promise(function resolver(resolve, reject) {
        let trainid = msg.trainid || config.trainid;

        language_translator.deleteModel({modelId: trainid})
          .then((response) => {
            msg.payload = 'Model ' + trainid + ' has been deleted';
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
      return p;
    }

    // Fetch the status of the trained model. It can only be used if the model
    // is available. This will also return any training errors.
    // The full error reason is returned in msg.translation
    function executeGetStatus(language_translator, msg) {
      let p = new Promise(function resolver(resolve, reject) {
        let trainid = msg.trainid || config.trainid;

        language_translator.getModel({modelId: trainid})
          .then((response) => {
            responseutils.parseResponseFor(msg, response, 'result');
            msg.payload = msg.result.status;
            msg.translation = msg.result;
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
      return p;
    }

    function executeListModels(language_translator, msg, onlydefault) {
      let p = new Promise(function resolver(resolve, reject) {
        language_translator.listModels({_default: onlydefault})
          .then((response) => {
            responseutils.parseResponseFor(msg, response, 'models');
            msg.payload = msg.models;
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
      return p;
    }

    function executeTrain(language_translator, msg) {
      let trainingData = {}, p = null, info = null;

      p = performTrainPreChecks(msg)
        .then(function(td){
          trainingData = td;
          return loadFile();
        })
        .then(function(i){
          info = i;
          return syncFile(msg, info);
        })
        .then(function(){
          return setTrainParams(msg, info, trainingData);
        })
        .then(function(params){
          return doTrain(language_translator, msg, params);
        });

      return p;
    }

    function executeCustomTranslate(language_translator, msg) {
      let p = determineCustomModelId(msg)
        .then(function(model_id){
          return doTranslate(language_translator, msg, model_id);
        });
      return p;
    }

    function executeTranslate(language_translator, msg) {
      let p = determineModelId(msg)
        .then(function(model_id){
          return doTranslate(language_translator, msg, model_id);
        });
      return p;
    }

    function executeAction(msg, action) {
      let p = null,
        language_translator = null,
        authSettings = {},
        serviceSettings = {
          version: '2018-05-01',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (apikey) {
        authSettings.apikey = apikey;
      } else {
        authSettings.username = username;
        authSettings.password = password;
      }
      serviceSettings.authenticator = new IamAuthenticator(authSettings);

      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      language_translator = new LanguageTranslatorV3(serviceSettings);

      // We have credentials, and know the mode. Further required fields checks
      // are specific to the requested action.
      // The required fields are checked, before the relevant function is invoked.
      switch (action) {
      case 'translate':
        p = executeTranslate(language_translator, msg);
        break;
      case 'custom':
        p = executeCustomTranslate(language_translator, msg);
        break;
      case 'train':
        p = executeTrain(language_translator, msg);
        break;
      case 'getstatus':
        p = executeGetStatus(language_translator, msg);
        break;
      case 'listdefault':
        p = executeListModels(language_translator, msg, true);
        break;
      case 'listcustom':
        p = executeListModels(language_translator, msg, false);
        break;
      case 'delete':
        p = executeDelete(language_translator, msg);
        break;
      default:
        p = Promise.reject('Unexpected Mode');
        break;
      }

      //p = Promise.reject('Still Implementing');

      return p;
    }


    // The node has received an input as part of a flow, need to determine
    // what the request is for, and based on that if the required fields
    // have been provided.
    this.on('input', function(msg, send, done) {
      var action = msg.action || config.action;

      // The dynamic nature of this node has caused problems with the password field. it is
      // hidden but not a credential. If it is treated as a credential, it gets lost when there
      // is a request to refresh the model list.
      // Credentials are needed for each of the modes.
      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;
      apikey = sApikey || this.credentials.apikey || config.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});

      translatorutils.credentialCheck(username, password, apikey)
        .then(function(){
          return payloadCheck(msg);
        })
        .then(function(){
          return translatorutils.checkForAction(action);
        })
        .then(function(){
          return checkForGlobalOverides(msg);
        })
        .then(function(){
          node.status({fill:'blue', shape:'dot', text:'executing'});
          return executeAction(msg, action);
        })
        .then(function(){
          temp.cleanup();
          node.status({});
          send(msg);
          done();
        })
        .catch(function(err){
          temp.cleanup();
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });
    });
  }

  RED.nodes.registerType('watson-translator', SMTNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'},
      apikey: {type:'password'}
    }
  });
};
