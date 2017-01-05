/**
 * Copyright 2013,2015, 2016 IBM Corp.
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


// AlchemyAPI Text Analysis functions supported by this node
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
  'doc-sentiment': 'docSentiment',
  'doc-emotion': 'docEmotions'
};

module.exports = function (RED) {
  const SERVICE_IDENTIFIER = 'gateway-a.watsonplatform.net';

  var watson = require('watson-developer-cloud');

  var payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    apikey, s_apikey,
    service = serviceutils.getServiceCredsAlchemy(SERVICE_IDENTIFIER);


  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the api key is stored in the variable s_apikey.
  //
  // This separation between s_apikey and apikey is to allow
  // the end user to modify the key  redentials when the service is not bound.
  // Otherwise, once set apikey is never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  if (service) {
    s_apikey = service.apikey;
  }

  RED.httpAdmin.get('/alchemy-feature-extract/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  function buildParams(wanted_features, config, msg) {
    // The watson node-SDK expects the features as a single string.

    var params = { extract: wanted_features.join(',') };

    if (config['entity-sentiment']) {
      params.sentiment = '1';
    }
    if (config['entity-emotion']) {
      params.emotion = '1';
    }

    if (payloadutils.urlCheck(msg.payload)) {
      params['url'] = msg.payload;
    } else {
      params['text'] = msg.payload;
    }

    return params;
  }

  // This is the Alchemy Data Node

  function AlchemyFeatureExtractNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      if (!msg.payload) {
        this.status({fill:'red', shape:'ring', text:'missing payload'});
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      // If it is present the newly provided user entered key takes precedence over the existing one.
      apikey = s_apikey || this.credentials.apikey;
      this.status({});

      if (!apikey) {
        this.status({fill:'red', shape:'ring', text:'missing credentials'});
        var message = 'Missing Alchemy API service credentials';
        node.error(message, msg);
        return;
      }

      var alchemy_language = watson.alchemy_language( { api_key: apikey } );

      // Check which features have been requested.

      var enabled_features = Object.keys(FEATURES).filter(function (feature) {
        return config[feature]
      });


      if (!enabled_features.length) {
        this.status({fill:'red', shape:'ring', text:'no features selected'});
        var message = 'AlchemyAPI node must have at least one selected feature.';
        node.error(message, msg);
        return;
      }

      var params = buildParams(enabled_features, config, msg);

      // Splice in the additional options from msg.alchemy_options
      // eg. The user may have entered msg.alchemy_options = {maxRetrieve: 2};

      for (var key in msg.alchemy_options) { params[key] = msg.alchemy_options[key]; }

      alchemy_language.combined(params, function (err, response) {
        if (err || response.status === 'ERROR') {
          node.status({fill:'red', shape:'ring', text:'call to alchmeyapi language service failed'});
          console.log('Error:', msg, err);
          node.error(err, msg);
        }
        else {
          msg.features = {};
          //msg.features['all'] = response;

          Object.keys(FEATURES).forEach(function (feature) {
            var answer_feature = FEATURES[feature];

            msg.features[feature] = response[answer_feature] || {};
          });

          node.send(msg);
        }
      });

    });
  }


  //Register the node as alchemy-feature-extract to nodeRED
  RED.nodes.registerType('alchemy-feature-extract', AlchemyFeatureExtractNode, {
    credentials: {
      apikey: {type:"password"}
    }
  });
};
