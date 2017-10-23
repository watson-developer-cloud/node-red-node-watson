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
  var fs = require('fs'),
    temp = require('temp'),
    fileType = require('file-type'),
    isDocx = require('is-docx'),
    pkg = require('../../package.json'),
    discoveryutils = require('./discovery-utils'),
    DiscoveryV1 = require('watson-developer-cloud/discovery/v1'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
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

  function checkParams(params){
    var response = discoveryutils.paramEnvCheck(params) +
           discoveryutils.paramCollectionCheck(params);
    if (response) {
      return Promise.reject(response);
    }
    return Promise.resolve();
  }

  function verifyPayload(msg) {
    if (!msg.payload) {
      return Promise.reject('Missing property: msg.payload');
    } else if ( (msg.payload instanceof Buffer) ||
        (discoveryutils.isJsonObject(msg.payload)) ) {
      return Promise.resolve();
    }
    return Promise.reject('msg.payload should be a data buffer or json object');
  }

  function determineSuffix(msg) {
    // Let's assume that if we can't determine the suffix that
    // its a word doc.
    var ext = '.json',
      ft = fileType(msg.payload);

    if (ft && ft.ext) {
      ext = '.' + ft.ext;
    }
    if (isDocx(msg.payload)) {
      ext = '.docx';
    }

    return Promise.resolve(ext);
  }

  function openTheFile(suffix) {
    var p = new Promise(function resolver(resolve, reject){
      var options = {};
      if (suffix) {
        options.suffix = suffix;
      }
      temp.open(options, function(err, info) {
        if (err) {
          reject('Error receiving the data buffer');
        } else {
          resolve(info);
        }
      });
    });
    return p;
  }

  function syncTheFile(info, msg) {
    var p = new Promise(function resolver(resolve, reject){
      fs.writeFile(info.path, msg.payload, function(err) {
        if (err) {
          reject('Error processing pdf buffer');
        }
        resolve();
      });
    });
    return p;
  }

  function createStream(info) {
    //var theStream = fs.createReadStream(info.path, 'utf8');
    var theStream = fs.readFileSync(info.path, 'utf8');
    return Promise.resolve(theStream);
  }

  function whatName(params, suffix){
    if (params.filename) {
      return params.filename;
    }
    return 'Doc ' + (new Date()).toString() + suffix;
  }

  function execute(params, msg, suffix) {
    var p = new Promise(function resolver(resolve, reject) {
      var discovery = null, p = null, method = null,
        serviceSettings = {
          username: username,
          password: password,
          version_date: '2017-09-01',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      discovery = new DiscoveryV1(serviceSettings);

      if ('.json' === suffix) {
        method = 'addJsonDocument';
      } else {
        method = 'addDocument';
      }

      discovery[method](params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg.document = response.document ? response.document : response;
          resolve();
        }
      });

    });
    return p;
  }

  if (dservice) {
    sUsername = dservice.username;
    sPassword = dservice.password;
    sEndpoint = dservice.url;
  }

  RED.httpAdmin.get('/watson-discovery-docs/vcap', function (req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function (msg) {
      var message = '',
        fileInfo = '',
        fileSuffix = '',
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
        .then(function(){
          params = discoveryutils.buildParams(msg, config);
          return checkParams(params);
        })
        .then(function(){
          return determineSuffix(msg);
        })
        .then(function(suffix) {
          fileSuffix = suffix;
          node.status({ fill: 'blue', shape: 'dot', text: 'reading' });
          return openTheFile(suffix);
        })
        .then(function(info){
          fileInfo = info;
          return syncTheFile(fileInfo, msg);
        })
        .then(function(){
          return createStream(fileInfo);
        })
        .then(function(theStream){
          //params.file = theStream;
          //var fname = 'temp' + fileSuffix;
          var fname = whatName(params, fileSuffix);
          params.file = {
            value: theStream,
            options: {
              filename: fname
            }
          };

          node.status({ fill: 'blue', shape: 'dot', text: 'processing' });
          //return Promise.reject('temp disabled');
          return execute(params, msg, fileSuffix);
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
