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
var FEATURES = {
  'page-image': 'image',
  'image-kw': 'imageKeywords',
  'feed': 'feed',
  'entity': 'entities',
  'keyword': 'keywords',
  'title': 'title',
  'author': 'author',
  'taxonomy': 'taxonomy',
  'concept': 'concepts',
  'relation': 'relations',
  'pub-date': 'publicationDate',
  'doc-sentiment': 'docSentiment'
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

  RED.httpAdmin.get('/alchemy-feature-extract/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function AlchemyFeatureExtractNode (config) {
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
        var message = 'Missing Alchemy API service credentials';
        node.error(message, msg);
        return;
      }

      var alchemy = new AlchemyAPI(apikey);

      var enabled_features = Object.keys(FEATURES).filter(function (feature) { 
        return config[feature]
      });

      if (!enabled_features.length) {
        var message = 'AlchemyAPI node must have at least one selected feature.';
        node.error(message, msg);
        return;
      }

      alchemy.combined(msg.payload, enabled_features, msg.alchemy_options || {}, function (err, response) {
        if (err || response.status === 'ERROR') { 
          var message = 'Alchemy API request error: ' + (err ? err : response.statusInfo);
          node.error(message, msg);
          return;
        }

        msg.features = {};
        Object.keys(FEATURES).forEach(function (feature) { 
          var answer_feature = FEATURES[feature];
          msg.features[feature] = response[answer_feature];
        });

        node.send(msg)
      })
    });
  }

  RED.nodes.registerType('alchemy-feature-extract', AlchemyFeatureExtractNode, {
    credentials: {
      apikey: {type:"password"}
    }
  });
};
