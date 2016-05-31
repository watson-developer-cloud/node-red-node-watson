/**
 * Copyright 2013,2016 IBM Corp.
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
  var watson = require('watson-developer-cloud');  
  var cfenv = require('cfenv');
  var toneutils = require('../../utilities/tone-utils');

  // Require the Cloud Foundry Module to pull credentials from bound service 
  // If they are found then they are stored in sUsername and sPassword, as the 
  // service credentials. This separation from sUsername and username to allow 
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  // Not ever used, and codeacy complains about it.

  var username, password, sUsername, sPassword;

  var service = cfenv.getAppEnv().getServiceCreds(/tone analyzer/i)

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }


  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-tone-analyzer/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  // Check that the credentials have been provided
  // Credentials are needed for each the service.
  var checkCreds = function(credentials) {
    var taSettings = null;

    username = sUsername || credentials.username;
    password = sPassword || credentials.password;      

    if (username && password) {
      taSettings = {};
      taSettings.username = username;
      taSettings.password = password;
    }

    return taSettings;
  }


  // Function that checks the configuration to make sure that credentials,
  // payload and options have been provied in the correct format.
  var checkConfiguration = function(msg, node, cb) {
    var message = null;      
    var taSettings = null;

    taSettings = checkCreds(node.credentials);

    if (!taSettings) {
      message = 'Missing Tone Analyzer service credentials';
    } else if (msg.payload) {
      message = toneutils.checkPayload(msg.payload);
    } else  {
      message = 'Missing property: msg.payload';
    }

    if (cb) {
      cb(message, taSettings);
    }
  };


  // function when the node recieves input inside a flow. 
  // Configuration is first checked before the service is invoked.
  var processOnInput = function(msg, config, node) {
    checkConfiguration (msg, node, function(err, settings){
      if (err) {
        node.status({fill:'red', shape:'dot', text:err}); 
        node.error(err, msg);
        return;
      } else {
        var tone_analyzer = watson.tone_analyzer({
          'username': settings.username,
          'password': settings.password,
          'version': 'v3',
          'version_date': '2016-05-19'
        });

        var options = toneutils.parseOptions(msg, config);
    
        node.status({fill:'blue', shape:'dot', text:'requesting'});
        tone_analyzer.tone(options, function (err, response) {
          node.status({})
          if (err) {
            node.error(err, msg);
          } else {
            msg.response = response;
          }
          node.send(msg);
        });

      }
    });

  };


  // This is the Tone Analyzer Node. 
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    // Invoked whenb the node has received an input as part of a flow.
    this.on('input', function (msg) {
      processOnInput(msg, config, node);
    });
  }


  RED.nodes.registerType('watson-tone-analyzer-v3', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
