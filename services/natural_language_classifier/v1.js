/**
 * Copyright 2013,2015 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'natural-language-classifier';
  const NaturalLanguageClassifierV1 = require('watson-developer-cloud/natural-language-classifier/v1');

  var temp = require('temp'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null;

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  temp.track();


  RED.httpAdmin.get('/watson-natural-language-classifier/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    // Perform basic check to see that credentials
    // are provided, altough they may still be
    // invalid
    node.verifyCredentials = function(msg) {
      username = sUsername || node.credentials.username;
      password = sPassword || node.credentials.password;
      if (!username || !password) {
        return Promise.reject('Missing Natural Language Classifier credentials');
      } else {
        return Promise.resolve();
      }
    };

    // Sanity check on the payload, must be present
    node.payloadCheck = function(msg) {
      if (!msg.payload) {
        return Promise.reject('Payload is required');
      } else {
        return Promise.resolve();
      }
    };

    node.buildParams = function(msg, config) {
      var params = {};
      var message = '';

      switch (config.mode) {
      case 'classify':
        params.text = msg.payload;
        params.classifier_id = config.classifier;
        break;
      case 'create':
        params.training_data = msg.payload;
        params.language = config.language;
        break;
      case 'remove':
      case 'list':
        params.classifier_id = msg.payload;
        break;
      default:
        message = 'Unknown Natural Language Classification mode, ' + config.mode;
      }

      if (message) {
        return Promise.reject(message);
      } else {
        return Promise.resolve(params);
      }
    };

    node.performOperation = function(msg, config, params) {
      var p = new Promise(function resolver(resolve, reject){
        const natural_language_classifier = new NaturalLanguageClassifierV1({
          username: username,
          password: password,
          version: 'v1'
        });
        natural_language_classifier[config.mode](params, function (err, response) {
          if (err) {
            reject(err);
          } else {
            msg.payload = (config.mode === 'classify') ?
              {classes: response.classes, top_class: response.top_class} : response;
            resolve();
          }
        });
      });

      return p;
    };


    this.on('input', function (msg) {
      //var params = {}
      node.verifyCredentials(msg)
        .then(function(){
          return node.payloadCheck(msg);
        })
        .then(function(){
          return node.buildParams(msg, config);
        })
        .then(function(params){
          //params = p;
          console.log('Parameters will be : ' , params);
          node.status({fill:"blue", shape:"dot", text:"requesting"});
          return node.performOperation(msg, config, params);
        })
        .then(function(){
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          var messageTxt = err.error ? err.error : err;
          node.status({fill:'red', shape:'dot', text: messageTxt});
          node.error(messageTxt, msg);
        });
    });
  }
  RED.nodes.registerType('watson-natural-language-classifier', Node, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
