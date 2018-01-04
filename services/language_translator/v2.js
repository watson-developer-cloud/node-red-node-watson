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
  const SERVICE_IDENTIFIER = 'language-translator';
  var pkg = require('../../package.json'),
    LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2'),
    //cfenv = require('cfenv'),
    payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    fs = require('fs'),
    temp = require('temp'),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    //service = cfenv.getAppEnv().getServiceCreds(/language translator/i),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/language-translator/api';
    //endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

  temp.track();

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
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
      neural = req.query.n ? true : false,
      serviceSettings = {
        username: sUsername ? sUsername : req.query.un,
        password: sPassword ? sPassword : req.query.pwd,
        version: 'v2',
        url: endpoint,
        headers: {
          'User-Agent': pkg.name + '-' + pkg.version
        }
      };

    if (neural) {
      serviceSettings.headers['X-Watson-Technology-Preview'] = '2017-07-01';
    }

    lt = new LanguageTranslatorV2(serviceSettings);

    lt.getModels({}, function (err, models) {
      if (err) {
        res.json(err);
      }
      else {
        res.json(models);
      }
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


    function initialCheck(u, p) {
      if (!u || !p) {
        return Promise.reject('Missing Watson Language Translator service credentials');
      }
      return Promise.resolve();
    }

    function payloadCheck(msg) {
      if (!msg.payload) {
        return Promise.reject('Missing property: msg.payload');
      }
      return Promise.resolve();
    }

    function checkForAction(action) {
      if (!action) {
        return Promise.reject('Missing action, please select one');
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
      var p = new Promise(function resolver(resolve, reject){
        // Please be careful when reading the below. The first parameter is
        // a structure, and the tabbing enforced by codeacy imho obfuscates
        // the code, rather than making it clearer. I would have liked an
        // extra couple of spaces.
        language_translator.translate({
          text: msg.payload,
          model_id: model_id
        },
        function (err, response) {
          if (err) {
            reject(err);
          } else {
            msg.translation = {};
            msg.translation.response = response;
            msg.payload = response.translations[0].translation;
            resolve();
          }
        });

      });
      return p;
    }

    function determineModelId(msg) {
      var domain = msg.domain || config.domain,
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
      if (domain !== 'news') {
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
      params.base_model_id = td.basemodel;

      switch (td.filetype) {
      case 'forcedglossary':
        params.forced_glossary = fs.createReadStream(info.path);
        break;
      case 'parallelcorpus':
        params.parallel_corpus = fs.createReadStream(info.path);
        break;
      case 'monolingualcorpus':
        params.monolingual_corpus = fs.createReadStream(info.path);
        break;
      }

      return Promise.resolve(params);
    }

    function doTrain(language_translator, msg, params) {
      var p = new Promise(function resolver(resolve, reject){
        language_translator.createModel(params,
          function(err, model){
            if (err) {
              reject(err);
            } else {
              msg.payload = 'Model ' + model.name + ' successfully sent for training with id: ' + model.model_id;
              msg.trained_model_id = model.model_id;
              resolve();
            }
          });
      });
      return p;
    }

    function executeDelete(language_translator, msg) {
      var p = new Promise(function resolver(resolve, reject) {
        var trainid = msg.trainid || config.trainid;
        language_translator.deleteModel (
          {
            model_id: trainid,
          },
          function (err) {
            if (err) {
              reject(err);
            } else {
              msg.payload = 'Model ' + trainid + ' has been deleted';
              resolve();
            }
          });
      });
      return p;
    }

    // Fetch the status of the trained model. It can only be used if the model
    // is available. This will also return any training errors.
    // The full error reason is returned in msg.translation
    function executeGetStatus(language_translator, msg) {
      var p = new Promise(function resolver(resolve, reject) {
        var trainid = msg.trainid || config.trainid;

        language_translator.getModel(
          {
            model_id: trainid,
          },
          function (err, model) {
            if (err) {
              reject(err);
            } else {
              msg.payload = model.status;
              msg.translation = model;
              resolve();
            }
          }
        );
      });
      return p;
    }

    function executeTrain(language_translator, msg) {
      var trainingData = {}, p = null, info = null;

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
      var p = determineCustomModelId(msg)
        .then(function(model_id){
          return doTranslate(language_translator, msg, model_id);
        });
      return p;
    }


    function executeTranslate(language_translator, msg) {
      var p = determineModelId(msg)
        .then(function(model_id){
          return doTranslate(language_translator, msg, model_id);
        });
      return p;
    }

    function executeAction(msg, action) {
      var p = null,
        language_translator = null,
        serviceSettings = {
          username: username,
          password: password,
          version: 'v2',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      if (config.neural && 'translate' === action) {
        serviceSettings.headers['X-Watson-Technology-Preview'] = '2017-07-01';
      }

      language_translator = new LanguageTranslatorV2(serviceSettings);

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
    this.on('input', function (msg) {
      var action = msg.action || config.action;

      // The dynamic nature of this node has caused problems with the password field. it is
      // hidden but not a credential. If it is treated as a credential, it gets lost when there
      // is a request to refresh the model list.
      // Credentials are needed for each of the modes.
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
          return checkForAction(action);
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
          node.send(msg);
        })
        .catch(function(err){
          temp.cleanup();
          payloadutils.reportError(node,msg,err);
          node.send(msg);
        });
    });
  }

  RED.nodes.registerType('watson-translator', SMTNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
