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
    OLD_SERVICE_IDENTIFIER = 'conversation',
    AssistantV1 = require('ibm-watson/assistant/v1'),
    { IamAuthenticator } = require('ibm-watson/auth');

  var pkg = require('../../package.json'),
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
      return Promise.reject('Missing property: msg.payload');
    }
    return Promise.resolve();
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

  function setContextParams(node, msg, config, params) {
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
  }

  function setWorkspaceParams(node, msg, config, params) {
    // workspaceid can be either configured in the node,
    // or sent into msg.params.workspace_id
    if (config.workspaceid) {
      params.workspaceId = config.workspaceid;
    }
    if (msg.params && msg.params.workspace_id) {
      params.workspaceId = msg.params.workspace_id;
    }
  }

  function setSavedContextParams(node, msg, config, params) {
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
  }

  function setAlternativeIntentsParams(node, msg, config, params) {
    // optional alternate_intents : boolean
    if (msg.params && msg.params.alternate_intents) {
      params.alternateIntents = msg.params.alternate_intents;
    }
  }

  function verifyInputs(node, msg, config, params) {
    return new Promise(function resolver(resolve, reject) {
      if (!config.workspaceid && (!msg || !msg.params ||!msg.params.workspace_id)) {
        reject('Missing workspace_id. check node documentation.');
      }

      // mandatory message
      params.input = {
        text: msg.payload
      };

      var prop = null;

      // Invoke each of the functions building up the params in turn
      [setContextParams, setWorkspaceParams, setSavedContextParams,
        setAlternativeIntentsParams, verifyOptionalInputs].forEach((f) => {
          f(node, msg, config, params);
        });

      resolve();

    });
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
    return new Promise(function resolver(resolve, reject) {
      let authSettings = {},
        serviceSettings = {
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
        reject('Missing Watson Assistant API service credentials');
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
        if (msg.params.customerId) {
          serviceSettings.headers['X-Watson-Metadata'] = msg.params.customerId;
        }
      }

      if (apiKey) {
        authSettings.apikey = apiKey;
      } else {
        authSettings.username = userName;
        authSettings.password = passWord;
      }
      serviceSettings.authenticator = new IamAuthenticator(authSettings);

      serviceSettings.version = version;
      serviceSettings.version_date = version;

      if (service) {
        endpoint = service.url;
      }
      if (config['service-endpoint']) {
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
      resolve();
    });
  }

  function processResponse(response, node, msg, config) {
    return new Promise(function resolver(resolve, reject) {
      if (response === null || typeof (response) === 'undefined') {
        reject('call to watson conversation service failed');
      }

      msg.payload = response;
      if (response && response.result) {
        msg.payload = response.result;
      }

      let body = msg.payload;

      if (config.context && body && body.context) {
        if (config.multiuser && msg.user) {
          node.context().flow.set('context-' + msg.user, body.context);
        } else {
          if (msg.user) {
            node.warn('msg.user ignored when multiple users not set in node');
          }
          node.context().flow.set('context', body.context);
        }
      }

      resolve();
    });
  }

  function execute(params, node, msg, config) {
    return new Promise(function resolver(resolve, reject) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'Calling Conversation service ...'
      });
      // call POST /message through SDK
      node.service.message(params)
        .then((response) => {
          return processResponse(response, node, msg, config);
        })
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  // This is the Watson Conversation V1 (GA) Node
  function WatsonConversationV1Node(config) {
    var node = this;

    RED.nodes.createNode(this, config);

    this.on('input', function(msg, send, done) {
      var params = {};

      node.status({});

      verifyPayload(node, msg, config)
        .then(() => {
          return verifyInputs(node, msg, config, params);
        })
        .then(() => {
          return verifyServiceCredentials(node, msg, config);
        })
        .then(() => {
          return execute(params, node, msg, config);
        })
        .then(() => {
          send(msg);
          node.status({});
          done();
        })
        .catch(function(err){
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });
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
