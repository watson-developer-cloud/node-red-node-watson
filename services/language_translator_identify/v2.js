/**
 * Copyright 2013,2015 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'language-translator';
  var pkg = require('../../package.json'),
    LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2'),
    payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    endpoint = '', sEndpoint = '';
    //endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
    sEndpoint = service.url;
  }

  function initialCheck(u, p) {
    if (!u || !p) {
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
    var p = new Promise(function resolver(resolve, reject){
      var language_translator = null,
        serviceSettings = {
          username: username,
          password: password,
          version: 'v2',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      language_translator = new LanguageTranslatorV2(serviceSettings);

      language_translator.identify({text: msg.payload}, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.languages = response.languages
          msg.lang = response.languages[0];
          resolve();
        }
      });

    });
    return p;
  }

  RED.httpAdmin.get('/watson-language-translator-identify/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(username, password)
        .then(function(){
          return payloadCheck(msg);
        })
        .then(function(){
          node.status({fill:'blue', shape:'dot', text:'requesting'});
          return execute(node, msg);
        })
        .then(function(){
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          payloadutils.reportError(node,msg,err);
        });
    });
  }
  RED.nodes.registerType('watson-language-translator-identify', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
