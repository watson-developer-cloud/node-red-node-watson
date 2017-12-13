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

module.exports = function (RED) {
  const SERVICE_IDENTIFIER = 'visual-recognition';
  var pkg = require('../../package.json'),
    serviceutils = require('../../utilities/service-utils'),
    watson = require('watson-developer-cloud'),
    imageType = require('image-type'),
    temp = require('temp'),
    fileType = require('file-type'),
    fs = require('fs'),
    sAPIKey = null,
    service = null;

  // temp is being used for file streaming to allow the file to arrive so it can be processed.
  temp.track();

  service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sAPIKey = service.api_key;
  }

  RED.httpAdmin.get('/watson-similarity-search/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function imageCheck(data) {
    return data instanceof Buffer && imageType(data) !== null;
  }

  function stream_buffer(file, contents, cb) {
    fs.writeFile(file, contents, function (err) {
      if (err) {
        throw err;
      }
      cb();
    });
  }

  function verifyServiceCredentials(node, msg) {
    // If it is present the newly provided user entered key
    // takes precedence over the existing one.
    node.apikey = sAPIKey || node.credentials.apikey;
    if (!node.apikey) {
      node.status({fill:'red', shape:'ring', text:'missing credentials'});
      node.error('Missing Watson Visual Recognition API service credentials', msg);
      return false;
    }
    node.service = watson.visual_recognition({
      api_key: node.apikey,
      version: 'v3',
      version_date: '2016-05-20',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });
    return true;
  }

  function processResponse(err, body, feature, node, msg) {
    if (err != null && body == null) {
      node.status({fill:'red', shape:'ring',
        text:'call to watson similarity search v3 service failed'});
      msg.payload = {};
      if (err.code === null) {
        msg.payload.error = err;
      } else {
        msg.payload.error_code = err.code;
        if (!err.error) {
          msg.payload.error = err.error;
        }
      }
      node.error(err);
      return;
    } else if (err == null && body != null && body.images != null &&
      body.images[0] && body.images[0].error) {
      node.status({fill:'red', shape:'ring',
        text:'call to watson visual recognition v3 service failed'});
      msg.payload = {};
      msg.payload.error_id = body.images[0].error.error_id;
      msg.payload.error = body.images[0].error.description;
      node.send(msg);
    } else {
      if (feature === 'deleteClassifier') {
        msg.payload = 'Successfully deleted classifier_id: ' + msg.params.classifier_id ;
      } else {
        msg.payload = body;
      }
      node.send(msg);
      node.status({});
    }
  }

  function processImage(params, node, feature, cb, msg) {
    var image = params.image_file;
    if (imageCheck(image)) {
      temp.open({suffix: '.' + fileType(image).ext}, function (err, info) {
        if (err) {
          this.status({fill:'red', shape:'ring', text:'unable to open image stream'});
          node.error('Node has been unable to open the image stream', msg);
          return cb(feature, params);
        }

        stream_buffer(info.path, image, function () {
          params.image_file = fs.createReadStream(info.path);
          cb(feature, params);
        });
      });
    } else {
      node.status({fill:'red', shape:'ring', text:'payload is invalid'});
      node.error('Payload must be an image buffer', msg);
    }
  }

  function addParams(params, msg, paramsToAdd) {
    var i = null,
      param = null;

    for (i in paramsToAdd) {
      if (paramsToAdd.hasOwnProperty(i)) {
        param = paramsToAdd[i];
        if (param === 'image_file') {
          params.image_file = msg.payload;
        } else {
          params[param] = msg.params[param];
        }
      }
    }
    return params;
  }

  function executeService(feature, params, node, msg) {
    var requiredParams = {
        findSimilar: ['collection_id', 'image_file'],
        createCollection: ['name'],
        getCollection: ['collection_id'],
        listCollections: [],
        deleteCollection: ['collection_id'],
        addImage: ['collection_id','image_file'],
        listImages: ['collection_id'],
        getImage: ['collection_id','image_id'],
        deleteImage: ['collection_id','image_id'],
        setImageMetadata: ['collection_id', 'image_id', 'metadata'],
        getImageMetadata: ['collection_id', 'image_id'],
        deleteImageMetadata: ['collection_id', 'image_id']
      },
      optionalParams = {
        findSimilar: ['limit'],
        addImage: ['metadata']
      };
    params = addParams(params, msg, requiredParams[feature]);

    if (feature in optionalParams) {
      params = addParams(params, msg, optionalParams[feature]);
    }

    function callWatson(feature, params) {
      node.service[feature](params, function (err, body) {
        processResponse(err, body, feature, node, msg);
      });
    }

    if ('image_file' in params) {
      processImage(params, node, feature, callWatson, msg);
    } else {
      callWatson(feature, params);
    }
  }

  function execute(feature, params, node, msg) {
    node.status({fill:'blue', shape:'dot' , text:'Calling ' + feature + ' ...'});
    executeService(feature, params, node, msg);
  }

  // This is the Watson Visual Recognition V3 Node
  function SimilaritySearchV3Node (config) {
    var node = this, b = false, feature = config['image-feature'];
    RED.nodes.createNode(this, config);
    node.config = config;

    node.on('input', function (msg) {
      var params = {};

      node.status({});
      // so there is at most 1 temp file at a time (did not found a better solution...)
      temp.cleanup();

      b = verifyServiceCredentials(node, msg);
      if (!b) {
        return;
      }
      execute(feature,params,node,msg);
    });
  }

  RED.nodes.registerType('similarity-search-v3', SimilaritySearchV3Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });

  RED.nodes.registerType('similarity-search-util-v3', SimilaritySearchV3Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });

};
