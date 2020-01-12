/**
 * Copyright 2018 IBM Corp.
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
  STTV1 = require('ibm-watson/speech-to-text/v1'),
  { IamAuthenticator } = require('ibm-watson/auth');

class STTUtils {
  constructor() {
  }

  static initSTTService(req, sApikey, sUsername, sPassword, sEndpoint) {
    const endpoint = req.query.e ? req.query.e : sEndpoint;

    let authSettings  = {};
    let serviceSettings = {
      url: endpoint,
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (sApikey || req.query.key) {
      authSettings.apikey = sApikey ? sApikey : req.query.key;
    } else {
      authSettings.username = sUsername ? sUsername : req.query.un;
      authSettings.password = sPassword ? sPassword : req.query.pwd;
    }
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    return new STTV1(serviceSettings);
  }

  static determineService(apikey, username, password, endpoint) {
    let authSettings  = {};
    let serviceSettings = {
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

    if (endpoint) {
      serviceSettings.url = endpoint;
    }
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    return new STTV1(serviceSettings);
  }

  static determineServiceFromToken(accessToken, endpoint) {
    let authSettings  = {};
    let serviceSettings = {
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    authSettings.accessToken = accessToken;

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    serviceSettings.authenticator = new IamAuthenticator(authSettings);
    
    return new STTV1(serviceSettings);
  }

}

module.exports = STTUtils;
