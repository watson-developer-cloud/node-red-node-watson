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

  function performAction(visualRecognition, params, feature, cbdone) {

    switch(feature)
    {
      case 'classifyImage' : 
        visualRecognition.classify(params, cbdone);
        break;
      case 'detectFaces':
        visualRecognition.detectFaces(params, cbdone);
        break;
      case 'recognizeText':
        visualRecognition.recognizeText(params, cbdone);
        break;
      case 'createClassifier':
        visualRecognition.createClassifier(params, cbdone);
        break;
      case 'retrieveClassifiersList':
        visualRecognition.listClassifiers(params, cbdone);
        break;
      case 'retrieveClassifierDetails':
        visualRecognition.getClassifier(params, cbdone);
        break;
      case 'deleteClassifier':
        visualRecognition.deleteClassifier(params, cbdone);
        break;
    }
  }

  // This is the Watson Visual Recognition V3 Node
  function WatsonVisualRecognitionV3Node (config) {

    RED.nodes.createNode(this, config);
    var node = this;
    var message;
    
    this.on('input', function (msg) 
    {
      // Check which single feature has been requested.
      var feature = config['image-feature'];
      node.status({});
      // so there is at most 1 temp file at a time (did not found a better solution...)
      temp.cleanup(); 

      if (!msg.payload) {
        this.status({fill:'red', shape:'ring', text:'missing payload'}); 
        message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }
      if (feature !== 'retrieveClassifiersList' && feature !== 'retrieveClassifierDetails' 
          && feature !== 'deleteClassifier' && feature !== 'deleteAllClassifiers')
      {
        if (typeof msg.payload === 'boolean' || typeof msg.payload === 'number') 
        {
          this.status({fill:'red', shape:'ring', text:'bad format payload'}); 
          message = 'Bad format : msg.payload must be a URL string or a Node.js Buffer';
          node.error(message, msg);
          return;
        }
      }

      // If it is present the newly provided user entered key 
      // takes precedence over the existing one. 
      apikey = s_apikey || this.credentials.apikey;
      this.status({}); 

      var visualRecognition = watson.visual_recognition({
          api_key: apikey,
          version: 'v3',
          version_date: '2016-05-19'
        });
  
      if (!apikey) {
        this.status({fill:'red', shape:'ring', text:'missing credentials'});          
        message ='Missing Watson Visual Recognition API service credentials'; 
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
          var err_desc = body.images[0].error.description;
          var err_id = body.images[0].error.error_id
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
      }; // actionComplete    

      var actionComplete2 = function(err, body, other) {

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
          msg.result = {};
          msg.result['all'] = body;
          msg.payload='see msg.result'; // to remove any Buffer that could remains
          node.send(msg); 
          node.status({});
        }
      }; // actionComplete2

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
      }; // actionCompleteDeleteClassifier
      
      // If the input is an image, need to stream the input in, giving time for the
      // data to arrive, before invoking the service. 
      node.status({fill:'blue', shape:'dot', text:'Calling '+ feature + ' ...'});
      if (imageCheck(msg.payload)) {
        temp.open({suffix: '.' + fileType(msg.payload).ext}, function (err, info) {
          if (err) {
            this.status({fill:'red', shape:'ring', text:'unable to open image stream'});          
            message ='Node has been unable to open the image stream'; 
            node.error(message, msg);
            return;        
          }  
          stream_buffer(info.path, msg.payload, function () {
          params['images_file'] = fs.createReadStream(info.path);
          if ( msg.params != null && msg.params.classifier_ids != null)
            params['classifier_ids']=msg.params['classifier_ids'];
          if ( msg.params != null && msg.params.owners != null)
            params['owners']=msg.params['owners'];
          if ( msg.params != null && msg.params.threshold != null)
            params['threshold']=msg.params['threshold'];
          performAction(visualRecognition, params, feature, actionComplete);
          });
        }); // temp
      } else if (feature==='createClassifier') {   
          var list_params = {};
          var asyncTasks = [];
          var prop = null;
          for (var k in msg.params)
          {
            prop = k;
            if (prop.indexOf('_examples')>=0)
            {
              // before pushing the function into the task array wrap the push 
              // in an IIFE function, passing in the 'prop' parameter
              (function(prop, list_params, msg) {

               asyncTasks.push(function (callback) {
                  var buffer = msg.params[prop];
                  temp.open({suffix: '.' + fileType(buffer).ext}, function (err, info) {
                    if (err) {
                      this.status({fill:'red', shape:'ring', text:'unable to open image stream'});          
                      var message ='Node has been unable to open the image stream'; 
                      node.error(message, msg);
                      callback('open error on '+prop);
                    }  
                    stream_buffer(info.path, msg.params[prop], function () {
                      list_params[prop]=fs.createReadStream(info.path);
                      callback(null, prop);
                    });
                  }); // temp.open
              }); // asyncTasks.push

              })(prop, list_params, msg);

            } else if (prop==='name') {
              list_params[prop]=msg.params[prop];
            }
          } // for
          

          async.parallel(asyncTasks, function(error, results){
            // when all temp local copies are ready, 
            // copy of all parameters and request to watson api
            //console.log(error, results);
            if (error)
            {
              console.log('createClassifier ended with error ' + error);
              throw error;
            }
            for (p in list_params)
              params[p]=list_params[p];
            performAction(visualRecognition, params, feature, actionComplete2);
          });
      }
        else if (feature==='retrieveClassifiersList') { 
          performAction(visualRecognition, params, feature, actionComplete2);
      }
        else if (feature ==='retrieveClassifierDetails') {
          params['classifier_id']=msg.params['classifier_id'];
          performAction(visualRecognition, params, feature, actionComplete2);
      }
        else if (feature=='deleteClassifier') {
        params['classifier_id']=msg.params['classifier_id'];
        performAction(visualRecognition, params, feature, actionCompleteDeleteClassifier);
      } 
        else if (feature=='deleteAllClassifiers') {
        performDeleteAllClassifiers(visualRecognition, node, msg);
      }

      else if (urlCheck(msg.payload)) {
        params['url'] = msg.payload;
        if ( msg.params != null && msg.params.classifier_ids != null)
            params['classifier_ids']=msg.params['classifier_ids'];
        if ( msg.params != null && msg.params.owners != null)
            params['owners']=msg.params['owners'];
        if ( msg.params != null && msg.params.threshold != null)
            params['threshold']=msg.params['threshold'];
        performAction(visualRecognition, params, feature, actionComplete);
      } else {
        this.status({fill:'red', shape:'ring', text:'payload is invalid'});          
        message ='Payload must be either an image buffer or a string representing a url'; 
        node.error(message, msg);
        return;        
      }

    });
  }


  // This function performs the operation to Delete ALL Dialogs
  function performDeleteAllClassifiers(visualRecognition, node, msg) {

    node.status({fill:'blue', shape:'dot', text:'requesting Delete All classifiers'});

    var params = {};
    visualRecognition.listClassifiers(params, function(err, body, other) {
      node.status({});
      if (err) {
          node.status({fill:'red', shape:'ring', text:'Delete All : call to listClassifiers failed'});
          node.error(err, msg);   
        } else {
          // Array to hold async tasks
          var asyncTasks = [];
          var nb_todelete = body.classifiers.length;
          var nbdeleted = 0;
          body.classifiers.forEach(function (aClassifier) {
              asyncTasks.push(function (cb) {
                var parms = {};
                parms.classifier_id=aClassifier.classifier_id;
                visualRecognition.deleteClassifier(parms, function(err, body, other) {
                if (err) {
                    node.error(err, msg);
                    console.log('Error with the removal of classifier_id '+parms.classifier_id +' : ' +  err);
                    cb('error')
                  } else {
                    console.log('Classifier ID '+ aClassifier.classifier_id + ' deleted successfully.');
                    nbdeleted++;
                  }
                  cb(null,parms.classifier_id);
                });  
              });
          });
        } // else
        async.parallel(asyncTasks, function(error, deleted_list){
          if (deleted_list.length==nb_todelete) {
            msg.payload='see msg.result.error';
            msg.result = 'All custom classifiers have been deleted.';
          }
          else {
            msg.payload='see msg.result.error';
            msg.result = 'Some Classifiers could have not been deleted; See node-RED log for errors.';
          }
          node.send(msg);
          node.status({});           
        });
      });
    }  // delete all func 

  RED.nodes.registerType('visual-recognition-v3', WatsonVisualRecognitionV3Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });

RED.nodes.registerType('visual-recognition-util-v3', WatsonVisualRecognitionV3Node, {
    credentials: {
      apikey: {type:'password'}
    }
  });

};
