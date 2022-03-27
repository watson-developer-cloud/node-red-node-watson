/**
 * Copyright 2018, 2022 IBM Corp.
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
  TextToSpeechV1 = require('ibm-watson/text-to-speech/v1'),
  { IamAuthenticator } = require('ibm-watson/auth');

class TTSUtils {
  constructor() {
  }

  static buildStdSettings (apikey, endpoint) {
    let authSettings  = {};
    let serviceSettings = {
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
    }

    return new TextToSpeechV1(serviceSettings);
  }

  static initTTSService(req, sApikey, sEndpoint) {
    const endpoint = req.query.e ? req.query.e : sEndpoint;

    let authSettings  = {};
    let serviceSettings = {
      url: endpoint,
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }};

    if (sApikey || req.query.key) {
      authSettings.apikey = sApikey ? sApikey : req.query.key;
    }

    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    return new TextToSpeechV1(serviceSettings);
  }

}

module.exports = TTSUtils;
