/**
 * Copyright 2016, 2022 IBM Corp.
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

  const SERVICE_IDENTIFIER = 'discovery';
  var discoveryutils = require('./discovery-utils'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    responseutils = require('../../utilities/response-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    apikey = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/discovery/api';

const ExecutionList = {
  'createEnvrionment': executeCreateEnvrionment,
  'listEnvrionments': executeListEnvrionments,
  'getEnvironmentDetails': executeEnvrionmentDetails,
  'createCollection': executeCreateCollection,
  'listCollections': executeListCollections,
  'getCollectionDetails': executeGetCollectionDetails,
  'deleteCollection': executeDeleteCollection,
  'createConfiguration': executeCreateConfiguration,
  'listConfigurations': executeListConfigurations,
  'getConfigurationDetails': executeGetConfigurationDetails,
  'deleteConfiguration': executeDeleteConfiguration,
  'deleteEnvironment': executeDeleteEnvironment,
  'listExpansions': executeListExpansions,
  'listTrainingData': executeListTrainingData,
  'query': executeQuery,
  'queryNotices': executeQueryNotices
};


  function checkParams(method, params){
    var response = '';
    switch (method) {
    case 'createEnvrionment':
      response = discoveryutils.paramNameCheck(params) +
            discoveryutils.paramDescriptionCheck(params);
      break;
    case 'createConfiguration':
      response = discoveryutils.paramNameCheck(params) +
          discoveryutils.paramEnvCheck(params) +
          discoveryutils.paramJSONCheck(params);
      break;
    case 'getEnvironmentDetails':
    case 'listCollections':
      response = discoveryutils.paramEnvCheck(params);
      break;
    case 'getCollectionDetails':
    case 'query':
    case 'queryNotices':
    case 'listExpansions':
    case 'listTrainingData':
      response = discoveryutils.paramEnvCheck(params) +
             discoveryutils.paramCollectionCheck(params);
      break;
    case 'listConfigurations':
      response = discoveryutils.paramEnvCheck(params);
      break;
    case 'getConfigurationDetails':
      response = discoveryutils.paramEnvCheck(params) +
             discoveryutils.paramConfigurationCheck(params);
      break;
    }
    if (response) {
      return Promise.reject(response);
    } else {
      return Promise.resolve();
    }
  }

  function executeCreateEnvrionment(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.createEnvironment(params)
        .then((response) => {
          msg.environment = response.result ? response.result : response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    return p;
  }

  function executeListEnvrionments(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.listEnvironments(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'environments');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    return p;
  }

  function executeEnvrionmentDetails(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getEnvironment(params)
        .then((response) => {
          msg.environment_details = response;
          if (response && response.result) {
            msg.environment_details = response.result;
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    return p;
  }

  function executeCreateCollection(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){

      //params.body = {};
      //['name','description','collection_name'
      //    'configuration_id'].forEach(function(f) {
      //  params.body[f] = params[f];
      //  //delete params[f];
      //});

      discovery.createCollection(params)
      .then((response) => {
        msg.collection = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeDeleteCollection(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.deleteCollection(params)
      .then((response) => {
        msg.collection = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeDeleteConfiguration(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.deleteConfiguration(params)
      .then((response) => {
        msg.configuration = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }


  function executeDeleteEnvironment(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.deleteEnvironment(params)
      .then((response) => {
        msg.environment = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeListCollections(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.listCollections(params)
      .then((response) => {
        responseutils.parseResponseFor(msg, response, 'collections');
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeGetCollectionDetails(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getCollection(params)
      .then((response) => {
        msg.collection_details = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeListExpansions(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.listExpansions(params)
      .then((response) => {
        responseutils.parseResponseFor(msg, response, 'expansions');
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeListTrainingData(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.listTrainingData(params)
      .then((response) => {
        msg.trainingData = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }


  function executeCreateConfiguration(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.createConfiguration(params)
      .then((response) => {
        msg.configuration = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeListConfigurations(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.listConfigurations(params)
      .then((response) => {
        responseutils.parseResponseFor(msg, response, 'configurations');
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeGetConfigurationDetails(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getConfiguration(params)
      .then((response) => {
        msg.configuration_details = response.result ? response.result : response;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function executeQuery(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.query(params)
        .then((response) => {
          msg.search_results = response;
          if (response && response.result) {
            msg.search_results = response.result;
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    return p;
  }

  function executeQueryNotices(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.queryNotices(params)
      .then((response) => {
        msg.search_results = response;
        if (response && response.result) {
          msg.search_results = response.result;
        }
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
    return p;
  }

  function unknownMethod(node, discovery, params, msg) {
    return Promise.reject('Unable to process as unknown mode has been specified');
  }

  function executeMethod(node, method, params, msg) {
    let discovery = discoveryutils.buildService(apikey, endpoint);

    let exe = ExecutionList[method];
    if (!exe) {
      exe = unknownMethod
    }

    return exe(node, discovery, params, msg);
  }

  function initialCheck(k, m) {
    var message = '';
    if (!k) {
      message = 'Missing Watson Discovery service credentials';
    } else if (!m || '' === m) {
      message = 'Required Discovery method has not been specified';
    }
    if (message){
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  if (dservice) {
    sApikey = dservice.apikey ? dservice.apikey : '';
    sEndpoint = dservice.url ? dservice.url : '';
  }

  RED.httpAdmin.get('/watson-discovery/vcap', function (req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function(msg, send, done) {

      var method = config['discovery-method'],
        message = '',
        params = {};

      apikey = sApikey || node.credentials.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(apikey, method)
        .then(function(){
          params = discoveryutils.buildParams(msg,config);
          return checkParams(method, params);
        })
        .then(function(){
          node.status({fill:'blue', shape:'dot', text:'requesting'});
          return executeMethod(node, method, params, msg);
        })
        .then(function(){
          node.status({});
          send(msg);
          done();
        })
        .catch(function(err){
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });
    });
  }

  RED.nodes.registerType('watson-discovery-v1', Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });
};
