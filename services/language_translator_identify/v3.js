/**
 * Copyright 2013,2022 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'language-translator',
    LanguageTranslatorV3 = require('ibm-watson/language-translator/v3'),
    { IamAuthenticator } = require('ibm-watson/auth');

  var pkg = require('../../package.json'),
    payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    responseutils = require('../../utilities/response-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    apikey = null,
    sApikey = null,
    endpoint = '', sEndpoint = '';
    //endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

  if (service) {
    sApikey = service.apikey ? service.apikey : '';
    sEndpoint = service.url;
  }

  function initialCheck(k) {
    if (!k) {
      return Promise.reject('Missing Watson Language Translator service credentials');
    }
    return Promise.resolve();
  }

  function payloadCheck(msg) {
    if (!msg.payload) {
      return Promise.reject('Missing property: msg.payload');
    }
    return Promise.resolve();
  }

  function execute(node, msg) {
    var p = new Promise(function resolver(resolve, reject) {
      let language_translator = null,
        authSettings = {},
        serviceSettings = {
          version: '2018-05-01',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (apikey) {
        authSettings.apikey = apikey;
      }
      serviceSettings.authenticator = new IamAuthenticator(authSettings);

      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      language_translator = new LanguageTranslatorV3(serviceSettings);

      language_translator.identify({text: msg.payload})
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'languages');

          if (msg.languages && Array.isArray(msg.languages)) {
            msg.lang = msg.languages[0];
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        })
    });
    return p;
  }

  RED.httpAdmin.get('/watson-language-translator-identify/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function(msg, send, done) {
      apikey = sApikey || this.credentials.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(apikey)
        .then(function(){
          return payloadCheck(msg);
        })
        .then(function(){
          node.status({fill:'blue', shape:'dot', text:'requesting'});
          return execute(node, msg);
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
  RED.nodes.registerType('watson-language-translator-identify', Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });
};
