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
  const SERVICE_IDENTIFIER = 'personality-insights';
  var pkg = require('../../package.json'),
    PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3'),
    payloadutils = require('../../utilities/payload-utils'),
    serviceutils = require('../../utilities/service-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/personality-insights/api',

    VALID_INPUT_LANGUAGES = ['ar','en','es','ja'],
    VALID_RESPONSE_LANGUAGES = ['ar','de','en','es','fr','it','ja','ko','pt-br','zh-cn','zh-tw'];

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
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
    if ('string' !== typeof(msg.payload)) {
      return Promise.reject('submitted msg.payload is not text');
    }
    return Promise.resolve();
  }

  function wordcountCheck(msg, config) {
    var p = new Promise(function resolver(resolve, reject) {
      var wc = payloadutils.word_count(config.inputlang);
      wc(msg.payload, function (length) {
        if (length < 100) {
          reject('Personality insights requires a minimum of one hundred words.' +
                            ' Only ' + length + ' submitted');
        } else {
          resolve();
        }
      });
    });
    return p;
  }

  function credentialsCheck(node) {
    username = sUsername || node.credentials.username;
    password = sPassword || node.credentials.password;

    if (!username || !password) {
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
      text: msg.payload,
      consumption_preferences: config.consumption ? config.consumption : false,
      raw_scores: config.rawscores ? config.rawscores : false,
      headers: {
        'content-language': inputlang,
        'accept-language': outputlang,
        'accept': 'application/json'
      }
    };

    return Promise.resolve(params);
  }

  function setEndPoint(config) {
    endpoint = sEndpoint;
    if ((!config['default-endpoint']) && config['service-endpoint']) {
      endpoint = config['service-endpoint'];
    }
    return Promise.resolve();
  }

  function executeService(msg, params) {
    var p = new Promise(function resolver(resolve, reject) {
      var personality_insights = null,
        serviceSettings = {
          username: username,
          password: password,
          version_date: '2016-10-20',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      personality_insights = new PersonalityInsightsV3(serviceSettings);

      personality_insights.profile(params, function(err, response){
        if (err) {
          reject(err);
        } else {
          msg.insights = response;
          resolve();
        }
      });

    });
    return p;
  }

  // This is the start of the Node Code. In this case only on input
  // is being processed.
  function Node(config) {
    RED.nodes.createNode(this,config);
    var node = this,
      message = '';

    this.on('input', function (msg) {
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
        node.send(msg);
      })
      .catch(function(err){
        payloadutils.reportError(node, msg, err);
        node.send(msg);
      });
    });
  }

  RED.nodes.registerType('watson-personality-insights-v3',Node,{
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
