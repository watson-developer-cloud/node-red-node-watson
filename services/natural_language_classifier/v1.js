/**
 * Copyright 2013,2015 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'natural-language-classifier';
  const NaturalLanguageClassifierV1 =
           require('watson-developer-cloud/natural-language-classifier/v1');

  var pkg = require('../../package.json'),
    temp = require('temp'),
    fs = require('fs'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/natural-language-classifier/api';

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
    sEndpoint = service.url;
  }

  temp.track();


  RED.httpAdmin.get('/watson-natural-language-classifier/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function Node(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    // Perform basic check to see that credentials
    // are provided, altough they may still be
    // invalid
    node.verifyCredentials = function(msg) {
      username = sUsername || node.credentials.username;
      password = sPassword || node.credentials.password;

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      if (!username || !password) {
        return Promise.reject('Missing Natural Language Classifier credentials');
      } else {
        return Promise.resolve();
      }
    };

    // Sanity check on the payload, must be present
    node.payloadCheck = function(msg) {
      if (!msg.payload) {
        return Promise.reject('Payload is required');
      } else {
        return Promise.resolve();
      }
    };

    // Standard temp file open
    node.openTemp = function() {
      var p = new Promise(function resolver(resolve, reject) {
        temp.open({
          suffix: '.csv'
        }, function(err, info) {
          if (err) {
            reject(err);
          } else {
            resolve(info);
          }
        });
      });
      return p;
    };

    node.streamFile = function(msg, config, info) {
      var p = new Promise(function resolver(resolve, reject){
        payloadutils.stream_buffer(info.path, msg.payload, function(format) {
          resolve(info);
        });
      });
      return p;
    };


    // If this is a create then the paload will be a stream
    node.checkForCreate = function(msg, config) {
      if ('create' !== config.mode) {
        return Promise.resolve(null);
      } else {
        var p = node.openTemp()
          .then(function(info) {
            return node.streamFile(msg, config, info);
          });
        return p;
      }
    };

    node.buildParams = function(msg, config, info) {
      var params = {},
        message = '';

      switch (config.mode) {
      case 'classify':
        params.text = msg.payload;
        params.classifier_id = config.classifier;
        if (msg.nlcparams && msg.nlcparams.classifier_id) {
          params.classifier_id = msg.nlcparams.classifier_id;
        }
        break;
      case 'create':
        params.training_data = fs.createReadStream(info.path);
        params.language = config.language;
        break;
      case 'remove':
      case 'list':
        params.classifier_id = msg.payload;
        if (msg.nlcparams && msg.nlcparams.classifier_id) {
          params.classifier_id = msg.nlcparams.classifier_id;
        }
        break;
      default:
        message = 'Unknown Natural Language Classification mode, ' + config.mode;
      }

      if (message) {
        return Promise.reject(message);
      } else {
        return Promise.resolve(params);
      }
    };

    node.performOperation = function(msg, config, params) {
      var p = new Promise(function resolver(resolve, reject) {
        var natural_language_classifier = null,
          serviceSettings = {
            username: username,
            password: password,
            version: 'v1',
            headers: {
              'User-Agent': pkg.name + '-' + pkg.version
            }
          };

        if (endpoint) {
          serviceSettings.url = endpoint;
        }

        natural_language_classifier = new NaturalLanguageClassifierV1(serviceSettings);

        natural_language_classifier[config.mode](params, function(err, response) {
          if (err) {
            reject(err);
          } else {
            msg.payload = (config.mode === 'classify') ? {
              classes: response.classes,
              top_class: response.top_class
            } : response;
            resolve();
          }
        });
      });

      return p;
    };


    this.on('input', function(msg) {
      //var params = {}
      node.verifyCredentials(msg)
        .then(function() {
          return node.payloadCheck(msg);
        })
        .then(function() {
          return node.checkForCreate(msg, config);
        })
        .then(function(info) {
          return node.buildParams(msg, config, info);
        })
        .then(function(params) {
          node.status({
            fill: 'blue',
            shape: 'dot',
            text: 'requesting'
          });
          return node.performOperation(msg, config, params);
        })
        .then(function() {
          temp.cleanup();
          node.status({});
          node.send(msg);
        })
        .catch(function(err) {
          var messageTxt = err.error ? err.error : err;
          node.status({
            fill: 'red',
            shape: 'dot',
            text: messageTxt
          });
          node.error(messageTxt, msg);
        });
    });
  }
  RED.nodes.registerType('watson-natural-language-classifier', Node, {
    credentials: {
      username: {
        type: 'text'
      },
      password: {
        type: 'password'
      }
    }
  });
};
