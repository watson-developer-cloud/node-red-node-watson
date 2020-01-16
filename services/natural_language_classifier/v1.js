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
  const SERVICE_IDENTIFIER = 'natural-language-classifier',
    NaturalLanguageClassifierV1 = require('ibm-watson/natural-language-classifier/v1'),
    { IamAuthenticator } = require('ibm-watson/auth');

  var pkg = require('../../package.json'),
    temp = require('temp'),
    fs = require('fs'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    responseutils = require('../../utilities/response-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    apikey = null,
    sUsername = null,
    sPassword = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/natural-language-classifier/api';

  if (service) {
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
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
    let node = this;

    // Perform basic check to see that credentials
    // are provided, altough they may still be
    // invalid
    node.verifyCredentials = function(msg) {
      username = sUsername || node.credentials.username;
      password = sPassword || node.credentials.password;
      apikey = sApikey || node.credentials.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      if (!apikey && (!username || !password)) {
        return Promise.reject('Missing Natural Language Classifier credentials');
      } else {
        return Promise.resolve();
      }
    };

    // default the mode if not what expected.
    node.modeCheck = function(msg) {
      switch(config.mode) {
        case 'classify':
        case 'createClassifier':
        case 'listClassifiers':
        case 'getClassifier':
        case 'deleteClassifier':
          break;
        default:
          config.mode = 'classify';
      }
      return Promise.resolve();
    };

    // Sanity check on the payload, must be present
    node.payloadCheck = function(msg) {
      switch(config.mode) {
        case 'classify':
        case 'createClassifier':
          if (!msg.payload) {
            return Promise.reject('Payload is required');
          }
          break;
      }
      return Promise.resolve();
    };

    node.payloadCollectionCheck = function(msg, config, payloadData) {
      if ('classify' === config.mode) {
        if ('string' === typeof msg.payload && (! config['collections-off'])) {
          let collection = msg.payload.match( /\(?([^.?!]|\.\w)+[.?!]\)?/g );
          if (collection && collection.length > 1) {
            payloadData.collection = [];
            collection.forEach((s) => {
              let textObject = { text : s };
              payloadData.collection.push(textObject);
            });
          }
        } else if (Array.isArray(msg.payload)){
          payloadData.collection = [];
          msg.payload.forEach((p) => {
            if ('string' === typeof p) {
              let textObject = { text : p };
              payloadData.collection.push(textObject);
            } else if ('object' === typeof p) {
              payloadData.collection.push(p);
            }
          });
        }
      }
      return Promise.resolve();
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


    // If this is a create then the payload will be a stream
    node.checkForCreate = function(msg, config) {
      if ('createClassifier' !== config.mode) {
        return Promise.resolve(null);
      } else if ('string' === typeof msg.payload) {
        return Promise.resolve(null);
      }
      return node.openTemp()
        .then(function(info) {
          return node.streamFile(msg, config, info);
        });
    };

    node.buildParams = function(msg, config, info, payloadData) {
      var params = {},
        message = '';

      switch (config.mode) {
      case 'classify':
        if (payloadData && payloadData.collection) {
          params.collection = payloadData.collection;
        } else {
          params.text = msg.payload;
        }

        params.classifierId = config.classifier;
        if (msg.nlcparams && msg.nlcparams.classifier_id) {
          params.classifierId = msg.nlcparams.classifier_id;
        }
        break;
      case 'createClassifier':
        params.language = config.language;

        let meta = {
          language : config.language
        };

        params.trainingMetadata = Buffer.from(JSON.stringify(meta));

        //params.trainingMetadata = meta;

        if ('string' === typeof msg.payload) {
          params.trainingData = msg.payload;
        } else {
          params.trainingData = fs.createReadStream(info.path);
        }
        break;
      case 'deleteClassifier':
      case 'listClassifiers':
      case 'getClassifier':
        params.classifierId = config.classifier ? config.classifier : msg.payload;
        if (msg.nlcparams && msg.nlcparams.classifier_id) {
          params.classifierId = msg.nlcparams.classifier_id;
        }
        break;
      case 'listClassifiers':
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
        let natural_language_classifier = null,
          authSettings = {};
          serviceSettings = {
            version: 'v1',
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

        natural_language_classifier = new NaturalLanguageClassifierV1(serviceSettings);

        let mode = config.mode;
        if (params.collection) {
          mode = 'classifyCollection';
        }

        natural_language_classifier[mode](params)
          .then((response) => {
            switch (mode) {
            case 'classify':
              responseutils.parseResponseFor(msg, response, 'result');
              msg.payload = {
                classes: msg.result.classes,
                top_class: msg.result.top_class
              };
              break;
            case 'classifyCollection':
              responseutils.parseResponseFor(msg, response, 'collection');
              msg.payload = msg.collection;
              break;
            case 'listClassifiers':
              responseutils.parseResponseFor(msg, response, 'classifiers');
              msg.payload = msg.classifiers;
              break;
            case 'getClassifier':
              responseutils.parseResponseFor(msg, response, 'result');
              msg.payload = msg.result;
              break;
            default:
              msg.payload = response;
            }
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });

      return p;
    };


    this.on('input', function(msg, send, done) {
      //var params = {}
      let payloadData = {};

      node.verifyCredentials(msg)
        .then(function() {
          return node.modeCheck(msg);
        })
        .then(function() {
          return node.payloadCheck(msg);
        })
        .then(function() {
          return node.payloadCollectionCheck(msg, config, payloadData);
        })
        .then(function() {
          return node.checkForCreate(msg, config);
        })
        .then(function(info) {
          return node.buildParams(msg, config, info, payloadData);
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
          send(msg);
          done();
        })
        .catch(function(err) {
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });
    });
  }
  RED.nodes.registerType('watson-natural-language-classifier', Node, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'password'},
      apikey: {type:'password'}
    }
  });
};
