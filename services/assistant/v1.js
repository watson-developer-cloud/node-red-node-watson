/**
 * Copyright 2016 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'assistant',
    OLD_SERVICE_IDENTIFIER = 'conversation';

  var pkg = require('../../package.json'),
    AssistantV1 = require('watson-developer-cloud/assistant/v1'),
    serviceutils = require('../../utilities/service-utils'),
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

  RED.httpAdmin.get('/watson-conversation/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function verifyPayload(node, msg, config) {
    if (!(msg.payload || config['empty-payload'])) {
      node.status({
        fill: 'red',
        shape: 'ring',
        text: 'missing payload'
      });
      node.error('Missing property: msg.payload', msg);
      return false;
    }
    return true;
  }

  function verifyOptionalInputs(node, msg, config, params) {
    // next 3 not documented but present in WDC Node SDK.
    // optional output
    if (msg.params && msg.params.output) {
      params.output = msg.params.output;
    }
    if (msg.params && msg.params.entities) {
      params.entities = msg.params.entities;
    }
    if (msg.params && msg.params.intents) {
      params.intents = msg.params.intents;
    }
  }

  function verifyInputs(node, msg, config, params) {
    if (!config.workspaceid && !msg.params.workspace_id) {
      node.error('Missing workspace_id. check node documentation.', msg);
      return false;
    }
    // mandatory message
    params.input = {
      text: msg.payload
    };
    var prop = null;

    if (config.context) {
      if (config.multiuser) {
        if (msg.user) {
          params.context = node.context().flow.get('context-' + msg.user);
        } else {
          var warning = 'Missing msg.user property, using global context. ' +
            'Multiuser conversation may not function as expected.';
          node.warn(warning, msg);
          params.context = node.context().flow.get('context');
        }
      } else {
        params.context = node.context().flow.get('context');
      }
    }

    if (msg.additional_context) {
      params.context = params.context ? params.context : {};

      for (prop in msg.additional_context) {
        if (msg.additional_context.hasOwnProperty(prop)) {
          params.context[prop] = msg.additional_context[prop];
        }
      }
    }

    // workspaceid can be either configured in the node,
    // or sent into msg.params.workspace_id
    if (config.workspaceid) {
      params.workspace_id = config.workspaceid;
    }
    if (msg.params && msg.params.workspace_id) {
      params.workspace_id = msg.params.workspace_id;
    }
    // option context in JSON format
    if (msg.params && msg.params.context) {
      if (config.context) {
        node.warn('Overridden saved context');

        if (msg.user) {
          node.context().flow.set('context-' + msg.user, null);
        } else {
          node.context().flow.set('context', null);
        }
      }
      params.context = msg.params.context;
    }
    // optional alternate_intents : boolean
    if (msg.params && msg.params.alternate_intents) {
      params.alternate_intents = msg.params.alternate_intents;
    }

    verifyOptionalInputs(node, msg, config, params);
    return true;
  }

  function verifyCredentials(msg, k, u, p) {
    if ( !(k) && (!(u) || !(p)) ) {
      if ( (!msg.params) ||
            (!(msg.params.apikey) &&
               (!(msg.params.username) || !(msg.params.password))) ) {
        return false;
      }
    }
    return true;
  }


  function verifyServiceCredentials(node, msg, config) {
    // If it is present the newly provided user entered key
    // takes precedence over the existing one.
    // If msg.params contain credentials then these will Overridde
    // the bound or configured credentials.
    const serviceSettings = {
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    let userName = sUsername || node.credentials.username,
      passWord = sPassword || node.credentials.password,
      apiKey = sApikey || node.credentials.apikey,
      endpoint = '',
      optoutLearning = false,
      version = '2018-09-20';

    if (!verifyCredentials(msg, apiKey, userName, passWord)) {
      node.error('Missing Watson Assistant API service credentials');
      return false;
    }

    if (msg.params) {
      if (msg.params.username) {
        userName = msg.params.username;
      }
      if (msg.params.password) {
        passWord = msg.params.password;
      }
      if (msg.params.apikey) {
        apiKey = msg.params.apikey;
      }
      if (msg.params.version) {
        version = msg.params.version;
      }
    }

    if (apiKey) {
      serviceSettings.iam_apikey = apiKey;
    } else {
      serviceSettings.username = userName;
      serviceSettings.password = passWord;
    }

    serviceSettings.version = version;
    serviceSettings.version_date = version;

    if (service) {
      endpoint = service.url;
    }
    if (!config['default-endpoint'] && config['service-endpoint']) {
      endpoint = config['service-endpoint'];
    }
    if (msg.params && msg.params.endpoint) {
      endpoint = msg.params.endpoint;
    }

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    if ((msg.params && msg.params['optout_learning'])){
      optoutLearning = true;
    } else if (config['optout-learning']){
      optoutLearning = true;
    }

    if (optoutLearning){
      serviceSettings.headers = serviceSettings.headers || {};
      serviceSettings.headers['X-Watson-Learning-Opt-Out'] = '1';
    }

    if (config['timeout'] && config['timeout'] !== '0' && isFinite(config['timeout'])){
      serviceSettings.timeout = parseInt(config['timeout']);
    }

    if (msg.params && msg.params.timeout !== '0' && isFinite(msg.params.timeout)){
      serviceSettings.timeout = parseInt(msg.params.timeout);
    }

    if (msg.params && msg.params.disable_ssl_verification){
      serviceSettings.disable_ssl_verification = true;
    }

    node.service = new AssistantV1(serviceSettings);
    return true;
  }

  function processResponse(err, body, node, msg, config) {
    if (err !== null && (body === null || typeof (body) === 'undefined')) {
      node.error(err, msg);
      node.status({
        fill: 'red',
        shape: 'ring',
        text: 'call to watson conversation service failed'
      });
      return;
    }
    msg.payload = body;

    if (config.context) {
      if (config.multiuser && msg.user) {
        node.context().flow.set('context-' + msg.user, body.context);
      } else {
        if (msg.user) {
          node.warn('msg.user ignored when multiple users not set in node');
        }
        node.context().flow.set('context', body.context);
      }
    }

    node.send(msg);
    node.status({});
  }

  function execute(params, node, msg, config) {
    node.status({
      fill: 'blue',
      shape: 'dot',
      text: 'Calling Conversation service ...'
    });
    // call POST /message through SDK
    node.service.message(params, function(err, body) {
      processResponse(err, body, node, msg, config);
    });
  }

  // This is the Watson Conversation V1 (GA) Node
  function WatsonConversationV1Node(config) {
    var node = this,
      b = false;

    RED.nodes.createNode(this, config);

    node.on('input', function(msg) {
      var params = {};

      node.status({});

      b = verifyPayload(node, msg, config);
      if (!b) {
        return;
      }
      b = verifyInputs(node, msg, config, params);
      if (!b) {
        return;
      }
      b = verifyServiceCredentials(node, msg, config);
      if (!b) {
        return;
      }
      execute(params, node, msg, config);
    });
  }

  RED.nodes.registerType('watson-conversation-v1', WatsonConversationV1Node, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'password'},
      apikey: {type: 'password'}
    }
  });
};
