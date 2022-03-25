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


  buildParams: function(msg, config) {
    var params = {},
      me = this;

    return params;
  }


};

var discoveryutils2 = new DiscoveryUtils2();

module.exports = discoveryutils2;
