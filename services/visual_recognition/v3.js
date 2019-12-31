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

module.exports = function(RED) {
  const SERVICE_IDENTIFIER = 'visual-recognition',
    VisualRecognitionV3 = require('ibm-watson/visual-recognition/v3'),
    { IamAuthenticator } = require('ibm-watson/auth'),
    METHODS = {
      CREATECLASSIFER : 'createClassifier',
      LISTCLASSIFIERS : 'listClassifiers',
      UPDATECLASSIFIER : 'updateClassifier',
      GETCLASSIFIER : 'getClassifier',
      DELETECLASSIFIER : 'deleteClassifier',
      retrieveClassifiersList : 'listClassifiers',
      retrieveClassifierDetails : 'getClassifier',
      deleteClassifier : 'deleteClassifier'
    };

  var pkg = require('../../package.json'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    //watson = require('watson-developer-cloud'),
    imageType = require('image-type'),
    url = require('url'),
    temp = require('temp'),
    fileType = require('file-type'),
    fs = require('fs'),
    async = require('async'),
    toArray = require('stream-to-array'),
    sAPIKey = null,
    apikey = '',
    service = null,
    endpoint = '',
    sEndpoint = '';

  // temp is being used for file streaming to allow the file to arrive so it can be processed.
  temp.track();

  service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER);

  if (service) {
    sAPIKey = service.api_key || service.apikey;
    sEndpoint = service.url;
  }

  RED.httpAdmin.get('/watson-visual-recognition/vcap', function(req, res) {
    res.json(service ? {
      bound_service: true
    } : null);
  });

  function imageCheck(data) {
    return data instanceof Buffer && imageType(data) !== null;
  }

  function urlCheck(str) {
    var parsed = url.parse(str);
    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
  }

  function stream_buffer(file, contents, cb) {
    fs.writeFile(file, contents, function(err) {
      if (err) {
        throw err;
      }
      cb();
    });
  }

  function verifyPayload(msg) {
    if (!msg.payload) {
      return Promise.reject('Missing property: msg.payload');
    } else {
      return Promise.resolve();
    }
  }


  function verifyFeatureMode(node, msg, config) {
    const theOptions = {
      'classify' : 'classifyImage'
    };

    var f = config['image-feature'];

    if (msg.params && msg.params.detect_mode) {
      if (msg.params.detect_mode in theOptions) {
        f = theOptions[msg.params.detect_mode];
      } else {
        node.error('Invalid parameter setting for detect_mode, using configuration value');
      }
    }
    if (!f) {
      node.error('No configuration value for detect mode found, defaulting to classify');
      f = theOptions['classify'];
    }
    return Promise.resolve(f);
  }

  function verifyInputs(feature, msg) {
    switch (feature) {
    case 'classifyImage':
      if (typeof msg.payload === 'boolean' ||
        typeof msg.payload === 'number') {
        return Promise.reject('Bad format : msg.payload must be a URL string or a Node.js Buffer');
      }
      break;
    }
    return Promise.resolve();
  }


  // Even though Visual Reconition SDK can accept a filestream as input
  // it can't handle the one on msg.payload, so read it into a buffer
  function checkForStream(msg) {
    var p = new Promise(function resolver(resolve, reject) {
      if (payloadutils.isReadableStream(msg.payload)) {
        //msg.payload.resume();
        toArray(msg.payload)
          .then(function(parts) {
            var buffers = [], part = null;

            for (var i = 0; i < parts.length; ++i) {
              part = parts[i];
              buffers.push((part instanceof Buffer) ? part : new Buffer(part));
            }
            msg.payload = Buffer.concat(buffers);
            resolve();
          });
      } else {
        resolve();
      }
    });
    return p;

  }

  function verifyServiceCredentials(node, msg) {
    // If it is present the newly provided user entered key
    // takes precedence over the existing one.
    apikey = sAPIKey || node.credentials.apikey;
    if (!apikey) {
      return Promise.reject('Missing Watson Visual Recognition API service credentials');
    }

    let authSettings  = {};

    var serviceSettings = {
      version: '2018-03-19',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    // VR instances created post 22 May 2018, are expecting an iam API Key
    //if (iamAPIKey) {
    //  serviceSettings.iam_apikey = apikey;
    //} else {
    authSettings.apikey = apikey;
    //}
    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    // The change to watson-developer-cloud 3.0.x has resulted in a
    // change in how the Accept-Language is specified. It now needs
    // to go in as a header.

    if (node.config != null && node.config.lang != null) {
      serviceSettings.headers['Accept-Language'] = node.config.lang;
    }
    if (msg.params != null && msg.params.accept_language != null) {
      serviceSettings.headers['Accept-Language'] = msg.params['accept_language'];
    }

    node.service = new VisualRecognitionV3(serviceSettings);

    return Promise.resolve();
  }


  function processTheResponse(body, feature, node, msg) {
    if (body == null) {
      return Promise.reject('call to watson visual recognition v3 service failed');
    } else if (body.images != null && body.images[0].error) {
      return Promise.reject(body.images[0].error);
    } else {
      if (feature === 'deleteClassifier') {
        msg.result = 'Successfully deleted classifier_id: ' + msg.params.classifier_id;
      } else {
        msg.result = body;
      }
      return Promise.resolve();
    }
  }

  function setCommonParams(node, msg, params) {
    if (msg.params != null && msg.params.classifier_ids != null) {
      params['classifierIds'] = msg.params['classifier_ids'];
    }
    if (msg.params != null && msg.params.owners != null) {
      params['owners'] = msg.params['owners'];
    }
    if (msg.params != null && msg.params.threshold != null) {
      params['threshold'] = msg.params['threshold'];
    }
    if (node.config != null && node.config.lang != null) {
      params['acceptLanguage'] = node.config.lang;
    }
    if (msg.params != null && msg.params.accept_language != null) {
      params['acceptLanguage'] = msg.params['accept_language'];
    }
  }

  function prepareCommonParams(params, node, msg) {
    var p = new Promise(function resolver(resolve, reject) {
      if (imageCheck(msg.payload)) {
        var ft = fileType(msg.payload);
        var ext = ft ? ft.ext : 'tmp';
        temp.open({
          suffix: '.' + ext
        }, function(err, info) {
          if (err) {
            reject('Node has been unable to open the image stream');
          }
          stream_buffer(info.path, msg.payload, function() {
            params['imagesFile'] = fs.createReadStream(info.path);
            setCommonParams(node, msg, params);
            resolve();
          });
        });
      } else if (urlCheck(msg.payload)) {
        params['url'] = msg.payload;
        setCommonParams(node, msg, params);
        resolve();
      } else {
        reject('Payload must be either an image buffer or a string representing a url');
      }
    });
    return p;
  }


  // This is where the two read stream tasks are built, individually
  // asynTasks will be the two functions that will be invoked added
  // one at a time, each time this function is invoked
  // msg holds the parameters
  // k is the key value for the files in msg.
  // listParams is where the files will go so that they
  // can be sent to the service.
  // callback is the callback that async forces so that it can
  // control the async functions that it is invoking.
  function addTask(asyncTasks, msg, k, listParams, node) {
    asyncTasks.push(function(callback) {
      var buffer = msg.params[k];
      temp.open({
        suffix: '.' + fileType(buffer).ext
      }, function(err, info) {
        if (err) {
          node.status({
            fill: 'red',
            shape: 'ring',
            text: 'unable to open image stream'
          });
          node.error('Node has been unable to open the image stream', msg);
          return callback('open error on ' + k);
        }
        stream_buffer(info.path, msg.params[k], function() {
          let example_name = k.replace('_examples','');

          if (k.includes('negative')) {
            listParams['negativeExamples'] = fs.createReadStream(info.path);
          } else {
            if (! listParams['positiveExamples']) {
              listParams['positiveExamples'] = {};
            }
            listParams['positiveExamples'][example_name] = fs.createReadStream(info.path);
          }

          callback(null, example_name);
        });
      });
    });
  }

  // This function is expecting
  // msg.params["name"] : a string name that will be used as prefix
  // for the returned classifier_id (Required)
  // msg.params["{classname}_examples"] : a Node.js binary
  // Buffer of the ZIP that contains a minimum of 10 images. (Required)
  // msg.params["negative_examples"] : a Node.js binary Buffer of the ZIP
  // that contains a minimum of 10 images.(Optional)

  function prepareParamsClassifierFiles(params, node, msg) {
    var p = new Promise(function resolver(resolve, reject) {
      var listParams = {},
        asyncTasks = [],
        k = null;
      for (k in msg.params) {
        if (k.indexOf('_examples') >= 0) {
          addTask(asyncTasks, msg, k, listParams, node);
        } else if (k === 'name') {
          listParams[k] = msg.params[k];
        }
      }

      // function is invoked when both asyncTasks have completed.
      async.parallel(asyncTasks, function(error) {
        if (error) {
          reject(error);
          //throw error;
        }
        for (var p in listParams) {
          if (p != null) {
            params[p] = listParams[p];
          }
        }
        resolve();
      });
    });
    return p;
  }

  function performDeleteAllClassifiers(params, node, msg) {
    var p = new Promise(function resolver(resolve, reject) {
      node.service.listClassifiers(params, function(err, body) {
        node.status({});
        if (err) {
          reject(err);
        } else {
          // Array to hold async tasks
          var asyncTasks = [],
            nbTodelete = 0,
            nbdeleted = 0;
          nbTodelete = body.classifiers.length;
          body.classifiers.forEach(function(aClassifier) {
            asyncTasks.push(function(cb) {
              var parms = {};

              parms.classifier_id = aClassifier.classifier_id;
              node.service.deleteClassifier(parms, function(err) {
                if (err) {
                  node.error(err, msg);
                  return cb('error');
                }
                nbdeleted++;
                cb(null, parms.classifier_id);
              });
            });
          });
          async.parallel(asyncTasks, function(error, deletedList) {
            if (deletedList.length === nbTodelete) {
              msg.result = 'All custom classifiers have been deleted.';
            } else {
              msg.result = 'Some Classifiers could have not been deleted;' +
                'See log for errors.';
            }
            resolve();
          });
        }
      });
    });
    return p;
  }

  function invokeService(feature, params, node, msg) {
    var p = new Promise(function resolver(resolve, reject) {
      switch (feature) {
      case 'classifyImage':
       node.service.classify(params)
         .then((data) => {
           let result = data
           if (data && data.result) {
             result = data.result;
           }
          resolve(result);
         })
         .catch((err) => {
           reject(err);
         });
        break;
      }
    });
    return p;
  }

  function executeService(feature, params, node, msg) {
    var p = prepareCommonParams(params, node, msg)
      .then(function() {
        return invokeService(feature, params, node, msg);
      })
      .then(function(body) {
        return processTheResponse(body, feature, node, msg);
      });
    return p;
  }

  function invokeClassifierMethod(node, params, method) {
    var p = new Promise(function resolver(resolve, reject) {
      node.service[method](params)
        .then((data) => {
          let result = data
          if (data && data.result) {
            result = data.result;
          }
         resolve(result);
        })
        .catch((err) => {
          reject(err);
        })
    });
    return p;
  }

  function executeCreateClassifier(params, node, msg) {
    var p = prepareParamsClassifierFiles(params, node, msg)
      .then(function() {
        return invokeClassifierMethod(node, params, METHODS.CREATECLASSIFER);
      });

    return p;
  }

  function executeUpdateClassifier(params, node, msg) {
    // This is not an error, the params for create & update
    // are essentially the same.
    var p = prepareParamsClassifierFiles(params, node, msg)
      .then(function() {
        return invokeClassifierMethod(node, params, METHODS.UPDATECLASSIFIER);
      });

    return p;
  }

  function executeUtilService(feature, params, node, msg) {
    var p = null;
    switch (feature) {
    case 'createClassifier':
      p = executeCreateClassifier(params, node, msg)
        .then(function(body) {
          return processTheResponse(body, feature, node, msg);
        });
      break;

    case 'updateClassifier':
      p = executeUpdateClassifier(params, node, msg)
        .then(function(body) {
          return processTheResponse(body, feature, node, msg);
        });
      break;

    case 'retrieveClassifiersList':
    case 'retrieveClassifierDetails':
    case 'deleteClassifier':
      p = invokeClassifierMethod(node, params, METHODS[feature])
        .then(function(body) {
          return processTheResponse(body, feature, node, msg);
        });
      break;

    case 'deleteAllClassifiers':
      p = performDeleteAllClassifiers(params, node, msg);
      break;

    default:
      p = Promise.reject('Mode ' + feature + ' not understood');
    }
    return p;
  }

  function execute(feature, params, node, msg) {
    node.status({
      fill: 'blue',
      shape: 'dot',
      text: 'Calling ' + feature + ' ...'
    });

    if (feature === 'classifyImage') {
      return executeService(feature, params, node, msg);
      //return Promise.resolve();
    } else {
      if (msg.params && msg.params['classifier_id']) {
        params['classifier_id'] = msg.params['classifier_id'];
      }
      return executeUtilService(feature, params, node, msg);
      // return Promise.resolve();
    }
  }

  function determineEndpoint(config) {
    endpoint = sEndpoint;
    if (!endpoint && config['vr-service-endpoint']) {
      endpoint = config['vr-service-endpoint'];
    }
    return Promise.resolve();
  }

  // This is the Watson Visual Recognition V3 Node
  function WatsonVisualRecognitionV3Node(config) {
    var node = this,
      b = false,
      feature = '';

    RED.nodes.createNode(this, config);
    node.config = config;

    node.on('input', function(msg, send, done) {
      var params = {};

      node.status({});

      verifyPayload(msg)
        .then(function() {
          return verifyFeatureMode(node, msg, config);
        })
        .then(function(f) {
          feature = f;
          return checkForStream(msg);
        })
        .then(function() {
          return verifyInputs(feature, msg);
        })
        .then(function() {
          return determineEndpoint(config);
        })
        .then(function() {
          return verifyServiceCredentials(node, msg);
        })
        .then(function() {
          return execute(feature, params, node, msg);
        })
        .then(function() {
          temp.cleanup();
          node.status({});
          send(msg);
          done();
        })
        .catch(function(err) {
          payloadutils.reportError(node, msg, err);

          msg.result = {};
          msg.result['error'] = err;
          // Note: This node.send forwards the error to the next node,
          // if this isn't desired then this line needs to be removed.
          // Should be ok as the node.error would already have recorded
          // the error in the debug console.
          temp.cleanup();
          send(msg);
          done(err);
        });
    });
  }

  RED.nodes.registerType('visual-recognition-v3', WatsonVisualRecognitionV3Node, {
    credentials: {
      apikey: {
        type: 'password'
      }
    }
  });

  RED.nodes.registerType('visual-recognition-util-v3', WatsonVisualRecognitionV3Node, {
    credentials: {
      apikey: {
        type: 'password'
      }
    }
  });

};
