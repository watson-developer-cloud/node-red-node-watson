/**
 * Copyright 2020 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
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
  const SERVICE_IDENTIFIER = 'natural-language-understanding',
    NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1'),
    { IamAuthenticator } = require('ibm-watson/auth'),
    FEATURE = 'nlu-model-mode',
    DEFAULT_MODE = 'listModels';

  var pkg = require('../../package.json'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    sAPIKey = null,
    apikey = '',
    service = null,
    endpoint = '',
    sEndpoint = '';


  service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sAPIKey = service.api_key || service.apikey;
    sEndpoint = service.url;
  }

  RED.httpAdmin.get('/watson-nlu-model-manager-v4/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function invokeMethod(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      let service = node.service;
      let method = node.config[FEATURE];
      let params = node.params;

      service[method](params)
        .then((data) => {
          let result = data
          if (data && data.result) {
            result = data.result;
          }
         resolve(result);
        })
        .catch((err) => {
          reject(err);
        })
    });
  }

  function responseForDeleteMode(node, msg) {
    let feature = node.config[FEATURE];
    let field = null;

    switch (feature) {
      case 'deleteModel':
        msg.payload = 'Successfully deleted model: ' + node.params.modelId;
        break;
      default:
        return false;
    }
    return true;
  }

  function processTheResponse (body, node, msg) {
    return new Promise(function resolver(resolve, reject) {
      if (body == null) {
        return reject('call to watson nlu v1 service failed');
      } else if (! responseForDeleteMode(node, msg)) {
        msg.payload = body;
        if (body && body.models) {
          msg.payload = body.models;
        }
        resolve();
      }
    });
  }

  function execute(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'Invoking ' + node.config[FEATURE] + ' ...'
      });

      invokeMethod(node, msg)
        .then((data)=> {
          return processTheResponse(data, node, msg);
        })
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function verifyServiceCredentials(node, msg) {
    // If it is present the newly provided user entered key
    // takes precedence over the existing one.
    apikey = sAPIKey || node.credentials.apikey;
    if (!apikey) {
      return Promise.reject('Missing Watson NLU API service credentials');
    }

    let authSettings  = {};

    var serviceSettings = {
      version: '2021-08-01',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    authSettings.apikey = apikey;
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    node.service = new NaturalLanguageUnderstandingV1(serviceSettings);

    return Promise.resolve();
  }


  function determineEndpoint(config) {
    endpoint = sEndpoint;
    if (!endpoint && config['nlu-service-endpoint']) {
      endpoint = config['nlu-service-endpoint'];
    }

    if (!endpoint) {
      return Promise.reject('No endpoint URL has been provided');
    }
    return Promise.resolve();
  }

  function paramCheckFor(requiredFields, msg){
    let theMissing = [];

    if (!msg || !msg.params) {
      theMissing = requiredFields;
    } else {
      requiredFields.forEach((r) => {
        if (! msg.params[r]) {
          theMissing.push(r);
        }
      })
    }

    return theMissing;
  }


  function bufferCheck(data) {
    return data instanceof Buffer;
  }


  function imagesExpected(feature) {
    switch(feature) {
      case 'addImages':
      case 'analyze':
        return true;
      default:
        return false;
    }
  }

  function processPayload(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      if ('deleteModel' === node.config[FEATURE]) {
        node.params['modelId'] = msg.payload;
      }
      return resolve();
    });
  }

  function verifyPayload(node, msg) {
    switch (node.config[FEATURE]) {
      case 'listModels':
        return Promise.resolve();
      case 'deleteModel':
        if (!msg.payload || 'string' !== typeof msg.payload) {
          return Promise.reject('Missing property model identifier: msg.payload');
        }
        return Promise.resolve();
      default:
        return Promise.reject('Unknown mode has been specified');
    }
  }

  function verifyFeatureMode(node, msg) {
    let f = node.config[FEATURE];
    if (!f) {
      node.config[FEATURE] = DEFAULT_MODE;
    }
    return Promise.resolve();
  }


  // This is the processing of the On input event
  function processOnInput(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      // Verify that a mode has been set
      verifyFeatureMode(node, msg)
        .then(() => {
          // Using the mode verify that the payload conforms
          return verifyPayload(node, msg);
        })
        .then(() => {
          return processPayload(node, msg);
        })
        .then(() => {
          return determineEndpoint(node.config);
        })
        .then(() => {
          return verifyServiceCredentials(node, msg);
        })
        .then(() => {
          return execute(node, msg);
        })
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
      });
  }

  // This is the Watson NLU Model Manager Node
  function NLUModelManagerNode(config) {
    let node = this;

    RED.nodes.createNode(this, config);
    node.config = config;
    node.params = {};

    node.on('input', function(msg, send, done) {
      var params = {};

      node.status({});

      processOnInput(node, msg)
        .then(() => {
          node.status({});
          send(msg);
          done();
        })
        .catch((err) => {
          payloadutils.reportError(node, msg, err);
          done(err);
        });
    });
  }


  RED.nodes.registerType('natural-language-understanding-model-manager-v1', NLUModelManagerNode, {
    credentials: {
      apikey: {
        type: 'password'
      }
    }
  });

};
