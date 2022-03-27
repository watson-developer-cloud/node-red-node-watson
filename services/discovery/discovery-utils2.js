/**
 * Copyright 2022 IBM Corp.
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
  DiscoveryV2 = require('ibm-watson/discovery/v2'),
  { IamAuthenticator } = require('ibm-watson/auth');


function DiscoveryUtils2() {}
DiscoveryUtils2.prototype = {

  buildService: function(apikey, endpoint) {
    let authSettings = {};
    let serviceSettings = {
      version: '2020-08-30',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (apikey) {
      authSettings.apikey = apikey;
    }
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    if (endpoint) {
      serviceSettings.url = endpoint;
      serviceSettings.serviceUrl = endpoint;
    }

    return new DiscoveryV2(serviceSettings);
  },


  paramProjectCheck: function(params) {
    return this.paramFieldCheck(params, 'projectId');
  },

  paramCollectionCheck: function(params) {
    return this.paramFieldCheck(params, 'projectId')
              + this.paramFieldCheck(params, 'collectionId');
  },

  paramQueryIdCheck: function(params) {
    return this.paramFieldCheck(params, 'projectId')
              + this.paramFieldCheck(params, 'queryId');
  },

  paramQueryFieldCheck: function(params) {
    if (! params['query'] && ! params['naturalLanguageQuery'])  {
      return "No query found on msg.payload";
    }
    return '';
  },


  paramNameCheck: function(params) {
    return this.paramFieldCheck(params, 'name');
  },

  paramTypeCheck: function(params) {
    return this.paramFieldCheck(params, 'type');
  },

  paramFieldCheck: function(params, field) {
    var response = '';
    if (!params[field]) {
      response = 'Missing ' + field + ' ';
    }
    return response;
  },

  buildParamsFor: function(msg, config, params, field) {
    if (msg.discoveryparams && msg.discoveryparams[field]) {
      params[field] = msg.discoveryparams[field];
    } else if (config[field]) {
      params[field] = config[field];
    }
    return params;
  },

  buildParamsForName: function(msg, config, params) {
    let name = '';
    if (msg.discoveryparams) {
      for (let f of ['projectName', 'projectname',
        'collectionName', 'collectionname']) {
        if (msg.discoveryparams[f]) {
          name = msg.discoveryparams[f];
          break;
        }
      }
    }
    if (!name) {
      for (let f of ['projectName', 'collectionName']) {
        if (config[f]) {
          name = config[f];
          break;
        }
      }
    }
    if (name) {
      params.name = name;
    }
    return params;
  },

  buildParamsForType: function(msg, config, params) {
    let type = '';
    if (msg.discoveryparams) {
      if (msg.discoveryparams.projectType) {
        type = msg.discoveryparams.projectType;
      } else if (msg.discoveryparams.projecttype) {
        type = msg.discoveryparams.projecttype;
      }
    }
    if (!type) {
      if (config.projectType) {
        type = config.projectType
      }
    }
    if (type) {
      params.type = type;
    }
    return params;
  },

  addOtherParams: function(msg, params) {
    if (msg.discoveryparams) {
      if (msg.discoveryparams.defaultQueryParameters) {
        params.defaultQueryParameters = msg.discoveryparams.defaultQueryParameters;
      }
      if (msg.discoveryparams.enrichments) {
        params.defaultQueryParameters = msg.discoveryparams.enrichments;
      }
    }
    return params
  },

  addQueryParams: function(msg, params) {
    if (msg.discoveryparams) {
      ['collectionIds', 'filter', 'aggregation',
          'count', '_return', 'offset', 'sort',
          'highlight', 'spellingSuggestions',
          'tableResults', 'suggestedRefinements',
          'passages'
        ].forEach(function(f) {
        if (msg.discoveryparams[f]) {
          params[f] = msg.discoveryparams[f];
        }
      });
    }
    return params;
  },

  buildParams: function(msg, config) {
    var params = {},
      me = this;

    params = me.buildParamsForName(msg, config, params);
    params = me.buildParamsForType(msg, config, params);
    params = me.addOtherParams(msg, params);

    ['projectId', 'collectionId', 'queryId',
        'description', 'language'].forEach(function(f) {
      params = me.buildParamsFor(msg, config, params, f);
    });

    return params;
  }


};

var discoveryutils2 = new DiscoveryUtils2();

module.exports = discoveryutils2;
