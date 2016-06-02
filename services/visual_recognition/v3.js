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

// Watson Visual Recognition functions supported by this node
var FEATURE_RESPONSES = {
  classifyImage: 'classifyImage',
  detectFaces: 'detectFaces',
  recognizeText: 'recognizeText',
  createClassifier: 'createClassifier',
  retrieveClassifiersList: 'retrieveClassifiersList',
  retrieveClassifierDetails: 'retrieveClassifierDetails',
  deleteClassifier: 'deleteClassifier'
};

module.exports = function (RED) {
  var cfenv = require('cfenv');
  var watson = require('watson-developer-cloud');

  var imageType = require('image-type');
  var url = require('url');
  var temp = require('temp');
  var fileType = require('file-type');
  var fs = require('fs');
  var async = require('async');

  // temp is being used for file streaming to allow the file to arrive so it can be processed. 
  temp.track();

  // Require the Cloud Foundry Module to pull credentials from bound service 
  // If they are found then the api key is stored in the variable s_apikey. 
  //
  // This separation between s_apikey and apikey is to allow 
  // the end user to modify the key credentials when the service is not bound.
  // Otherwise, once set apikey is never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  // Taking this line out as codacy was complaining about it. 
  // var services = cfenv.getAppEnv().services,

  var apikey, s_apikey;

  var service = cfenv.getAppEnv().getServiceCreds(/visual recognition/i);

  if (service) {
    s_apikey = service.apikey;
  }

  RED.httpAdmin.get('/watson-visual-recognition/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // Utility functions that check for image buffers, urls and stream data in
 
  function imageCheck(data) {
    return data instanceof Buffer && imageType(data) !== null;
  };

  function urlCheck(str) {
    var parsed = url.parse(str)
    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
  };

  function stream_buffer(file, contents, cb) {
    fs.writeFile(file, contents, function (err) {
      if (err) throw err;
      cb();
    });
  };

  // Utility function that performs the Watson Visual Recognition call. 
  // the cleanup removes the temp storage, and I am not sure whether 
  // it should be called here or after alchemy returns and passed
  // control back to cbdone.

  function performAction(params, feature, cbdone) {

        var visualRecognition = watson.visual_recognition({
          api_key: apikey,
          version: 'v3',
          version_date: '2016-05-19'
        });

    if (feature == 'classifyImage')
    {
      visualRecognition.classify(params, cbdone);
    } else if (feature === 'detectFaces') {
      visualRecognition.detectFaces(params, cbdone);
    } else if (feature === 'recognizeText') {
      visualRecognition.recognizeText(params, cbdone);
    } else if (feature === 'createClassifier') {
      visualRecognition.createClassifier(params, cbdone);
    } else if (feature === 'retrieveClassifiersList') {
      visualRecognition.listClassifiers(params, cbdone);
    } else if (feature === 'retrieveClassifierDetails') {
      visualRecognition.getClassifier(params, cbdone);
    } else if (feature === 'deleteClassifier') {
      visualRecognition.deleteClassifier(params, cbdone);
    }

  }

  // This is the Watson Visual Recognition V3 Node
  function WatsonVisualRecognitionV3Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) 
    {

      // Check which single feature has been requested.
      var feature = config["image-feature"];

      node.status({});
      
      temp.cleanup(); // so there is at most 1 temp file at a time (did not found a better solution...)

      if (!msg.payload) {
        this.status({fill:'red', shape:'ring', text:'missing payload'}); 
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

    if (feature != 'retrieveClassifiersList' && feature != 'retrieveClassifierDetails' && feature != 'deleteClassifier')
      if (typeof msg.payload == "boolean" || typeof msg.payload == "number") {
          this.status({fill:'red', shape:'ring', text:'bad format payload'}); 
          var message = 'Bad format : msg.payload must be a URL string or a Node.js Buffer';
          node.error(message, msg);
          return;
        }

      // If it is present the newly provided user entered key takes precedence over the existing one. 
      apikey = s_apikey || this.credentials.apikey;
      this.status({}); 

      if (!apikey) {
        this.status({fill:'red', shape:'ring', text:'missing credentials'});          
        var message ='Missing Watson Visual Recognition API service credentials'; 
        node.error(message, msg);
        return;
      }

      var params = {};

      // This is the callback after the call to the watson service.    
      // Set up as a var within this scope, so it has access to node, msg etc. 
      // in preparation for the Watson service action       
      var actionComplete = function(err, body, other) {

        if (err != null && body==null)
        {
          node.status({fill:'red', shape:'ring', text:'call to watson visual recognition v3 service failed'}); 
          msg.result = {};
          msg.result['error_code']= err.code;
          if (!err.error)
            msg.result['error']= err.error;
          console.log('Error:', err.code);
          node.error('Error code : ' +  err.code);
          return;
        }
        else if (body.images[0].error)
        {
          err_desc = body.images[0].error.description;
          err_id = body.images[0].error.error_id
          node.status({fill:'red', shape:'ring', text:'call to watson visual recognition v3 service failed'}); 
          msg.result = {};
          msg.result['error_id']= err_id;
          msg.result['error']= err_desc;
          console.log('Error:', err_desc);
          msg.payload='see msg.result.error';
          node.send(msg); 
        }
        else {
          msg.result = {};
          msg.result['all'] = body;
          msg.payload='see msg.result'; // to remove any Buffer that could remains
          node.send(msg); 
          node.status({});
        }
      } // actionComplete    

      var actionComplete2 = function(err, body, other) {

        console.log('err', err);
        console.log('body', body);

        if (err != null && body==null)
        {
          node.status({fill:'red', shape:'ring', text:'call to watson visual recognition v3 service failed'}); 
          msg.result = {};
          msg.result['error_code']= err.code;
          if (!err.error)
            msg.result['error']= err.error;
          console.log('Error:', err.code);
          node.error('Error code : ' +  err.code);
          return;
        }
        else {
          //msg.result = keywords[FEATURE_RESPONSES[feature]] || [];
          msg.result = {};
          msg.result['all'] = body;
          msg.payload='see msg.result'; // to remove any Buffer that could remains
          node.send(msg); 
          node.status({});
        }
      } // actionComplete2

      var actionCompleteDeleteClassifier = function(err, body, other) {

        if (err != null && body==null)
        {
          node.status({fill:'red', shape:'ring', text:'call to watson visual recognition v3 service failed'}); 
          msg.result = {};
          msg.result['error_code']= err.code;
          if (!err.error)
            msg.result['error']= err.error;
          console.log('Error:', err.code);
          node.error('Error code : ' +  err.code);
          return;
        }
        else {
          msg.result = 'Deleted classifier_id';
          msg.payload='see msg.result';
          node.send(msg); 
          node.status({});
        }
      } // actionCompleteDeleteClassifier
      
      // If the input is an image, need to stream the input in, giving time for the
      // data to arrive, before invoking the service. 
      node.status({fill:'blue', shape:'dot', text:'Calling '+ feature + ' ...'});
      if (imageCheck(msg.payload)) {
        temp.open({suffix: '.' + fileType(msg.payload).ext}, function (err, info) {
          if (err) {
            this.status({fill:'red', shape:'ring', text:'unable to open image stream'});          
            var message ='Node has been unable to open the image stream'; 
            node.error(message, msg);
            return;        
          }  
          stream_buffer(info.path, msg.payload, function () {
          params['images_file'] = fs.createReadStream(info.path);
          performAction(params, feature, actionComplete);
          });
        }); // temp
      } else if (feature=='createClassifier') {   
          var list_params = {};
          var asyncTasks = [];
          for (var k in msg.params)
          {
            prop = k;
            if (prop.indexOf('_examples')>=0)
            {
              // before pushing the function into the task array wrap the push in an IIFE function, passing in the 'prop' parameter
              (function(prop) {

               asyncTasks.push(function (cb) {
                  var buffer = msg.params[prop];
                  temp.open({suffix: '.' + fileType(buffer).ext}, function (err, info) {
                    if (err) {
                      this.status({fill:'red', shape:'ring', text:'unable to open image stream'});          
                      var message ='Node has been unable to open the image stream'; 
                      node.error(message, msg);
                      cb('error in open image');
                    }  
                    stream_buffer(info.path, msg.params[prop], function () {
                      list_params[prop]=fs.createReadStream(info.path);
                      cb(null,"file " + prop + " ready");
                    });
                  }); // temp.open
              }); // asyncTasks.push

              })(prop);

            } else if (prop=='name') {
              list_params[prop]=msg.params[prop];
            }
          } // for
          

          async.parallel(asyncTasks, function(error, results){
            // when all temp local copies are ready, copy of all parameters and request to watson api
            if (error)
            {
              console.log("Parallel ended with error " + error);
              return;
            }
            params = Object.assign (params, list_params);
            performAction(params, feature, actionComplete2);
          });
      }
        else if (feature=='retrieveClassifiersList') { 
          performAction(params, feature, actionComplete2);
      }
        else if (feature =='retrieveClassifierDetails') {
          params['classifier_id']=msg.params['classifier_id'];
          performAction(params, feature, actionComplete2);
      }
        else if (feature=='deleteClassifier') {
        params['classifier_id']=msg.params['classifier_id'];
        performAction(params, feature, actionCompleteDeleteClassifier);

      } else if (urlCheck(msg.payload)) {
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

  RED.nodes.registerType('visual-recognition-v3', WatsonVisualRecognitionV3Node, {
    credentials: {
      apikey: {type:"password"}
    }
  });

RED.nodes.registerType('visual-recognition-util-v3', WatsonVisualRecognitionV3Node, {
    credentials: {
      apikey: {type:"password"}
    }
  });

};
