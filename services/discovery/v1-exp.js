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

  function buildParams(msg,config) {
    var params = {};
    if (msg.discoveryparams && msg.discoveryparams.envrionmentname) {
      params.name = msg.discoveryparams.envrionmentname;
    } else if (config.envrionmentname) {
      params.name = config.envrionmentname;
    }
    return params;
  }

  var DiscoveryV1Experimental = require('watson-developer-cloud/discovery/v1-experimental'),
    cfenv = require('cfenv'),
    serviceutils = require('../../utilities/service-utils');
    service = cfenv.getAppEnv().getServiceCreds(/discovery/i),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null;

  console.log('==========Logging for Discovery=============================');
  if (service) {
    sUsername = service.username;
    sPassword = service.password;
    console.log('will be using credentials :' + sUsername + ':' + sPassword);
  }

  RED.httpAdmin.get('/watson-discovery/vcap', function (req, res) {
    //res.json(service ? {bound_service: true} : null);
    res.json(serviceutils.checkServiceBound('discovery'));
  });

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      var message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      if (!username || !password) {
        message = 'Missing Watson Discovery service credentials';
        node.error(message, msg);
        return;
      }

      var discovery = new DiscoveryV1Experimental({
        username: username,
        password: password,
        version_date: '2016-11-07'
      });

      params = buildParams(msg,config);
      node.status({fill:'blue', shape:'dot', text:'requesting'});

      discovery.getEnvironments(params, function (err, response) {
        node.status({});
        if (err) {
          console.log(err);
          node.status({fill:'red', shape:'dot', text:err.error});
          node.error(err, msg);
        } else {
          msg.environments = response.environments ? response.environments : [];
        }
        node.send(msg);
      });
    });
  }

  RED.nodes.registerType('watson-discovery', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
