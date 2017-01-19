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
  var request = require('request'),
    cfenv = require('cfenv'),
    url = require('url'),
    temp = require('temp'),
    fs = require('fs'),
    fileType = require('file-type'),
    serviceutils = require('../../utilities/service-utils'),
    sttV1 = require('watson-developer-cloud/speech-to-text/v1'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

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

  var username, password, sUsername, sPassword;

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  function reportError (node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    msg.stterror = messageTxt;

    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(messageTxt, msg);
  }

  function executeCreateCustomisation(node, stt, params, msg) {
    stt.createCustomization(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err);
      } else {
        msg['customization_id'] = response;
      }
      node.send(msg);
    });
  }

  function executeListCustomisations(node, stt, params, msg) {
    stt.getCustomizations(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err);
      } else {
        msg['customizations'] = response.customizations ?
                                      response.customizations: response;
      }
      node.send(msg);
    });
  }

  function executeGetCustomisation(node, stt, params, msg) {
    stt.getCustomization(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err);
      } else {
        msg['customization'] = response ;
      }
      node.send(msg);
    });
  }

  function executeAddCorpus(node, stt, params, msg) {
    stt.addCorpus(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err);
      } else {
        msg['addcorpusresponse'] = response ;
      }
      node.send(msg);
    });
  }

  function executeGetCorpora(node, stt, params, msg) {
    stt.getCorpora(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err);
      } else {
        msg['corpora'] = response.corpora ? response.corpora : response ;
      }
      node.send(msg);
    });
  }

  function executeMethod(node, method, params, msg) {
    var stt = new sttV1({
      username: username,
      password: password,
    });

    node.status({fill:'blue', shape:'dot', text:'executing'});

    switch (method) {
    case 'createCustomisation':
      executeCreateCustomisation(node, stt, params, msg);
      break;
    case 'listCustomisations':
      executeListCustomisations(node, stt, params, msg);
      break;
    case 'getCustomisation':
      executeGetCustomisation(node, stt, params, msg);
      break;
    case 'addCorpus':
      executeAddCorpus(node, stt, params, msg);
      break;
    case 'getCorpora':
      executeGetCorpora(node, stt, params, msg);
      break;
    }
  }

  function buildParams(msg, config) {
    var params = {};
    if (config['stt-base-model']) {
      params['base_model_name'] = config['stt-base-model'];
    }

    if (config['stt-custom-model-name']) {
      params['name'] = config['stt-custom-model-name'];
    } else if (config['stt-corpus-name']) {
      params['name'] = config['stt-corpus-name'];
    }

    if (config['stt-custom-model-description']) {
      params['description'] = config['stt-custom-model-description'];
    }
    if (config['stt-custom-id']) {
      params['customization_id'] = config['stt-custom-id'];
    }

    return params;
  }


  function loadCorpusFile(node, method, params, msg) {
    console.log('Need to Load File');
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

        params.corpus = fs.createReadStream(info.path);
        executeMethod(node, method, params, msg);
      });
    });
  }

  function checkForFile(method) {
    switch (method) {
    case 'addCorpus':
      return true;
      break;
    }
    return false;
  }


  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-speech-to-text-v1-query-builder/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


   // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-speech-to-text-v1-query-builder/models', function (req, res) {
    var stt = new sttV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd
    });

    stt.getModels({}, function(err, models){
      if (err) {
        res.json(err);
      } else {
        res.json(models);
      }
    });
  });


  // This is the Speech to Text V1 Query Builder Node
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var method = config['stt-custom-mode'],
        message = '',
        params = {};

      console.log('Mode is ');
      console.log(method);

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;

      if (!username || !password) {
        message = 'Missing Watson Speech to Text service credentials';
      } else if (!method || '' === method) {
        message = 'Required mode has not been specified';
      } else {
        params = buildParams(msg,config);
      }

      if (message) {
        reportError(node, msg, message);
        return;
      }

      if (checkForFile(method)) {
        loadCorpusFile(node, method, params, msg)
      } else {
        executeMethod(node, method, params, msg);
      }

      // Simply return params for query on msg object
      //msg.payload = 'OK So far';
      //node.send(msg);
    });
  }

  RED.nodes.registerType('watson-speech-to-text-v1-query-builder', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });

};
