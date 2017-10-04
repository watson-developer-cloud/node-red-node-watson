/**
 * Copyright 20016 IBM Corp.
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
  var pkg = require('../../package.json'),
    discoveryutils = require('./discovery-utils'),
    DiscoveryV1 = require('watson-developer-cloud/discovery/v1'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/discovery/api';


  function checkParams(method, params){
    var response = '';
    switch (method) {
    case 'createEnvrionment':
      response = discoveryutils.paramNameCheck(params) +
            discoveryutils.paramDescriptionCheck(params);
      break;
    case 'createConfiguration':
      response = discoveryutils.paramEnvCheck(params) +
          discoveryutils.paramJSONCheck(params);
      break;
    case 'getEnvironmentDetails':
    case 'listCollections':
      response = discoveryutils.paramEnvCheck(params);
      break;
    case 'getCollectionDetails':
    case 'query':
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
      discovery.createEnvironment(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.environment = response.environment ? response.environment : response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListEnvrionments(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getEnvironments(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.environments = response.environments ? response.environments : [];
          resolve();
        }
      });
    });
    return p;
  }

  function executeEnvrionmentDetails(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getEnvironment(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.environment_details = response;
          resolve();
        }
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

      discovery.createCollection(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.collection = response.collection ? response.collection : response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteCollection(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.deleteCollection(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.collection = response.collection ? response.collection : response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteEnvironment(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.deleteEnvironment(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.environment = response.environment ? response.environment : response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListCollections(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getCollections(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.collections = response.collections ? response.collections : [];
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetCollectionDetails(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getCollection(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.collection_details = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateConfiguration(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.createConfiguration(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.configuration = response.configuration ? response.configuration : response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListConfigurations(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getConfigurations(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.configurations = response.configurations ? response.configurations : [];
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetConfigurationDetails(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.getConfiguration(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.configuration_details = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeQuery(node, discovery, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      discovery.query(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.search_results = response;
          resolve();
        }
      });
    });
    return p;
  }

  function unknownMethod(node, discovery, params, msg) {
    return Promise.reject('Unable to process as unknown mode has been specified');
  }

  function executeMethod(node, method, params, msg) {
    var discovery = null, p = null,
      serviceSettings = {
        username: username,
        password: password,
        version_date: '2017-09-01',
        headers: {
          'User-Agent': pkg.name + '-' + pkg.version
        }
      };

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    discovery = new DiscoveryV1(serviceSettings);

    switch (method) {
    case 'createEnvrionment':
      p = executeCreateEnvrionment(node, discovery, params, msg);
      break;
    case 'listEnvrionments':
      p = executeListEnvrionments(node, discovery, params, msg);
      break;
    case 'getEnvironmentDetails':
      p = executeEnvrionmentDetails(node, discovery, params, msg);
      break;
    case 'createCollection':
      p = executeCreateCollection(node, discovery, params, msg);
      break;
    case 'listCollections':
      p = executeListCollections(node, discovery, params, msg);
      break;
    case 'getCollectionDetails':
      p = executeGetCollectionDetails(node, discovery, params, msg);
      break;
    case 'deleteCollection':
      p = executeDeleteCollection(node, discovery, params, msg);
      break;
    case 'createConfiguration':
      p = executeCreateConfiguration(node, discovery, params, msg);
      break;
    case 'listConfigurations':
      p = executeListConfigurations(node, discovery, params, msg);
      break;
    case 'getConfigurationDetails':
      p = executeGetConfigurationDetails(node, discovery, params, msg);
      break;
    case 'deleteEnvironment':
      p = executeDeleteEnvironment(node, discovery, params, msg);
      break;
    case 'query':
      p = executeQuery(node, discovery, params, msg);
      break;
    default :
      p = unknownMethod(node, discovery, params, msg);
      break;
    }
    return p;
  }

  function initialCheck(u, p, m) {
    var message = '';
    if (!u || !p) {
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
    sUsername = dservice.username;
    sPassword = dservice.password;
    sEndpoint = dservice.url;
  }

  RED.httpAdmin.get('/watson-discovery/vcap', function (req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      var method = config['discovery-method'],
        message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(username, password, method)
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
          node.send(msg);
        })
        .catch(function(err){
          //discoveryutils.reportError(node,msg,err);
          payloadutils.reportError(node,msg,err);
          node.send(msg);
        });
    });
  }

  RED.nodes.registerType('watson-discovery-v1', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
