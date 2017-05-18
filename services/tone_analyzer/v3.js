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
  const SERVICE_IDENTIFIER = 'tone-analyzer';
  var pkg = require('../../package.json'),
    ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3'),
    serviceutils = require('../../utilities/service-utils'),
    toneutils = require('../../utilities/tone-utils'),
    username = '', password = '', sUsername = '', sPassword = '',
    service = null;

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then they are stored in sUsername and sPassword, as the
  // service credentials. This separation from sUsername and username to allow
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

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
  var checkConfiguration = function(msg, node) {
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

    if (message) {
      return Promise.reject(message);
    } else {
      return Promise.resolve(taSettings);
    }
  };


  function invokeService(config, options, settings) {
    const tone_analyzer = new ToneAnalyzerV3({
      'username': settings.username,
      'password': settings.password,
      version_date: '2016-05-19',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });

    var p = new Promise(function resolver(resolve, reject){
      switch (config['tone-method']) {
      case 'generalTone' :
        tone_analyzer.tone(options, function (err, response) {
          if (err) {
            reject(err);
          }
          resolve(response);
      });
        break;
      case 'customerEngagementTone' :
        reject('customer Engagement Tone not yet implemented in this node');
        break;
      }
    });

    return p;
  }

  // function when the node recieves input inside a flow.
  // Configuration is first checked before the service is invoked.
  var processOnInput = function(msg, config, node) {
    checkConfiguration(msg, node)
      .then(function(settings) {
        var options = toneutils.parseOptions(msg, config);
        node.status({fill:'blue', shape:'dot', text:'requesting'});
        return invokeService(config, options, settings);
      })
      .then(function(data){
        node.status({})
        node.send(msg);
        node.status({});
      })
      .catch(function(err){
        msg.response = err;
        node.status({fill:'red', shape:'dot', text: err});
        node.error(err, msg);
      });
    }


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
