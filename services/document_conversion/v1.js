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
    appEnv = cfEnv.getAppEnv(),
    converts = [],
    isDocx = require('is-docx'),
    temp = require('temp');
  temp.track();

  // GNF: Read credentials information from the VCAP environment variable
  for (var i in appEnv.services) {
    // filter the services to include only the Convert ones
    if (i.match(/^(document_conversion)/i)) {
      converts = converts.concat(appEnv.services[i].map(function(v) {
        return {
          name: v.name,
          label: v.label,
          url: v.credentials.url,
          username: v.credentials.username,
          password: v.credentials.password
        };
      }));
    }
  }

  // GNF: This method provides service credentials when prompted from the node editor
  RED.httpAdmin.get('/convert/vcap', function(req, res) {
    res.send(JSON.stringify(converts));
  });

  function ConvertNode(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.username = config.username;
    this.password = config.password;
    this.service = config.service;
    this.target = config.target;
    var node = this;

    this.performConversion = function(msg,filename) {
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
          node.send({
            'payload': response
          });
        }
      });
    };

    this.doCall = function(msg) {
      temp.open({
        //suffix: '.docx'
      }, function(err, info) {
        if (err) {
          throw err;
        }
        var stream_payload = (typeof msg.payload === 'string') ? payloadutils.stream_url_format : payloadutils.stream_buffer;
        if(typeof msg.payload === 'string' && !payloadutils.urlCheck(msg.payload)) {
        	node.warn('Invalid URI, make sure to include the "http(s)" at the beginning.');
        	node.status({
	            fill: 'red',
	            shape: 'dot',
	            text: 'Invalid URI'
	          });
        } else {
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
      this.doCall(msg);
    });
  }
  RED.nodes.registerType('convert', ConvertNode);
};
