/**
 * Copyright 2013,2015, 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
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

// AlchemyAPI Image Analysis functions supported by this node
var FEATURE_RESPONSES = {
  imageFaces: 'imageFaces',
  imageLink: "image",
  imageKeywords: "imageKeywords",
  imageText: "sceneTextLines"
};


module.exports = function (RED) {
  var cfenv = require('cfenv');
  var watson = require('watson-developer-cloud');

  var imageType = require('image-type');
  var temp = require('temp');
  var fileType = require('file-type');
  var fs = require('fs');

  var payloadutils = require('../../utilities/payload-utils');

  // temp is being used for file streaming to allow the file to arrive so it can be processed.
  temp.track();

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the api key is stored in the variable s_apikey.
  //
  // This separation between s_apikey and apikey is to allow
  // the end user to modify the key  redentials when the service is not bound.
  // Otherwise, once set apikey is never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  // Taking this line out as codacy was complaining about it.
  // var services = cfenv.getAppEnv().services,

  var apikey, s_apikey;

  var service = cfenv.getAppEnv().getServiceCreds(/alchemy/i);

  if (service) {
    s_apikey = service.apikey;
  }

  RED.httpAdmin.get('/alchemy-image-analysis/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // Utility functions that check for image buffers, urls and stream data in

  function imageCheck(data) {
    return data instanceof Buffer && imageType(data) !== null;
  };

  function stream_buffer(file, contents, cb) {
    fs.writeFile(file, contents, function (err) {
      if (err) throw err;
      cb();
    });
  };

  // Utility function that performs the alchemy vision call.
  // the cleanup removes the temp storage, and I am not sure whether
  // it should be called here or after alchemy returns and passed
  // control back to cbdone.

  function performAction(params, feature, cbdone, cbcleanup) {
    var alchemy_vision = watson.alchemy_vision( { api_key: apikey } );

    if (feature == 'imageFaces')
    {
      alchemy_vision.recognizeFaces(params, cbdone);
    } else if (feature == 'imageLink') {
      alchemy_vision.getImageLinks(params, cbdone);
    } else if (feature == 'imageKeywords') {
      alchemy_vision.getImageKeywords(params, cbdone);
    } else if (feature == 'imageText') {
      alchemy_vision.getImageSceneText(params, cbdone);
    }

    if (cbcleanup) cbcleanup();
  }


  // This is the Alchemy Image Node

  function AlchemyImageAnalysisNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      if (!msg.payload) {
        this.status({fill:'red', shape:'ring', text:'missing payload'});
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      // If it is present the newly provided user entered key takes precedence over the existing one.
      apikey = s_apikey || this.credentials.apikey;
      this.status({});

      if (!apikey) {
        this.status({fill:'red', shape:'ring', text:'missing credentials'});
        var message ='Missing Alchemy API service credentials';
        node.error(message, msg);
        return;
      }

      // Check which single feature has been requested.
      var feature = config["image-feature"];

      // Splice in the additional options from msg.alchemy_options
      // eg. The user may have entered msg.alchemy_options = {knowledgeGraph: 1};
      var params = {};

      for (var key in msg.alchemy_options) { params[key] = msg.alchemy_options[key]; }

      // This is the callback after the call to the alchemy service.
      // Set up as a var within this scope, so it has access to node, msg etc.
      // in preparation for the Alchemy service action
      var actionComplete = function(err, keywords) {
        if (err || keywords.status === 'ERROR') {
          node.status({fill:'red', shape:'ring', text:'call to alchmeyapi vision service failed'});
          console.log('Error:', msg, err);
          node.error(err, msg);
        }
        else {
          msg.result = keywords[FEATURE_RESPONSES[feature]] || [];
          msg.fullresult = {};
          msg.fullresult['all'] = keywords;
          node.send(msg);
        }
      }

      // If the input is an image, need to stream the input in, giving time for the
      // data to arrive, before invoking the service.
      if (imageCheck(msg.payload)) {
        temp.open({suffix: '.' + fileType(msg.payload).ext}, function (err, info) {
          if (err) {
            this.status({fill:'red', shape:'ring', text:'unable to open image stream'});
            var message ='Node has been unable to open the image stream';
            node.error(message, msg);
            return;
          }

          stream_buffer(info.path, msg.payload, function () {
            params['image'] = fs.createReadStream(info.path);
            performAction(params, feature, actionComplete, temp.cleanup);
          });

        });
      } else if (payloadutils.urlCheck(msg.payload)) {
        params['url'] = msg.payload;
        performAction(params, feature, actionComplete);
      } else {
        this.status({fill:'red', shape:'ring', text:'payload is invalid'});
        var message ='Payload must be either an image buffer or a string representing a url';
        node.error(message, msg);
        return;
      }

    });
  }

  RED.nodes.registerType('alchemy-image-analysis', AlchemyImageAnalysisNode, {
    credentials: {
      apikey: {type:"password"}
    }
  });
};
