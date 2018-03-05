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

module.exports = function(RED) {

  const SERVICE_IDENTIFIER = 'discovery';
  var pkg = require('../../package.json'),
    discoveryutils = require('./discovery-utils'),
    DiscoveryV1 = require('watson-developer-cloud/discovery/v1'),
    serviceutils = require('../../utilities/service-utils'),
    dservice = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    sUsername = null,
    sPassword = null,
    sEndpoint = 'https://gateway.watsonplatform.net/discovery/api';


  if (dservice) {
    sUsername = dservice.username;
    sPassword = dservice.password;
    sEndpoint = dservice.url;
  }

  RED.httpAdmin.get('/watson-discovery-v1-query-builder/vcap', function(req, res) {
    res.json(serviceutils.checkServiceBound(SERVICE_IDENTIFIER));
  });

  // API used by widget to fetch available environments
  RED.httpAdmin.get('/watson-discovery-v1-query-builder/environments', function(req, res) {
    var discovery = new DiscoveryV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd,
      url: req.query.endpoint ? req.query.endpoint : sEndpoint,
      version_date: '2017-11-07',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });

    discovery.getEnvironments({}, function(err, response) {
      if (err) {
        res.json(err);
      } else {
        res.json(response.environments ? response.environments : response);
      }
    });
  });

  // API used by widget to fetch available collections in environment
  RED.httpAdmin.get('/watson-discovery-v1-query-builder/collections', function(req, res) {
    var discovery = new DiscoveryV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd,
      url: req.query.endpoint ? req.query.endpoint : sEndpoint,
      version_date: '2017-11-07',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });

    discovery.getCollections({
      environment_id: req.query.environment_id
    },
      function(err, response) {
        if (err) {
          res.json(err);
        } else {
          res.json(response.collections ? response.collections : response);
        }
      }
    );
  });

  // API used by widget to fetch available collections in environment
  RED.httpAdmin.get('/watson-discovery-v1-query-builder/schemas', function(req, res) {
    var discovery = new DiscoveryV1({
      username: sUsername ? sUsername : req.query.un,
      password: sPassword ? sPassword : req.query.pwd,
      url: req.query.endpoint ? req.query.endpoint : sEndpoint,
      version_date: '2017-11-07',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });

    discovery.query({
      environment_id: req.query.environment_id,
      collection_id: req.query.collection_id,
      //query: 'text:a,text:ibm',
      // Need a Query that will return some data!
      query: 'text:"Trump",text:"IBM",text:"Watson"',
      count: 1
    },
      function(err, response) {
        if (err) {
          res.json(err);
        } else {
          var fieldList = discoveryutils.buildFieldList(response);
          res.json(fieldList);
        }
      }
    );
  });

  function Node(config) {
    var node = this;
    RED.nodes.createNode(this, config);

    this.on('input', function(msg) {
      // Simply return params for query on msg object
      msg.discoveryparams = discoveryutils.buildMsgOverrides(msg, config);
      node.send(msg);
    });
  }

  RED.nodes.registerType('watson-discovery-v1-query-builder', Node, {
    credentials: {
      username: {
        type: 'text'
      },
      password: {
        type: 'password'
      }
    }
  });
};
