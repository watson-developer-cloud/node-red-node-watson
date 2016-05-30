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

  // Function that checks the payload and determines
  // whether it is JSON or a Buffer
  var checkPayload = function(payload) {
    var message = null;
    var isBuffer = false;

    var hasJSONmethod = (typeof payload.toJSON === 'function') ;

    if (hasJSONmethod === true) {
      if (payload.toJSON().type === 'Buffer') {
        isBuffer = true;
      }      
    }      
    // Payload (text to be analysed) must be a string (content is either raw string or Buffer)
    if (typeof payload !== 'string' &&  isBuffer !== true) {
      message = 'The payload must be either a string or a Buffer';
    }

    return message;
  }


  // Function that checks the configuration to make sure that credentials,
  // payload and options have been proviced in the correct format.
  var checkConfiguration = function(msg, node, cb) {
    var message = null;      
    var taSettings = {};

    // Credentials are needed for each of the modes.
    // Deliberate break to check what codacy says about complexity
    //username = sUsername || node.credentials.username;
    //password = sPassword || node.credentials.password;      

    username = node.credentials.username;
    password = node.credentials.password;      


    if (!username || !password) {
      message = 'Missing Tone Analyzer service credentials';
    }

    if (!message && !msg.payload) {
      message = 'Missing property: msg.payload';
    } 

    if (!message) {
      message = checkPayload(msg.payload);
    }

    if (!message) {
      taSettings.username = username;
      taSettings.password = password;
    }

    if (cb) {
      cb(message, taSettings);
    }
  };

  // function to parse through the options in preparation
  // for the sevice call.
  var parseOptions = function (msg, config) {
    var tones = msg.tones || config.tones;
    var sentences = msg.sentences || config.sentences;
    var contentType = msg.contentType || config.contentType

    var options = {
      'text': msg.payload,
      'sentences': sentences,   
      'isHTML': contentType     
    };

    if (tones !== 'all') {
      options.tones = tones;
    }

    return options;
  }


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

        var options = parseOptions(msg, config);
    
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
