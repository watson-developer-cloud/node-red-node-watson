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

module.exports = function(RED) {
  var watson = require('watson-developer-cloud');
  var cfenv = require('cfenv');

  var services = cfenv.getAppEnv().services,
    service;

  var username, password;

  var service = cfenv.getAppEnv().getServiceCreds(/language translation/i)

  if (service) {
    username = service.username;
    password = service.password;
  }
 
  RED.httpAdmin.get('/watson-translate/vcap', function(req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function SMTNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg)
        return;
      }

      var srclang = msg.srclang || config.srclang;
      if (!srclang) {
        node.warn("Missing source language, message not translated");
        node.send(msg);
        return;
      }

      var destlang = msg.destlang || config.destlang;
      if (!destlang) {
        node.warn("Missing target language, message not translated");
        node.send(msg);
        return;
      }
      
      var domain = msg.domain || config.domain;
      if (!domain) {
        node.warn("Missing translation domain, message not translated");
        node.send(msg);
        return;
      }

      username = username || this.credentials.username;
      password = password || this.credentials.password;

      if (!username || !password) {
        var message = 'Missing Language Translation service credentials';
        node.error(message, msg)
        return;
      }

      var language_translation = watson.language_translation({
        username: username,
        password: password,
        version: 'v2'
      });

      var listmodels;

      language_translation.getModels({}, function(err, models) {
          if (err)
            listmodels = err
          else
            listmodels = models;
      });

    RED.httpNode.get('/watson-translate/models', function(req, res) {
      res.json(listmodels);
    });

      var model_id = srclang + '-' + destlang 
        + (domain === 'news' ? '' : '-conversational');

      node.status({fill:"blue", shape:"dot", text:"requesting"});
      language_translation.translate({
        text: msg.payload, model_id: model_id},
        function (err, response) {
          node.status({})
          if (err) { node.error(err, msg); }
          else { msg.payload = response.translations[0].translation; }
          node.send(msg);
        });

    });
  }
  RED.nodes.registerType("watson-translate",SMTNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
