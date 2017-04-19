/**
 * Copyright 2017 IBM Corp.
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

module.exports = function (RED) {
  const SERVICE_IDENTIFIER = 'natural-language-understanding';
  const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1');

  const NLU_FEATURES = {
    'categories': 'categories',
    'concepts': 'concepts',
    'doc-emotion': 'emotion',
    'doc-sentiment': 'sentiment',
    'entity': 'entities',
    'keyword': 'keywords',
    'metadata': 'metadata',
    'relation': 'relations',
    'semantic': 'semantic_roles'
  };

  var payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null;

  function reportError(node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(message, msg);
  }

  function checkPayload(msg, options) {
    var message = '';
    if (!msg.payload) {
      message = 'Missing property: msg.payload';
    } else if (payloadutils.urlCheck(msg.payload)) {
      options['url'] = msg.payload;
    } else {
      options['text'] = msg.payload;
    }
    return message;
  }

  function checkFeatureRequest(config, options) {
    var message = '',
      enabled_features = null;

    enabled_features = Object.keys(NLU_FEATURES).filter(function (feature) {
      return config[feature];
    });

    if (!enabled_features.length) {
      message = 'Node must have at least one selected feature.';
    } else {
      options.features = {};
      for (var f in enabled_features) {
        options.features[NLU_FEATURES[enabled_features[f]]] = {};
      }
    }
    return message;
  }

  function processConceptsOptions(config, features) {
    if (features.concepts) {
      features.concepts.limit =
         config['maxconcepts'] ? parseInt(config['maxconcepts']) : 8;
    }
  }

  function processEmotionOptions(config, features) {
    if (features.emotion && config['doc-emotion-target']) {
      features.emotion.targets = config['doc-emotion-target'].split(',');
    }
  }

  function processSentimentOptions(config, features) {
    if (features.sentiment && config['doc-sentiment-target']) {
      features.sentiment.targets = config['doc-sentiment-target'].split(',');
    }
  }

  function processEntitiesOptions(config, features) {
    if (features.entities) {
      features.entities.emotion =
          config['entity-emotion'] ? config['entity-emotion'] : false;
      features.entities.sentiment =
         config['entity-sentiment'] ? config['entity-sentiment'] : false;
      if (config['maxentities']) {
        features.entities.limit = parseInt(config['maxentities']);
      }
    }
  }

  function processKeywordsOptions(config, features) {
    if (features.keywords) {
      features.keywords.emotion =
          config['keyword-emotion'] ? config['keyword-emotion'] : false;
      features.keywords.sentiment =
         config['keyword-sentiment'] ? config['keyword-sentiment'] : false;
      if (config['maxkeywords']) {
        features.keywords.limit = parseInt(config['maxkeywords']);
      }
    }
  }

  function processSemanticRolesOptions(config, features) {
    if (features.semantic_roles) {
      features.semantic_roles.entities =
        config['semantic-entities'] ? config['semantic-entities'] : false;
      features.semantic_roles.keywords =
        config['semantic-keywords'] ? config['semantic-keywords'] : false;
      if (config['maxsemantics']) {
        features.semantic_roles.limit = parseInt(config['maxsemantics']);
      }
    }
  }

  function checkFeatureOptions(config, options) {
    if (options && options.features) {
      processConceptsOptions(config, options.features);
      processEmotionOptions(config, options.features);
      processSentimentOptions(config, options.features);
      processEntitiesOptions(config, options.features);
      processKeywordsOptions(config, options.features);
      processSemanticRolesOptions(config, options.features);
    }
  }

  function invokeService(options) {
    const nlu = new NaturalLanguageUnderstandingV1({
      username: username,
      password: password,
      version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2016_01_23
    });

    var p = new Promise(function resolver(resolve, reject){
      nlu.analyze(options, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    return p;
  }

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  RED.httpAdmin.get('/natural-language-understanding/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  // This is the Natural Language Understanding Node

  function NLUNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var message = '',
        options = {};

      node.status({});

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      if (!username || !password) {
        message = 'Missing Watson Natural Language Understanding service credentials';
      } else {
        message = checkPayload(msg, options);
      }

      if (!message) {
        message = checkFeatureRequest(config, options);
      }

      if (!message) {
        checkFeatureOptions(config, options);
        node.status({fill:'blue', shape:'dot', text:'requesting'});
        invokeService(options)
          .then(function(data){
            msg.features = data;
            node.send(msg);
            node.status({});
          })
          .catch(function(err){
            reportError(node,msg,err);
          });
      }

      if (message) {
        reportError(node,msg,message);
      }

    });
  }


  //Register the node as natural-language-understanding to nodeRED
  RED.nodes.registerType('natural-language-understanding', NLUNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
