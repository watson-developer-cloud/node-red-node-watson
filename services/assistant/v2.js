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

module.exports = function(RED) {
  const SERVICE_IDENTIFIER = 'assistant',
    OLD_SERVICE_IDENTIFIER = 'conversation';

  var pkg = require('../../package.json'),
    AssistantV2 = require('watson-developer-cloud/assistant/v2'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    service = null,
    sApikey = null,
    sUsername = null,
    sPassword = null;

  service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);
  if (!service) {
    service = serviceutils.getServiceCreds(OLD_SERVICE_IDENTIFIER);
  }

  if (service) {
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
  }

  RED.httpAdmin.get('/watson-assistant-v2/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function Node(config) {
    var node = this;
    RED.nodes.createNode(this, config);

    function setCredentials(msg) {
      creds = {
        username : sUsername || node.credentials.username,
        password : sPassword || node.credentials.password || config.password,
        apikey : sApikey || node.credentials.apikey || config.apikey,
      }

      if (msg.params) {
        if (msg.params.username) {
          creds.username = msg.params.username;
        }
        if (msg.params.password) {
          creds.password = msg.params.password;
        }
        if (msg.params.apikey) {
          creds.apiKey = msg.params.apikey;
        }
      }

      return creds;
    }

    function credentialCheck(u, p, k) {
      if (!k && (!u || !p)) {
        return Promise.reject('Missing Watson Assistant service credentials');
      }
      return Promise.resolve();
    }

    this.on('input', function(msg) {
      node.status({});

      var creds = setCredentials(msg);

      credentialCheck(creds.username, creds.password, creds.apikey)
        .then(function(){
          msg.payload = 'No functionality yet';
          return Promise.resolve();
        })
        .then(function(){
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          payloadutils.reportError(node,msg,err);
          node.send(msg);
        });

    });
  }

  RED.nodes.registerType('watson-assistant-v2', Node, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'password'},
      apikey: {type: 'password'}
    }
  });
};
