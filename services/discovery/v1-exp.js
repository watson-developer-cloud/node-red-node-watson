/**
 * Copyright 20016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {

  const SERVICE_IDENTIFIER = 'discovery';

  function buildParams(msg,config) {
    var params = {};
    if (msg.discoveryparams && msg.discoveryparams.environmentname) {
      params.name = msg.discoveryparams.environmentname;
    } else if (config.environmentname) {
      params.name = config.environmentname;
    }

    if (msg.discoveryparams && msg.discoveryparams.environmentid) {
      params.environment_id = msg.discoveryparams.environmentid;
    } else if (config.environmentid) {
      params.environment_id = config.environmentid;
    }

    return params;
  }

  function checkParams(method, params){
    var response = '';
    switch (method) {
      case 'getEnvironmentDetails':
        if (!params.environment_id) {
          response = 'Missing Environment ID'
        }
        break;
    }
    return response;
  }

  function reportError(node, msg, message) {
    var messageTxt = message.error ? message.error : message;
    node.status({fill:'red', shape:'dot', text: messageTxt});
    node.error(message, msg);
  }

  function executeListEnvrionments(node, discovery, params, msg) {
    discovery.getEnvironments(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err.error);
      } else {
        msg.environments = response.environments ? response.environments : [];
      }
      node.send(msg);
    });
  }

  function executeEnvrionmentDetails(node, discovery, params, msg) {
    discovery.getEnvironment(params, function (err, response) {
      node.status({});
      if (err) {
        reportError(node, msg, err.error);
      } else {
        msg.environment_details = response;
      }
      node.send(msg);
    });
  }


  function executeMethod(node, method, params, msg) {
    var discovery = new DiscoveryV1Experimental({
      username: username,
      password: password,
      version_date: '2016-11-07'
    });

    switch (method) {
      case 'listEnvrionments':
        executeListEnvrionments(node, discovery, params, msg);
        break;
      case 'getEnvironmentDetails':
        executeEnvrionmentDetails(node, discovery, params, msg);
        break;
    }

  }

  var DiscoveryV1Experimental = require('watson-developer-cloud/discovery/v1-experimental'),
    //cfenv = require('cfenv'),
    serviceutils = require('../../utilities/service-utils'),
    //dservice = cfenv.getAppEnv().getServiceCreds(/discovery/i),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null;

  if (dservice) {
    sUsername = dservice.username;
    sPassword = dservice.password;
  }

  RED.httpAdmin.get('/watson-discovery/vcap', function (req, res) {
    //res.json(dservice ? {bound_service: true} : null);
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      var method = config['discovery-method'];
        message = '',
        params = {};

      console.log("--------  Testing the Discovery Service --------");
      console.log('method is ' + method);

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      if (!username || !password) {
        message = 'Missing Watson Discovery service credentials';
        reportError(node,msg,message)
        return;
      }

      params = buildParams(msg,config);
      message = checkParams(method, params);
      if (message) {
        reportError(node,msg,message)
        return;
      }

      node.status({fill:'blue', shape:'dot', text:'requesting'});
      executeMethod(node, method, params, msg);
    });
  }

  RED.nodes.registerType('watson-discovery', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
