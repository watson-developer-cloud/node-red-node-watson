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
  const SERVICE_IDENTIFIER = 'visual-recognition',
    VisualRecognitionV4 = require('ibm-watson/visual-recognition/v4'),
    { IamAuthenticator } = require('ibm-watson/auth'),
    FEATURE = 'image-feature',
    REQUIRED_PARAMS = {
      'createCollection': ['name', 'description'],
      'getCollection': ['collectionId'],
      'updateCollection': ['collectionId'],
      'deleteCollection': ['collectionId']
    };

  var pkg = require('../../package.json'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    temp = require('temp'),
    sAPIKey = null,
    apikey = '',
    service = null,
    endpoint = '',
    sEndpoint = '';

  // temp is being used for file streaming to allow the file to arrive so it can be processed.
  temp.track();

  service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sAPIKey = service.api_key || service.apikey;
    sEndpoint = service.url;
  }

  RED.httpAdmin.get('/watson-visual-recognition-v4/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function invokeCollectionMethod(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      let service = node.service;
      let method = node.config[FEATURE];
      let params = msg.params;

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

  function processTheResponse (body, node, msg) {
    if (body == null) {
      return Promise.reject('call to watson visual recognition v4 service failed');
    } else if (node.config[FEATURE] === 'deleteCollection') {
        msg.payload = 'Successfully deleted collection id: ' + msg.params.collectionId;
    } else {
        msg.payload = body;
    }
    return Promise.resolve();
  }

  function extractIDs(body) {
    let ids = [];

    if (body && body instanceof Object) {
      if (body.collections && body.collections instanceof Array) {
        body.collections.forEach((c) => {
          if (c instanceof Object && c['collection_id']) {
            ids.push(c['collection_id']);
          }
        });
      }
      if (ids.length > 0) {
        return Promise.resolve(ids);
      }
    }

    return Promise.reject('No Collection IDs found');
  }

  function performDeleteCollection(node, msg, IDs) {
    return new Promise(function resolver(resolve, reject) {
      let promises = [];

      IDs.forEach((id) => {
        let msgClone = JSON.parse(JSON.stringify(msg));
        node.config[FEATURE] = 'deleteCollection';
        msgClone.params = {
          'collectionId' : id
        }
        promises.push(invokeCollectionMethod(node, msgClone));
      });

      Promise.all(promises).then(() => {
        resolve();
      })
    });
  }

  function performDeleteAllCollections(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      let ids = null;
      node.config[FEATURE] = 'listCollections';
      invokeCollectionMethod(node, msg)
        .then((body) => {
          return extractIDs(body);
        })
        .then((IDs) => {
          ids = IDs
          return performDeleteCollection(node, msg, IDs);
        })
        .then(() => {
          node.config[FEATURE] = 'deleteAllCollections';
          resolve('Successfully deleted collections : '+ ids.join(' and '));
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function execute(node, msg) {
    return new Promise(function resolver(resolve, reject) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'Invoking ' + node.config[FEATURE] + ' ...'
      });

      let executeOperation = invokeCollectionMethod;
      if ('deleteAllCollections' === node.config[FEATURE]) {
        executeOperation = performDeleteAllCollections;
      }

      executeOperation(node, msg)
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
      return Promise.reject('Missing Watson Visual Recognition API service credentials');
    }

    let authSettings  = {};

    var serviceSettings = {
      version: '2019-02-11',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    authSettings.apikey = apikey;
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    node.service = new VisualRecognitionV4(serviceSettings);

    return Promise.resolve();
  }


  function determineEndpoint(config) {
    endpoint = sEndpoint;
    if (!endpoint && config['vr-service-endpoint']) {
      endpoint = config['vr-service-endpoint'];
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

  function verifyParams(node, msg) {
    let params = {};
    let theMissing = [];
    let feature = node.config[FEATURE];

    switch (feature) {

      case 'createCollection':
      case 'getCollection':
      case 'updateCollection':
      case 'deleteCollection':
        theMissing = paramCheckFor(REQUIRED_PARAMS[feature], msg);
        if (theMissing.length === 0) {
          return Promise.resolve();
        } else {
          return Promise.reject('Missing parameter(s) : ' + theMissing.join(' and '));
        }

      case 'listCollections':
      case 'deleteAllCollections':
        if (! msg.params) {
          msg.params = {};
        }
        return Promise.resolve();

      default:
        return Promise.reject('Unknown Mode');
    }
  }

  function verifyPayload(node, msg) {
    switch (node.config[FEATURE]) {
      case 'createCollection':
      case 'listCollections':
      case 'getCollection':
      case 'updateCollection':
      case 'deleteCollection':
      case 'deleteAllCollections':
        return Promise.resolve();
      default:
        return Promise.reject('Missing property: msg.payload');
    }
  }

  function verifyFeatureMode(node, msg) {
    let f = node.config[FEATURE];
    if (!f) {
      let errMsg = 'No configuration value for mode found';
      node.error(errMsg);
      return Promise.reject(errMsg);
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
          return verifyParams(node, msg);
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

  // This is the Watson Visual Recognition V3 Node
  function WatsonVisualRecognitionV4Node(config) {
    let node = this;

    RED.nodes.createNode(this, config);
    node.config = config;

    node.on('input', function(msg, send, done) {
      var params = {};

      node.status({});

      processOnInput(node, msg)
        .then(() => {
          temp.cleanup();
          node.status({});
          send(msg);
          done();
        })
        .catch((err) => {
          payloadutils.reportError(node, msg, err);

          msg.payload = {};
          msg.payload['error'] = err;
          // Note: This node.send forwards the error to the next node,
          // if this isn't desired then this line needs to be removed.
          // Should be ok as the node.error would already have recorded
          // the error in the debug console.
          temp.cleanup();
          send(msg);
          done(err);
        });
    });
  }


  RED.nodes.registerType('visual-recognition-util-v4', WatsonVisualRecognitionV4Node, {
    credentials: {
      apikey: {
        type: 'password'
      }
    }
  });

};
