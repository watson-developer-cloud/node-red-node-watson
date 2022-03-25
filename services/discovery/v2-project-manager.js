/**
 * Copyright 2022 IBM Corp.
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
  var discoveryutils = require('./discovery-utils2'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    responseutils = require('../../utilities/response-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    apikey = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = '';

  const ExecutionList = {
    'listProjects' : executeListProjects,
    'getProject' : executeDiscoveryMethod,
    'createProject' : executeDiscoveryMethod,
    'updateProject' : executeDiscoveryMethod,
    'deleteProject' : executeDiscoveryMethod,

    'listCollections' : executeListCollections,
    'getCollection' : executeDiscoveryMethod,
    'createCollection' : executeDiscoveryMethod,
    'updateCollection' : executeDiscoveryMethod,
    'deleteCollection' : executeDiscoveryMethod
  };

  function executeListProjects(fields) {
    fields.response = "projects";
    return executeListMethod(fields)
  }

  function executeListCollections(fields) {
    fields.response = "collections";
    return executeListMethod(fields)
  }

  function executeListMethod(fields) {
    var p = new Promise(function resolver(resolve, reject){
      fields.discovery[fields.method](fields.params)
        .then((response) => {
          responseutils.parseResponseFor(fields.msg, response, fields.response);
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    return p;
  }


  function executeDiscoveryMethod(fields) {
    var p = new Promise(function resolver(resolve, reject){
      fields.discovery[fields.method](fields.params)
        .then((response) => {
          fields.msg.discovery_response = response;
          if (response && response.result) {
            fields.msg.discovery_response = response.result;
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    return p;
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

  function checkParams(method, params) {
    var response = '';

    switch (method) {
      case 'getProject':
      case 'deleteProject':
      case 'listCollections':
        response = discoveryutils.paramProjectCheck(params);
        break;

      case 'getCollection':
        response = discoveryutils.paramCollectionCheck(params);
        break;

      case 'createProject':
        response = discoveryutils.paramNameCheck(params)
                      + discoveryutils.paramTypeCheck(params);
        break;

      case 'updateProject':
      case 'createCollection':
        response = discoveryutils.paramProjectCheck(params)
                      + discoveryutils.paramNameCheck(params);
        break;

      case 'updateCollection':
      case 'deleteCollection':
        response = discoveryutils.paramProjectCheck(params)
                      + discoveryutils.paramCollectionCheck(params);
        break;
    }

    if (response) {
      return Promise.reject(response);
    } else {
      return Promise.resolve();
    }
  }

  // function unknownMethod(node, discovery, params, msg) {
  //   return Promise.reject('Unable to process as unknown mode has been specified');
  // }

  function executeMethod(node, method, params, msg) {
    let discovery = discoveryutils.buildService(apikey, endpoint);

    let exe = ExecutionList[method];
    if (!exe) {
      exe = unknownMethod
    }

    let fields = {
      node : node,
      discovery : discovery,
      params : params,
      msg : msg,
      method : method
    }

    return exe(fields);
  }


  if (dservice) {
    sApikey = dservice.apikey ? dservice.apikey : '';
    sEndpoint = dservice.url ? dservice.url : '';
  }

  RED.httpAdmin.get('/watson-discovery-v2-pm/vcap', function (req, res) {
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
        .then(() => {
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

  RED.nodes.registerType('watson-discovery-v2-project-manager', Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });
};
