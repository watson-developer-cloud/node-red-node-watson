/**
 * Copyright 2015 IBM Corp.
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

module.exports = function (RED) {
  const SERVICE_IDENTIFIER = 'personality-insights',
  PersonalityInsightsV3 = require('ibm-watson/personality-insights/v3'),
  { IamAuthenticator } = require('ibm-watson/auth');

  var pkg = require('../../package.json'),
    payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    apikey = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/personality-insights/api',

    VALID_INPUT_LANGUAGES = ['ar','en','es','ja', 'ko'],
    VALID_RESPONSE_LANGUAGES = ['ar','de','en','es','fr','it','ja','ko','pt-br','zh-cn','zh-tw'];

  if (service) {
    sUsername = service.username ? service.username : '';
    sPassword = service.password ? service.password : '';
    sApikey = service.apikey ? service.apikey : '';
    sEndpoint = service.url;
  }

  // This HTTP GET REST request is used by the browser side of the node to
  // determine if credentials are found.
  RED.httpAdmin.get('/watson-personality-insights-v3/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  function payloadCheck(msg) {
    if (!msg.payload) {
      return Promise.reject('Missing property: msg.payload');
    }
    if ('string' !== typeof msg.payload &&
           'object' !== typeof msg.payload) {
      return Promise.reject('submitted msg.payload is not text or json object');
    }
    return Promise.resolve();
  }

  function wordcountCheck(msg, config) {
    var p = new Promise(function resolver(resolve, reject) {
      if ('string' === typeof msg.payload) {
        var wc = payloadutils.word_count(config.inputlang);
        wc(msg.payload, function (length) {
          if (length < 100) {
            reject('Personality insights requires a minimum of one hundred words.' +
                              ' Only ' + length + ' submitted');
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
    return p;
  }

  function credentialsCheck(node) {
    username = sUsername || node.credentials.username;
    password = sPassword || node.credentials.password;
    apikey = sApikey || node.credentials.apikey;

    if (!apikey && (!username || !password)) {
      return Promise.reject('Missing Personality Insights service credentials');
    }
    return Promise.resolve();
  }

  // This function prepares the params object for the
  // call to Personality Insights
  function prepareParams(msg, config) {
    var params = {},
      inputlang = config.inputlang ? config.inputlang : 'en',
      outputlang = config.outputlang ? config.outputlang : 'en';

    if (msg.piparams) {
      if (msg.piparams.inputlanguage &&
            -1 < VALID_INPUT_LANGUAGES.indexOf(msg.piparams.inputlanguage)) {
        inputlang = msg.piparams.inputlanguage;
      }
      if (msg.piparams.responselanguage &&
            -1 < VALID_RESPONSE_LANGUAGES.indexOf(msg.piparams.responselanguage)) {
        outputlang = msg.piparams.responselanguage;
      }
    }

    params = {
      content: msg.payload,
      consumptionPreferences: config.consumption ? config.consumption : false,
      rawScores: config.rawscores ? config.rawscores : false,
      headers: {
        'content-language': inputlang,
        'accept-language': outputlang,
        'accept': 'application/json'
      }
    };

    if ('string' === typeof msg.payload) {
      params.contentType = 'text/plain';
    } else {
      params.contentType = 'application/json';
    }

    return Promise.resolve(params);
  }

  function setEndPoint(config) {
    endpoint = sEndpoint;
    if (config['service-endpoint']) {
      endpoint = config['service-endpoint'];
    }
    return Promise.resolve();
  }

  function executeService(msg, params) {
    var p = new Promise(function resolver(resolve, reject) {
      let personality_insights = null;
      let authSettings  = {};
      let serviceSettings = {
          version: '2017-10-13',
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

      personality_insights = new PersonalityInsightsV3(serviceSettings);

      personality_insights.profile(params)
        .then((profile) => {
          if (profile && profile.result) {
            msg.insights = profile.result;
          } else {
            msg.insights = profile;
          }
          resolve();
        })
        .catch((err) => {
          reject(err);
        })

    });
    return p;
  }

  // This is the start of the Node Code. In this case only on input
  // is being processed.
  function Node(config) {
    RED.nodes.createNode(this,config);
    var node = this,
      message = '';

    this.on('input', function(msg, send, done) {
      node.status({});

      payloadCheck(msg)
      .then(function(){
        return wordcountCheck(msg, config);
      })
      .then(function(){
        return credentialsCheck(node);
      })
      .then(function(){
        return setEndPoint(config);
      })
      .then(function(){
        return prepareParams(msg, config);
      })
      .then(function(params){

        node.status({fill:'blue', shape:'dot', text:'requesting'});
        return executeService(msg, params);
      })
      .then(function(){
        node.status({});
        send(msg);
        done();
      })
      .catch(function(err){
        payloadutils.reportError(node, msg, err);
        send(msg);
        done(err);
      });
    });
  }

  RED.nodes.registerType('watson-personality-insights-v3',Node,{
    credentials: {
      username: {type:'text'},
      password: {type:'password'},
      apikey: {type:'password'}
    }
  });
};
