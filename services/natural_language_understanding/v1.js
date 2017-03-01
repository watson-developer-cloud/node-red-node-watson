/**
 * Copyright 2017 IBM Corp.
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

module.exports = function (RED) {
  const SERVICE_IDENTIFIER = 'natural-language-understanding';
  const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1');

  const FEATURES = {
    'categories': 'categories',
    'concepts': 'concepts',
    'doc-emotion': 'emotion',
    'doc-sentiment': 'sentiment',
    'entity': 'entities',
    'keyword': 'keywords',
    'metadata': 'metadata',
    'relation': 'relations',
    'semantic': 'semantic_roles'
  };

  var payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null;

  function reportError(node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(message, msg);
  }

  function checkPayload(msg) {
    var message = '';
    if (!msg.payload) {
      message = 'Missing property: msg.payload';
    }
    return message;
  }

  function checkFeatureRequest(config, enabled_features) {
    var message = '';
    if (!enabled_features.length) {
      message = 'Node must have at least one selected feature.';
    }
    return message;
  }

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  RED.httpAdmin.get('/natural-language-understanding/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  // This is the Natural Language Understanding Node

  function NLUNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var message = '',
      enabled_features = '';
      node.status({});

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      if (!username || !password) {
        message = 'Missing Watson Natural Language Understanding service credentials';
      } else {
        message = checkPayload(msg);
      }

      if (!message) {
        enabled_features = Object.keys(FEATURES).filter(function (feature) {
          return config[feature]
        });
        message = checkFeatureRequest(config, enabled_features);
        console.log('Enabled Features : ', enabled_features);
      }

      if (message) {
        reportError(node,msg,message);
        // return;
      } else {
        msg.features = 'To be implemented';
        node.send(msg);
      }

    });
  }


  //Register the node as natural-language-understanding to nodeRED
  RED.nodes.registerType('natural-language-understanding', NLUNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
