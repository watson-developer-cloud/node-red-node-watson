/**
 * Copyright 2016 IBM Corp.
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
const pkg = require('../../package.json'),
  DiscoveryV1 = require('ibm-watson/discovery/v1'),
  { IamAuthenticator } = require('ibm-watson/auth');


function DiscoveryUtils() {}
DiscoveryUtils.prototype = {

  buildService: function(username, password, apikey, endpoint) {
    let authSettings = {};
    let serviceSettings = {
      version: '2019-04-30',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (apikey) {
      authSettings.apikey = apikey;
    } else {
      authSettings.username = username;
      authSettings.password = password;
    }
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    return new DiscoveryV1(serviceSettings);

  },

  buildParamsForName: function(msg, config, params) {
    if (msg.discoveryparams && msg.discoveryparams.environmentname) {
      params.name = msg.discoveryparams.environmentname;
    } else if (config.environmentname) {
      params.name = config.environmentname;
    } else if (msg.discoveryparams && msg.discoveryparams.configurationname) {
      params.name = msg.discoveryparams.configurationname;
    } else if (config.configurationname) {
      params.name = config.configurationname;
    } else if (msg.discoveryparams && msg.discoveryparams.collection_name) {
      params.name = msg.discoveryparams.collection_name;
    } else if (config.collection_name) {
      params.name = config.collection_name;
    }
    return params;
  },

  buildParamsForQuery: function(msg, config, params) {
    var sourceField = 'query',
      targetField = 'query';

    if (config.nlp_query || (msg.discoveryparams && msg.discoveryparams.nlp_query)) {
      targetField = 'naturalLanguageQuery';
    }
    if (msg.discoveryparams && msg.discoveryparams[sourceField]) {
      params[targetField] = msg.discoveryparams[sourceField];
    } else if (config[sourceField]) {
      params[targetField] = config[sourceField];
    }
    return params;
  },

  buildParamsForPayload: function(msg, config, params) {
    var isJSON = this.isJsonString(msg.payload) ||
      this.isJsonObject(msg.payload);

    // Payload (text to be analysed) must be a string (content is either raw string or Buffer)
    if (typeof msg.payload === 'string' || isJSON) {
      params.file = this.isJsonObject(msg.payload) ?
        JSON.stringify(msg.payload) :
        msg.payload;
      params.fileContentType = 'application/json';
    }
    return params;
  },

  buildParamsFor: function(msg, config, params, field) {
    if (msg.discoveryparams && msg.discoveryparams[field]) {
      params[field] = msg.discoveryparams[field];
    } else if (config[field]) {
      params[field] = config[field];
    }
    return params;
  },

  buildParamsForPassages: function (me, msg, config, params) {
    let passagesFound = false;

    // Allow the passages parameters to be passed in three ways
    // 1. As the API was expecting (watson-developer-cloud)
    ['passages.fields', 'passages.count', 'passages.characters'
    ].forEach(function(f) {
      params = me.buildParamsFor(msg, config, params, f);
      passagesFound = true;
    });

    // 2. As anyone misreading the documentation might do it.
    // (again watson-developer-cloud)
    if (msg.discoveryparams && msg.discoveryparams.passages) {
      passagesFound = true;
      ['fields', 'count', 'characters'
      ].forEach(function(f) {
        if (msg.discoveryparams.passages[f]) {
          params['passages.' + f] = msg.discoveryparams.passages[f];
        }
      });
    }

    // 3. As the ibm-watson SDK expects
    ['passagesFields', 'passagesCount', 'passagesCharacters'
    ].forEach(function(f) {
      params = me.buildParamsFor(msg, config, params, f);
      passagesFound = true;
    });

    if (passagesFound) {
      // Perform autocorrect for watson-developer-cloud to ibm-watson
      // differences
      ['passages.fields', 'passages.count', 'passages.characters'
      ].forEach(function(f) {
        if (params[f]) {
          let parts = f.split(".");
          let secondPart = parts[1]
          let reformedField = parts[0] + secondPart[0].toUpperCase() + secondPart.slice(1);
          params[reformedField] = params[f];
        }
      });
      params.passages = true;
    }

    return params;
  },

  buildParamsFromConfig: function(config, params, field) {
    if (config[field]) {
      params[field] = config[field];
    }
    return params;
  },

  // The field to create a new language collection is language, but
  // the SDK creates a language_code field which it defaults to 'en-us'
  languageCodeFix: function(params) {
    if (params.language_code) {
      params.language = params.language_code;
    }
    return params;
  },

  buildParams: function(msg, config) {
    var params = {},
      me = this;

    params = me.buildParamsForName(msg, config, params);
    params = me.buildParamsForQuery(msg, config, params);

    ['environmentId', 'collectionId', 'configurationId',
      'collection_name', 'language_code',
      'passages', 'description', 'size', 'filename',
      'highlight'
    ].forEach(function(f) {
      params = me.buildParamsFor(msg, config, params, f);
    });

    params = me.buildParamsForPassages(me, msg, config, params);

    ['count', 'filter', 'aggregation', 'return'].forEach(function(f) {
      params = me.buildParamsFromConfig(config, params, f);
    });

    params = me.languageCodeFix(params);

    params = me.buildParamsForPayload(msg, config, params);

    return params;
  },

  buildMsgOverrides: function(msg, config) {
    var params = {};
    if (config.environment) {
      params.environmentId = config.environment;
    }
    if (config.collection) {
      params.collectionId = config.collection;
    }
    if (config.passages) {
      params.passages = config.passages;
    }
    if (config.collection) {
      params.filename = config.filename;
    }

    params = this.buildMsgQueryOverrides(msg, config, params);

    return params;
  },

  buildMsgQueryOverrides: function(msg, config, params) {
    if (config.nlp_query) {
      params.query = config.querynlp;
      params.nlp_query = config.nlp_query;
    } else {
      params = this.buildStructuredQuery(msg, config, params);
    }
    return params;
  },

  buildStructuredQuery: function(msg, config, params) {
    if (config.query1 && config.queryvalue1) {
      params.query = config.query1 + ':"' + config.queryvalue1 + '"';
    }
    if (config.query2 && config.queryvalue2) {
      if (params.query) {
        params.query += ',';
      }
      params.query += config.query2 + ':"' + config.queryvalue2 + '"';
    }
    if (config.query3 && config.queryvalue3) {
      if (params.query) {
        params.query += ',';
      }
      params.query += config.query3 + ':"' + config.queryvalue3 + '"';
    }
    return params;
  },


  paramEnvCheck: function(params) {
    var response = '';
    if (!params.environmentId) {
      response = 'Missing Environment ID ';
    }
    return response;
  },

  paramJSONCheck: function(params) {
    var response = '';
    if (!params.file) {
      response = 'Missing JSON file on payload';
    }
    return response;
  },

  paramDocumentCheck: function(params) {
    var response = '';
    if (!params.file) {
      response = 'Missing document file on payload';
    }
    return response;
  },

  paramNameCheck: function(params) {
    var response = '';
    if (!params.name) {
      response = 'Missing Name ';
    }
    return response;
  },

  paramDescriptionCheck: function(params) {
    var response = '';
    if (!params.description) {
      response = 'Missing Description ';
    }
    return response;
  },

  paramCollectionCheck: function(params) {
    var response = '';
    if (!params.collectionId) {
      response = 'Missing Collection ID ';
    }
    return response;
  },

  paramConfigurationCheck: function(params) {
    var response = '';
    if (!params.configurationId) {
      response = 'Missing Configuration ID ';
    }
    return response;
  },

  // Looking for Text, Type and label
  buildFieldByStep: function(d, fields, txt) {
    for (var k in d) {
      var t = txt;
      if (isNaN(k)) {
        t += txt ? '.' : '';
        t += k;
      }

      if ('object' === typeof d[k]) {
        fields = this.buildFieldByStep(d[k], fields, t);
      } else {
        switch (k) {
        case 'text':
        case 'type':
        case 'label':
          fields.push(t);
          break;
        }
      }
    }
    return fields;
  },

  // sorting functions
  uniqueFilter: function(value, index, self) {
    return self.indexOf(value) === index;
  },

  // Looking for Text, Type and label
  buildFieldList: function(schemaData) {
    var fields = [];

    if (schemaData &&
           'object' === typeof schemaData &&
           schemaData['fields'] &&
            Array.isArray(schemaData['fields'])) {
      schemaData['fields'].forEach((f) => {
        if (f['field'] && f['type'] && 'nested' !== f['type']) {
          fields.push(f['field']);
        }
      });

    }

    if (fields.length) {
      fields = fields.filter(this.uniqueFilter);
    }

    return fields;
  },

  //  reportError: function (node, msg, message) {
  //    var messageTxt = message.error ? message.error : message;
  //    node.status({fill:'red', shape:'dot', text: messageTxt});
  //    node.error(message, msg);
  //  } ,

  isJsonString: function(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },

  isJsonObject: function(str) {
    if (str instanceof Array || str instanceof Object ||
          'object' === typeof str || Array.isArray(str)) {
      return true;
    }
    return false;
  }


};

var discoveryutils = new DiscoveryUtils();

module.exports = discoveryutils;
