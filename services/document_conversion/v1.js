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
  var https = require('https'),
    cfEnv = require('cfenv'),
    watson = require('watson-developer-cloud'),
    fs = require('fs'),
    payloadutils = require('../../utilities/payload-utils'),
    //appEnv = cfEnv.getAppEnv(),
    converts = [],
    isDocx = require('is-docx'),
    temp = require('temp');
  temp.track();

  const SERVICE_IDENTIFIER = 'document-conversion';
  var serviceutils = require('../../utilities/service-utils');

  converts = serviceutils.getAllServiceDetails(SERVICE_IDENTIFIER);

  // GNF: This method provides service credentials when prompted from the node editor
  RED.httpAdmin.get('/convert/vcap', function(req, res) {
    res.send(JSON.stringify(converts));
  });

  function ConvertNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.name = config.name;
    node.username = config.username;
    node.password = config.password;
    node.service = config.service;
    node.target = config.target;
    //var node = this;

    node.performConversion = function(msg,filename) {
      var document_conversion = watson.document_conversion({
        username: node.username,
        password: node.password,
        version: 'v1',
        version_date: '2015-12-01'
      });

      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'converting'
      });

      document_conversion.convert({
        file: fs.createReadStream(filename),
        conversion_target: msg.target || node.target,
        word: msg.word,
        pdf: msg.pdf,
        normalized_html: msg.normalized_html
      }, function(err, response) {
        node.status({});
        if (err) {
          node.error(err);
        } else {
          msg.payload = response;
          node.send(msg);
        }
      });
    };

    node.verifyCredentials = function(msg) {
      console.log('In verify credentials');
      if (node && node.username && node.password) {
        console.log('credentials found');
        return Promise.resolve();
      }
      //node.status({fill:'red', shape:'ring', text:'missing credentials'});
      //node.error('Missing Watson Document Conversion API service credentials', msg);
      console.log('credentials not found');
      return Promise.reject('missing credentials');
    };

    node.openTemp = function() {
      var p = new Promise(function resolver(resolve, reject){
        console.log('Soheel Testing - In openTemp');
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
    }


    node.payloadCheck = function(pd, msg) {
      console.log('Soheel Testing - Checking Payload', typeof msg.payload);
      var stream_payload = (typeof msg.payload === 'string') ?
                              payloadutils.stream_url_format :
                              payloadutils.stream_buffer;
      if ('number' === typeof msg.payload) {
        console.log('rejecting as number found');
        return Promise.reject('Invalid input - expecting a url or a stream buffer');
      }
      else if (typeof msg.payload === 'string' && !payloadutils.urlCheck(msg.payload)) {
        console.log('rejecting as invalid payload');
        return Promise.reject('Invalid URI, make sure to include the "http(s)" at the beginning.');
      }
      else {
        console.log('payload looks ok');
        pd.stream_payload = stream_payload;
        return Promise.resolve();
      }
    };

    node.openStream = function(pd, msg) {
      var p = new Promise(function resolver(resolve, reject){
        console.log('trying to open the stream');
        console.log('checking processData :', pd);
        pd.stream_payload(pd.info.path, msg.payload, function(format) {
          pd.format = format;
          resolve();
        });
      });
    };

    node.doCall = function(msg) {
      console.log('Soheel Testing - In doCall');
      temp.open({
        //suffix: '.docx'
      }, function(err, info) {
        if (err) {
          throw err;
        }
        console.log('Soheel Testing - Checking Payload', typeof msg.payload);
        var stream_payload = (typeof msg.payload === 'string') ? payloadutils.stream_url_format : payloadutils.stream_buffer;
        if ('number' === typeof msg.payload) {
          node.warn('Invalid input - expecting a url or a stream buffer');
        	node.status({
	            fill: 'red',
	            shape: 'dot',
	            text: 'Invalid Input'
	          });
        }
        else if(typeof msg.payload === 'string' && !payloadutils.urlCheck(msg.payload)) {
        	node.warn('Invalid URI, make sure to include the "http(s)" at the beginning.');
        	node.status({
	            fill: 'red',
	            shape: 'dot',
	            text: 'Invalid URI'
	          });
        } else {
          console.log('Soheel Testing - Streaming');
          stream_payload(info.path, msg.payload, function(format) {
            if ('zip' === format) {
              var f = fs.readFileSync(info.path);
              if (isDocx(f)) {
                var newfilename = info.path + '.docx';
                fs.rename(info.path, newfilename, function(err){
                  if (err) {
                    node.warn('Unable to handle docx file.');
                    node.status({
          	            fill: 'red',
          	            shape: 'dot',
          	            text: 'Error handling docx file'
          	          });
                  } else {
                    node.performConversion(msg,newfilename);
                  }
                });
              } else {
                node.performConversion(msg,info.path);
              }
            } else {
              node.performConversion(msg,info.path);
            }
          });
        }
      });
    };

    this.on('input', function(msg) {
      var processData = {};
      node.verifyCredentials(msg)
        .then(function(){
          return node.openTemp();
        })
        .then(function(info){
          console.log('info returned :', info);
          processData.info = info;
          return node.payloadCheck(processData, msg);
        })
        .then(function(){
          return node.openStream(processData, msg);
        })
        .then(function(){
          console.log('will be performing doCall here');
          // node.doCall(msg);
        })
        .catch(function(err){
          console.log('error detected :', err);
          var messageTxt = err.error ? err.error : err;
          node.status({fill:'red', shape:'dot', text: messageTxt});
          node.error(messageTxt, msg);
        });

      //if (this.verifyCredentials(msg)) {
      //  this.doCall(msg);
      //}
    });
  }
  RED.nodes.registerType('convert', ConvertNode);
};
