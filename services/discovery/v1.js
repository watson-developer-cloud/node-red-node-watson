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
  var discoveryutils = require('./discovery-utils'),
    DiscoveryV1 = require('watson-developer-cloud/discovery/v1'),
    serviceutils = require('../../utilities/service-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null;

  function checkParams(method, params){
    var response = '';
    switch (method) {
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
    return response;
  }

  function executeListEnvrionments(node, discovery, params, msg) {
    discovery.getEnvironments(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.environments = response.environments ? response.environments : [];
      }
      node.send(msg);
    });
  }

  function executeEnvrionmentDetails(node, discovery, params, msg) {
    discovery.getEnvironment(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.environment_details = response;
      }
      node.send(msg);
    });
  }

  function executeListCollections(node, discovery, params, msg) {
    discovery.getCollections(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.collections = response.collections ? response.collections : [];
      }
      node.send(msg);
    });
  }

  function executeGetCollectionDetails(node, discovery, params, msg) {
    discovery.getCollection(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.collection_details = response;
      }
      node.send(msg);
    });
  }

  function executeListConfigurations(node, discovery, params, msg) {
    discovery.getConfigurations(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.configurations = response.configurations ? response.configurations : [];
      }
      node.send(msg);
    });
  }

  function executeGetConfigurationDetails(node, discovery, params, msg) {
    discovery.getConfiguration(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.configuration_details = response;
      }
      node.send(msg);
    });
  }

  function executeQuery(node, discovery, params, msg) {
    discovery.query(params, function (err, response) {
      node.status({});
      if (err) {
        discoveryutils.reportError(node, msg, err.error);
      } else {
        msg.search_results = response;
      }
      node.send(msg);
    });
  }

  function executeMethod(node, method, params, msg) {
    var discovery = new DiscoveryV1({
      username: username,
      password: password,
      version_date: '2017-04-27'
    });

    switch (method) {
    case 'listEnvrionments':
      executeListEnvrionments(node, discovery, params, msg);
      break;
    case 'getEnvironmentDetails':
      executeEnvrionmentDetails(node, discovery, params, msg);
      break;
    case 'listCollections':
      executeListCollections(node, discovery, params, msg);
      break;
    case 'getCollectionDetails':
      executeGetCollectionDetails(node, discovery, params, msg);
      break;
    case 'listConfigurations':
      executeListConfigurations(node, discovery, params, msg);
      break;
    case 'getConfigurationDetails':
      executeGetConfigurationDetails(node, discovery, params, msg);
      break;
    case 'query':
      executeQuery(node, discovery, params, msg);
      break;
    }

  }

  if (dservice) {
    sUsername = dservice.username;
    sPassword = dservice.password;
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

      if (!username || !password) {
        message = 'Missing Watson Discovery service credentials';
      } else if (!method || '' === method) {
        message = 'Required Discovery method has not been specified';
      } else {
        params = discoveryutils.buildParams(msg,config);
        message = checkParams(method, params);
      }

      if (message) {
        discoveryutils.reportError(node,msg,message);
        return;
      }

      node.status({fill:'blue', shape:'dot', text:'requesting'});
      executeMethod(node, method, params, msg);
    });
  }

  RED.nodes.registerType('watson-discovery-v1', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
