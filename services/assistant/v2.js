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

    function payloadCheck(msg) {
      if (msg.payload && 'string' != typeof msg.payload) {
        return Promise.reject('msg.payload must be either empty or a string');
      }
      return Promise.resolve();
    }

    function idCheck(msg, config) {
      if (!config.assistant_id && !(msg.params && msg.params.assistant_id)) {
        return Promise.reject('Missing assistant_id. Check node documentation.');
      }
      return Promise.resolve();
    }

    function setSessionID(msg, config) {
      let session_id = null;

      if (!config.multisession) {
        let id = node.context().flow.get('session_id');
        if (id) {
          params.session_id = id;
        }
      } else if (msg.params && msg.params.session_id) {
        params.session_id = msg.params.session_id;
      }

      return session_id;
    }

    function checkAndSet(source, target, field) {
      if (source[field]) {
        target[field] = source[field];
      }
    }

    function setContext(msg, session_id) {
      let context = null;
      if (msg.params) {
        checkAndSet(msg.params, params, 'context');
      }
      if (!context && session_id) {
        let c = null
        c = node.context().flow.get('context-' + session_id);
        if (c) {
          context = c;
        }
      }
      return context;
    }

    function setAdditionalContext(msg, params) {
      if (msg.additional_context) {
        params.context = params.context ? params.context : {};

        for (prop in msg.additional_context) {
          if (msg.additional_context.hasOwnProperty(prop)) {
            params.context[prop] = msg.additional_context[prop];
          }
        }
      }
    }

    function setAssistantID(msg, params, config) {
      checkAndSet(config, params, 'assistant_id');
      if (msg.params) {
        checkAndSet(msg.params, params, 'assistant_id');
      }
    }

    function setInputOptions(msg, params, config) {
      // Setting the flags this way works as their default
      // values are false. 
      ['alternate_intents',
       'return_context',
       'restart',
       'debug'].forEach((f) => {
        checkAndSet(config, params.input.options, f);
        if (msg.params) {
          checkAndSet(msg.params, params.input.options, f);
        }
      });
    }

    function buildInputParams(msg, config) {
      let params = {
        'input' : {
          'message_type': 'text',
          'text' : msg.payload,
          'options' : {}
        },
        'session_id' : setSessionID(msg, config)
      };

      let context = setContext(msg, params.session_id);
      if (context) {
        params.context = context;
      }
      setAdditionalContext(msg, params);
      setAssistantID(msg, params, config);
      setInputOptions(msg, params, config);

      //verifyOptionalInputs(node, msg, config, params);

      return Promise.resolve(params);
    }

    this.on('input', function(msg) {
      node.status({});

      var creds = setCredentials(msg);

      credentialCheck(creds.username, creds.password, creds.apikey)
        .then(function(){
          return payloadCheck(msg);
        })
        .then(function(){
          return idCheck(msg, config);
        })
        .then(function(){
          return buildInputParams(msg, config);
        })
        .then(function(params){
          console.log('params have been built');
          console.log(params);
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
