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

    VALID_INPUT_LANGUAGES = ['ar','en','es','ja'],
    VALID_RESPONSE_LANGUAGES = ['ar','de','en','es','fr','it','ja','ko','pt-br','zh-cn','zh-tw'];

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  // This HTTP GET REST request is used by the browser side of the node to
  // determine if credentials are found.
  RED.httpAdmin.get('/watson-personality-insights-v3/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

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

    return params;
  }

  // This is the start of the Node Code. In this case only on input
  // is being processed.
  function Node(config) {
    RED.nodes.createNode(this,config);
    var node = this,
      wc = payloadutils.word_count(config.inputlang),
      message = '';

    this.on('input', function (msg) {
      //var self = this;

      if (!msg.payload) {
        message = 'Missing property: msg.payload';
        node.status({fill:'red', shape:'ring', text:'missing payload'});
        node.error(message, msg);
        return;
      }

      if ('string' !== typeof(msg.payload)) {
        message = 'submitted msg.payload is not text';
        node.status({fill:'red', shape:'ring', text:'payload is not text'});
        node.error(message, msg);
        return;
      }

      wc(msg.payload, function (length) {
        if (length < 100) {
          message = 'Personality insights requires a minimum of one hundred words.' +
                            ' Only ' + length + ' submitted';
          node.status({fill:'red', shape:'ring', text:'insufficient words submitted'});
          node.error(message, msg);
          return;
        }

        username = sUsername || node.credentials.username;
        password = sPassword || node.credentials.password;

        if (!username || !password) {
          message = 'Missing Personality Insights service credentials';
          node.status({fill:'red', shape:'ring', text:'missing credentials'});
          node.error(message, msg);
          return;
        }

        var params = prepareParams(msg, config),
          personality_insights = new PersonalityInsightsV3({
            username: username,
            password: password,
            version_date: '2016-10-20',
            headers: {
              'User-Agent': pkg.name + '-' + pkg.version
            }
          });

        node.status({fill:'blue', shape:'dot', text:'requesting'});
        personality_insights.profile(params, function(err, response){
          node.status({});
          if (err) {
            node.status({fill:'red', shape:'ring', text:'processing error'});
            node.error(err, msg);
          } else{
            msg.insights = response;
          }

          node.send(msg);
        });

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
