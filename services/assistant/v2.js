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
    OLD_SERVICE_IDENTIFIER = 'conversation',
    SERVICE_VERSION = '2018-11-08',
    AssistantV2 = require('ibm-watson/assistant/v2'),
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

  RED.httpAdmin.get('/watson-assistant-v2/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function Node(config) {
    var node = this;
    RED.nodes.createNode(this, config);

    function setCredentials(msg) {
      var creds = {
        username : sUsername || node.credentials.username,
        password : sPassword || node.credentials.password || config.password,
        apikey : sApikey || node.credentials.apikey || config.apikey,
      };

      if (msg.params) {
        if (msg.params.username) {
          creds.username = msg.params.username;
        }
        if (msg.params.password) {
          creds.password = msg.params.password;
        }
        if (msg.params.apikey) {
          creds.apikey = msg.params.apikey;
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

    function idCheck(msg) {
      if (!config.assistant_id && !(msg.params && msg.params.assistant_id)) {
        return Promise.reject('Missing assistant_id. Check node documentation.');
      }
      return Promise.resolve();
    }

    function setSessionID(msg) {
      let session_id = null;
      let id = null;

      if (msg.params && 'reset_session' in msg.params) {
        // There is a reset request, therefore no need
        // to look it up
      } else {
        if (!config.multisession) {
          if (msg.params && 'session_id' in msg.params && !msg.params.session_id) {
            // Have a session id in single session mode
            // but its a null string so force a reset of the session.
          } else {
            id = node.context().flow.get('session_id');
          }
        } else if (msg.params && msg.params.session_id) {
          let key = msg.params.session_id;
          id = node.context().flow.get('session-' + key);
        }
      }

      if (id) {
        session_id = id;
      }

      return session_id;
    }

    function checkAndSet(source, target, field) {
      if (source[field]) {
        target[field] = source[field];
      }
    }

    function setContext(msg, params) {
      let context = null;
      if (msg.params) {
        checkAndSet(msg.params, params, 'context');
      }
      return context;
    }

    function setAdditionalContext(msg, params) {
      if (msg.additional_context) {
        params.context = params.context ?
                             params.context :
                                {'skills' : {'main skill' : {'user_defined': {}}}};

        for (var prop in msg.additional_context) {
          if (msg.additional_context.hasOwnProperty(prop)) {
            params.context.skills['main skill']['user_defined'][prop]
                = msg.additional_context[prop];
          }
        }
      }
    }

    function setAssistantID(msg, params) {
      checkAndSet(config, params, 'assistant_id');
      if (msg.params) {
        checkAndSet(msg.params, params, 'assistant_id');
      }
      if (params && params['assistant_id']) {
        params.assistantId = params['assistant_id'];
        delete params['assistant_id'];
      }
    }

    function setInputOptions(msg, params) {
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

    function setParamInputs(msg, params) {
      if (msg.params) {
        ['intents',
          'entities'].forEach((f) => {
          checkAndSet(msg.params, params, f);
        });
      }
    }

    function buildInputParams(msg) {
      let params = {
        'input' : {
          'message_type': 'text',
          'text' : msg.payload,
          'options' : {}
        },
        'sessionId' : setSessionID(msg)
      };

      let context = setContext(msg, params);
      if (context) {
        params.context = context;
      }

      setAdditionalContext(msg, params);
      setAssistantID(msg, params);
      setInputOptions(msg, params);
      setParamInputs(msg, params);

      return Promise.resolve(params);
    }

    function setServiceSettings(msg, creds) {
      let authSettings = {};
      let serviceSettings = {
          headers: {
          'User-Agent': pkg.name + '-' + pkg.version
        }
      };

      let endpoint = '',
        optoutLearning = false,
        version = SERVICE_VERSION;

      if (creds.apikey) {
        authSettings.apikey = creds.apikey;
      } else {
        authSettings.username = creds.username;
        authSettings.password = creds.password;
      }
      serviceSettings.authenticator = new IamAuthenticator(authSettings);

      if (service) {
        endpoint = service.url;
      }
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      if (config['optout-learning']){
        optoutLearning = true;
      }

      if (config['timeout'] && config['timeout'] !== '0' && isFinite(config['timeout'])){
        serviceSettings.timeout = parseInt(config['timeout']);
      }

      // Look for message overrides
      if (msg.params) {
        if (msg.params.endpoint) {
          endpoint = msg.params.endpoint;
        }
        if (msg.params.version) {
          version = msg.params.version;
        }
        if ((msg.params['optout_learning'])){
          optoutLearning = true;
        }
        if (msg.params.timeout !== '0' && isFinite(msg.params.timeout)){
          serviceSettings.timeout = parseInt(msg.params.timeout);
        }
        if (msg.params.disable_ssl_verification){
          serviceSettings.disable_ssl_verification = true;
        }
      }

      serviceSettings.version = version;
      if (endpoint) {
        serviceSettings.url = endpoint;
      }
      if (optoutLearning) {
        serviceSettings.headers = serviceSettings.headers || {};
        serviceSettings.headers['X-Watson-Learning-Opt-Out'] = '1';
      }

      return Promise.resolve(serviceSettings);
    }

    function buildService(settings) {
      node.service = new AssistantV2(settings);
      return Promise.resolve();
    }


    function checkSession(msg, params) {
      return new Promise(function resolver(resolve, reject){
        if (params.sessionId) {
          resolve();
        } else {
          node.service.createSession({assistantId: params.assistantId})
            .then((response) => {
              if (response && response.result && response.result.session_id) {
                params.sessionId = response.result.session_id;
              } else if (response && response.session_id) {
                params.sessionId = response.session_id;
              }
              if (params.sessionId) {
                if (!config.multisession) {
                  node.context().flow.set('session_id', params.sessionId);
                } else {
                  let key = params.sessionId;
                  if (msg.params && msg.params.session_id){
                    key = msg.params.session_id;
                  }
                  node.context().flow.set('session-' + key, params.sessionId);
                }
                resolve();
              } else {
                reject('Unable to set session');
              }
            })
            .catch((err) => {
              reject(err);
            });
        }
      });
    }

    function messageTurn(params) {
      return new Promise(function resolver(resolve, reject) {
        node.service.message(params)
          .then((response) => {
            if (response.result) {
              resolve(response.result);
            } else {
              resolve(response);
            }
          })
          .catch((err) => {
            reject(err);
          })
      });
    }

    this.on('input', function(msg, send, done) {
      var creds = setCredentials(msg),
        params = {};

      node.status({});

      credentialCheck(creds.username, creds.password, creds.apikey)
        .then(function(){
          return payloadCheck(msg);
        })
        .then(function(){
          return idCheck(msg);
        })
        .then(function(){
          return buildInputParams(msg);
        })
        .then(function(p){
          params = p;
          return setServiceSettings(msg, creds);
        })
        .then(function(settings){
          return buildService(settings);
        })
        .then(function(){
          return checkSession(msg, params);
        })
        .then(function(){
          node.status({ fill: 'blue', shape: 'dot', text: 'Calling Assistant service ...'});
          return messageTurn(params);
        })
        .then(function(body){
          body.session_id = params.sessionId;
          msg.payload = body;
          return Promise.resolve();
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

  RED.nodes.registerType('watson-assistant-v2', Node, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'password'},
      apikey: {type: 'password'}
    }
  });
};
