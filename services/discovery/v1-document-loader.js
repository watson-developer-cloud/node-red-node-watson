/**
 * Copyright 20016, 2022 IBM Corp.
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
    discoveryutils = require('./discovery-utils'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    apikey = null,
    sApikey = null,
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/discovery/api';

  temp.track();

  function initialCheck(k) {
    var message = '';
    if (!k) {
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
    let ext = '.json';
    if (! discoveryutils.isJsonObject(msg.payload)) {
      let ext = '.json',
        ft = fileType(msg.payload);

      if (ft && ft.ext) {
        ext = '.' + ft.ext;
      }

      if (isDocx(msg.payload)) {
        ext = '.docx';
      }
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
      let discovery = discoveryutils.buildService(apikey, endpoint);

      // modify as getting addJsonDocument will be deprecated messages
      if ('.json' === suffix) {
        //method = 'addJsonDocument';
        //params.file = JSON.stringify(params.file);

        params.file = Buffer.from(JSON.stringify(params.file));
      //} else {
        //method = 'addDocument';
      }
      method = 'addDocument';

      discovery[method](params)
        .then((response) => {
          msg.document = response.result ? response.result : response;
          resolve();
        })
        .catch((err) => {
          reject(err);
        });

    });
    return p;
  }

  if (dservice) {
    sApikey = dservice.apikey ? dservice.apikey : '';
    sEndpoint = dservice.url ? dservice.url : '';
  }

  RED.httpAdmin.get('/watson-discovery-docs/vcap', function (req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });


  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function(msg, send, done) {
      var message = '',
        fileInfo = '',
        fileSuffix = '',
        params = {};

      apikey = sApikey || this.credentials.apikey;

      endpoint = sEndpoint;
      if (config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }

      node.status({});
      initialCheck(apikey)
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
          send(msg);
          done();
        })
        .catch(function(err){
          temp.cleanup();
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });
    });
  }

  RED.nodes.registerType('watson-discovery-v1-document-loader', Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });
};
