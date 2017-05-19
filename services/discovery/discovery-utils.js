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

function DiscoveryUtils() {}
DiscoveryUtils.prototype = {

  buildParamsForName: function(msg, config, params) {
    if (msg.discoveryparams && msg.discoveryparams.environmentname) {
      params.name = msg.discoveryparams.environmentname;
    } else if (config.environmentname) {
      params.name = config.environmentname;
    } else if (msg.discoveryparams && msg.discoveryparams.configurationname) {
      params.name = msg.discoveryparams.configurationname;
    } else if (config.configurationname) {
      params.name = config.configurationname;
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

  buildParamsFromConfig: function(config, params, field) {
    if (config[field]) {
      params[field] = config[field];
    }
    return params;
  },

  buildParams: function(msg, config) {
    var params = {};

    params = DiscoveryUtils.prototype.buildParamsForName(msg, config, params);

    ['environment_id','collection_id','configuration_id',
        'query','description','size'].forEach(function(f) {
      params = DiscoveryUtils.prototype.buildParamsFor(msg, config, params, f);
    });

    ['count','filter','aggregation','return'].forEach(function(f) {
      params = DiscoveryUtils.prototype.buildParamsFromConfig(config, params, f);
    });

    return params;
  },

  buildMsgOverrides: function(msg, config) {
    var params = {};
    if (config.environment) {
      params.environment_id = config.environment;
    }
    if (config.collection) {
      params.collection_id = config.collection;
    }
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

  paramEnvCheck: function (params) {
    var response = '';
    if (!params.environment_id) {
      response = 'Missing Environment ID ';
    }
    return response;
  },

  paramNameCheck: function (params) {
    var response = '';
    if (!params.name) {
      response = 'Missing Name ';
    }
    return response;
  },

  paramDescriptionCheck: function (params) {
    var response = '';
    if (!params.description) {
      response = 'Missing Description ';
    }
    return response;
  },

  paramCollectionCheck: function (params) {
    var response = '';
    if (!params.collection_id) {
      response = 'Missing Collection ID ';
    }
    return response;
  },

  paramConfigurationCheck: function (params) {
    var response = '';
    if (!params.configuration_id) {
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
        fields = DiscoveryUtils.prototype.buildFieldByStep(d[k], fields, t);
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
  uniqueFilter: function (value, index, self) {
    return self.indexOf(value) === index;
  },

  // Looking for Text, Type and label
  buildFieldList: function(schemaData) {
    var fields = [];
    if ('object' === typeof schemaData) {
      for (var k in schemaData) {
        if ('results' === k &&
                'object' === typeof schemaData[k] &&
                'object' === typeof schemaData[k][0]) {
          fields = DiscoveryUtils.prototype.buildFieldByStep(schemaData[k][0], fields, '');
        }
      }
      if (fields.length) {
        fields = fields.filter(DiscoveryUtils.prototype.uniqueFilter);
      }
    }
    return fields;
  },

  reportError: function (node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(message, msg);
  }

};

var discoveryutils = new DiscoveryUtils();

module.exports = discoveryutils;
