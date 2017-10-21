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
  var pkg = require('../../package.json'),
    discoveryutils = require('./discovery-utils'),
    DiscoveryV1 = require('watson-developer-cloud/discovery/v1'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    temp = require('temp'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/discovery/api';

  temp.track();

  function initialCheck(u, p) {
    var message = '';
    if (!u || !p) {
      message = 'Missing Watson Discovery service credentials';
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function verifyPayload(msg) {
    if (!msg.payload) {
      return Promise.reject('Missing property: msg.payload');
    } else if (msg.payload instanceof Buffer) {
            return Promise.resolve();
    } else {
      return Promise.reject('msg.payload should be a data buffer');
    }
  }

  function openTheFile() {
    var p = new Promise(function resolver(resolve, reject){
      temp.open({
      }, function(err, info) {
        if (err) {
          reject('Error receiving the data buffer');
        } else {
          resolve(info);
        }
      });
    });
    return p;
  }

  function doSomething() {
    var p = new Promise(function resolver(resolve, reject) {
      reject('nothing yet implemented');
    });
    return p;
  }

  if (dservice) {
    sUsername = dservice.username;
    sPassword = dservice.password;
    sEndpoint = dservice.url;
  }

  RED.httpAdmin.get('/watson-discovery/vcap', function (req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      var message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password;

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(username, password)
        .then(function(){
          return verifyPayload(msg);
        })
        .then(function() {
          return openTheFile();
        })
        .then(function(){
          return doSomething();
        })
        .then(function(){
          temp.cleanup();
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          temp.cleanup();
          payloadutils.reportError(node,msg,err);
          node.send(msg);
        });
    });
  }

  RED.nodes.registerType('watson-discovery-v1-document-loader', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
