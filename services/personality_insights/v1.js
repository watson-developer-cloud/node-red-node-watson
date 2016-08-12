/**
 * Copyright 2015 IBM Corp.
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
  payloadutils = require('../../utilities/payload-utils');

  var services = cfenv.getAppEnv().services,
    service;

  var username, password;

  var service = cfenv.getAppEnv().getServiceCreds(/personality insights/i)

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-personality-insights/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node(config) {
    RED.nodes.createNode(this,config);
    var node = this,
    wc = payloadutils.word_count(config.lang);

    this.on('input', function (msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg)
        return;
      }
      if (wc(msg.payload) < 100) {
        var message = 'Personality insights requires a minimum of one hundred words.';
        node.error(message, msg);
        return;
      }

      username = username || this.credentials.username;
      password = password || this.credentials.password;

      if (!username || !password) {
        var message = 'Missing Personality Insights service credentials';
        node.error(message, msg);
        return;
      }

      var watson = require('watson-developer-cloud');

      var personality_insights = watson.personality_insights({
        username: username,
        password: password,
        version: 'v2'
      });

      node.status({fill:"blue", shape:"dot", text:"requesting"});
      personality_insights.profile({text: msg.payload, language: config.lang}, function (err, response) {
        node.status({})
        if (err) {
          node.error(err, msg);
        } else{
          msg.insights = response.tree;
        }

        node.send(msg);
      });
    });
  }
  RED.nodes.registerType("watson-personality-insights",Node,{
     credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};

