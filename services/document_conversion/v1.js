/**
 * Copyright 2016 IBM Corp.
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
module.exports = function(RED) {
  var pkg = require('../../package.json'),
    temp = require('temp'),
    fs = require('fs'),
    isDocx = require('is-docx'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    converts = [];

  const DocumentConversionV1 = require('watson-developer-cloud/document-conversion/v1');
  const SERVICE_IDENTIFIER = 'document-conversion';

  converts = serviceutils.getAllServiceDetails(SERVICE_IDENTIFIER);
  temp.track();

  // GNF: This method provides service credentials when prompted from the node editor
  RED.httpAdmin.get('/convert/vcap', function(req, res) {
    res.send(JSON.stringify(converts));
  });

  function ConvertNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    const configFields = ['name', 'username', 'password', 'service', 'target'];
    for (var i in configFields) {
      node[configFields[i]] = config[configFields[i]];
    }

    // Perform the Conversion, invoking the conver method
    // on the service.
    node.performConversion = function(msg, filename) {
      var p = new Promise(function resolver(resolve, reject){
        var document_conversion = new DocumentConversionV1({
          username: node.username,
          password: node.password,
          version_date: '2015-12-01',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        });

        document_conversion.convert({
          file: fs.createReadStream(filename),
          conversion_target: msg.target || node.target,
          word: msg.word,
          pdf: msg.pdf,
          normalized_html: msg.normalized_html
        }, function(err, response) {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });

      });
      return p;
    };

    // Docx files are seen as zips, and require special processing on
    // the temp file extension so that they seen correctly by the
    // Document Conversion service.
    node.checkForZip = function(pd) {
      var p = new Promise(function resolver(resolve, reject){
        if ('zip' === pd.format) {
          var f = fs.readFileSync(pd.info.path);
          if (isDocx(f)) {
            var newfilename = pd.info.path + '.docx';
            fs.rename(pd.info.path, newfilename, function(err){
              if (err) {
                reject('Unable to handle docx file.');
              } else {
                resolve(newfilename);
              }
            });
          }
        } else {
          resolve(null);
        }
      });
      return p;
    };

    // Open up the stream, done in a seperate process as makes use
    // of callback
    node.openStream = function(pd, msg) {
      var p = new Promise(function resolver(resolve, reject){
        pd.stream_payload(pd.info.path, msg.payload, function(format) {
          resolve(format);
        });
      });
      return p;
    };

    // Sanity check on the payload, as subsequent process will fail
    // if all is not ok
    node.payloadCheck = function(pd, msg) {
      if (!msg.payload) {
        return Promise.reject('Payload is required');
      }
      var stream_payload = (typeof msg.payload === 'string') ?
                              payloadutils.stream_url_format :
                              payloadutils.stream_buffer;
      if ('number' === typeof msg.payload) {
        return Promise.reject('Invalid input - expecting a url or a stream buffer');
      }
      else if (typeof msg.payload === 'string' && !payloadutils.urlCheck(msg.payload)) {
        return Promise.reject('Invalid URI, make sure to include the "http(s)" at the beginning.');
      }
      else {
        pd.stream_payload = stream_payload;
        return Promise.resolve();
      }
    };

    // Standard temp file open
    node.openTemp = function() {
      var p = new Promise(function resolver(resolve, reject){
        temp.open({
          //suffix: '.docx'
        }, function(err, info) {
          if (err) {
            reject(err);
          } else {
            resolve(info);
          }
        });
      });
      return p;
    };

    // Perform basic check to see that credentials
    // are provided, altough they may still be
    // invalid
    node.verifyCredentials = function(msg) {
      if (node && node.username && node.password) {
        return Promise.resolve();
      }
      return Promise.reject('missing credentials');
    };

    // Invoked when required to act on msg as part of a flow.
    this.on('input', function(msg) {
      var processData = {};
      node.verifyCredentials(msg)
        .then(function(){
          return node.openTemp();
        })
        .then(function(info){
          processData.info = info;
          return node.payloadCheck(processData, msg);
        })
        .then(function(){
          return node.openStream(processData, msg);
        })
        .then(function(format){
          processData.format = format;
          return node.checkForZip(processData);
        })
        .then(function(newfilename){
          node.status({
            fill: 'blue',
            shape: 'dot',
            text: 'converting, this might take some time'
          });
          return node.performConversion(msg, newfilename ?
                                             newfilename :
                                             processData.info.path);
        })
        .then(function(response){
          node.status({});
          msg.payload = response;
          node.send(msg);
        })
        .catch(function(err){
          var messageTxt = err.error ? err.error : err;
          node.status({fill:'red', shape:'dot', text: messageTxt});
          node.error(messageTxt, msg);
        });
    });

  }
  RED.nodes.registerType('convert', ConvertNode);
};
