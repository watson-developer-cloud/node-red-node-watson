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
  var temp = require('temp'),
    serviceutils = require('../../utilities/service-utils'),
    converts = [];

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
        .then(function(response){
          node.status({});
          msg.payload = 'ok so far';
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
