/**
 * Copyright 2022 IBM Corp.
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
  var discoveryutils = require('./discovery-utils'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    apikey = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = '';


  function initialCheck(k, m) {
    var message = '';
    if (!k) {
      message = 'Missing Watson Discovery service credentials';
    } else if (!m || '' === m) {
      message = 'Required Discovery method has not been specified';
    }
    if (message){
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  if (dservice) {
    sApikey = dservice.apikey ? dservice.apikey : '';
    sEndpoint = dservice.url ? dservice.url : '';
  }

  RED.httpAdmin.get('/watson-discovery-v2-pm/vcap', function (req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function(msg, send, done) {

      var method = config['discovery-method'],
        message = '',
        params = {};

      apikey = sApikey || node.credentials.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(apikey, method)
        .then(() => {
          return Promise.reject("not yet implemented");
        })
        .then(function(){
          node.status({});
          send(msg);
          done();
        })
        .catch(function(err){
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });
    });
  }

  RED.nodes.registerType('watson-discovery-v2-project-manager', Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });
};
