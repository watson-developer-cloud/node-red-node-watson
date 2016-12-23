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

  buildParams: function(msg, config) {
    var params = {};
    if (msg.discoveryparams && msg.discoveryparams.environmentname) {
      params.name = msg.discoveryparams.environmentname;
    } else if (config.environmentname) {
      params.name = config.environmentname;
    } else if (msg.discoveryparams && msg.discoveryparams.configurationname) {
      params.name = msg.discoveryparams.configurationname;
    } else if (config.configurationname) {
      params.name = config.cofigurationname;
    }

    if (msg.discoveryparams && msg.discoveryparams.environment_id) {
      params.environment_id = msg.discoveryparams.environment_id;
    } else if (config.environment_id) {
      params.environment_id = config.environment_id;
    }

    if (msg.discoveryparams && msg.discoveryparams.collection_id) {
      params.collection_id = msg.discoveryparams.collection_id;
    } else if (config.collection_id) {
      params.collection_id = config.collection_id;
    }

    if (msg.discoveryparams && msg.discoveryparams.configuration_id) {
      params.configuration_id = msg.discoveryparams.configuration_id;
    } else if (config.configuration_id) {
      params.configuration_id = config.configuration_id;
    }

    if (config.count) {
      params.count = config.count;
    }
    if (config.query) {
      params.query = config.query;
    }
    if (config.filter) {
      params.filter = config.filter;
    }
    if (config.aggregation) {
      params.aggregation = config.aggregation;
    }
    if (config.return) {
      params.return = config.return;
    }

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
    return params;
  },

  paramEnvCheck: function (params) {
    var response = '';
    if (!params.environment_id) {
      response = 'Missing Environment ID ';
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

  reportError: function (node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(message, msg);
  }

};

var discoveryutils = new DiscoveryUtils();

module.exports = discoveryutils;
