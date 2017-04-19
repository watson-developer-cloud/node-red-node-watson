/**
 * Copyright 2013,2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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
  var cfenv = require('cfenv'),
    LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2'),
    service = cfenv.getAppEnv().getServiceCreds(/language translation/i)
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    endpointUrl = 'https://gateway.watsonplatform.net/language-translation/api';

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  RED.httpAdmin.get('/watson-language-identification/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      if (!username || !password) {
        var message = 'Missing Language Identification service credentials';
        node.error(message, msg);
        return;
      }

      var language_translation = new LanguageTranslatorV2({
        username: username,
        password: password,
        version: 'v2',
        url: endpointUrl
      });

      node.status({fill:"blue", shape:"dot", text:"requesting"});
      language_translation.identify({text: msg.payload}, function (err, response) {
        node.status({})
        if (err) {
          node.error(err, msg);
        } else {
          msg.lang = response.languages[0];
        }

        node.send(msg);
      });
    });
  }
  RED.nodes.registerType('watson-language-identification', Node, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
