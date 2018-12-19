/**
 * Copyright 2018 IBM Corp.
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
  const request = require('request');
    SERVICE_IDENTIFIER = 'language-translator',
    SERVICE_VERSION = '2018-05-01';

  var  serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    translatorutils = require('./translator-utils'),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    apikey = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/language-translator/api',
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
    sEndpoint = service.url;
  }

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-doc-translator/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    function payloadCheck(msg, mode) {
      var message = null;
      switch (mode) {
      case 'listDocuments':
        break;
      case 'translateDocument':
        if (!msg.payload) {
          message = 'Missing property: msg.payload';
        }
        break;
      default:
        message = 'Unexpected Mode';
        break;
      }
      if (message) {
        return Promise.reject(message);
      }
      return Promise.resolve();
    }


    function executeRequest(uriAddress) {
      return new Promise(function resolver(resolve, reject){
        var authSettings = {};

        if (apikey) {
          authSettings.user = 'apikey';
          authSettings.pass = apikey;
        } else {
          authSettings.user = username;
          authSettings.pass = password;
        }

        request({
          uri: uriAddress,
          method: 'GET',
          auth: authSettings
        }, (error, response, body) => {
          if (!error && response.statusCode == 200) {
            data = JSON.parse(body);
            resolve(data);
          } else if (error) {
            reject(error);
          } else {
            reject('Error performing request ' + response.statusCode);
          }
        });
      });
    }

    function executeUnknownMethod() {
      return Promise.reject('Unable to process as unknown mode has been specified');
    }

    function executeListDocuments() {
      let uriAddress = endpoint + '/v3/documents?version=' + SERVICE_VERSION;
      return executeRequest(uriAddress);
    }

    function executeAction(msg, action) {
      var f = null;

      const execute = {
        'listDocuments' : executeListDocuments
      }

      f = execute[action] || executeUnknownMethod;
      return f();
    }

    function processResponse(msg, data) {
      msg.payload = data;
      return Promise.resolve();
    }

    this.on('input', function (msg) {
      msg.payload = 'Node does nothing yet - 001';

      var action = msg.action || config.action;

      // The dynamic nature of this node has caused problems with the password field. it is
      // hidden but not a credential. If it is treated as a credential, it gets lost when there
      // is a request to refresh the model list.
      // Credentials are needed for each of the modes.
      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;
      apikey = sApikey || this.credentials.apikey || config.apikey;

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      translatorutils.credentialCheck(username, password, apikey)
        .then(function(){
          return translatorutils.checkForAction(action);
        })
        .then(function(){
          return payloadCheck(msg, action);
        })
        .then(function(){
          node.status({fill:'blue', shape:'dot', text:'executing'});
          return executeAction(msg, action);
        })
        .then( (data) => {
          node.status({ fill: 'blue', shape: 'dot', text: 'processing response' });
          return processResponse(msg, data);
        })
        .then(function(){
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          payloadutils.reportError(node, msg, err);
          node.send(msg);
        });
    });
  }

  RED.nodes.registerType('watson-doc-translator', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'},
      apikey: {type:'password'}
    }
  });
};
