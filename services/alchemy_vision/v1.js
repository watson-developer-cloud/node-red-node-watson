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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var FEATURE_RESPONSES = {
  imageFaces: 'imageFaces',
  imageLink: "image",
  imageKeywords: "imageKeywords"
};

module.exports = function (RED) {
  var cfenv = require('cfenv'),
    AlchemyAPI = require('alchemy-api');

  var services = cfenv.getAppEnv().services,
    service;

  var apikey;

  var service = cfenv.getAppEnv().getServiceCreds(/alchemy/i);

  if (service) {
    apikey = service.apikey;
  }

  RED.httpAdmin.get('/alchemy-image-analysis/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function AlchemyImageAnalysisNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      apikey = apikey || this.credentials.apikey;

      if (!apikey) {
        var message ='Missing Alchemy API service credentials'; 
        node.error(message, msg);
        return;
      }

      var alchemy = new AlchemyAPI(apikey);

      var feature = config["image-feature"];

      alchemy[feature](msg.payload, msg.alchemy_options || {}, function (err, response) {
        if (err || response.status === "ERROR") { 
          var message = 'Alchemy API request error: ' + (err ? err : response.statusInfo); 
          node.error(message, msg);
          return;
        }

        msg.result = response[FEATURE_RESPONSES[feature]];
        node.send(msg)
      })
    });
  }

  RED.nodes.registerType('alchemy-image-analysis', AlchemyImageAnalysisNode, {
    credentials: {
      apikey: {type:"password"}
    }
  });
};
