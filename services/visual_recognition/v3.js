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
      console.log('debug4');
      cb();
    });
  };

  // Utility function that performs the Watson Visual Recognition call. 
  // the cleanup removes the temp storage, and I am not sure whether 
  // it should be called here or after alchemy returns and passed
  // control back to cbdone.

  function performAction(params, feature, cbdone) {

    //console.log("params: ", params);
    //console.log("feature: ", feature);

        var visual_recognition = watson.visual_recognition({
          api_key: apikey,
          version: 'v3',
          version_date: '2016-05-19'
        });

    if (feature == 'classifyImage')
    {
      visual_recognition.classify(params, cbdone);
    } else if (feature == 'detectFaces') {
      visual_recognition.detectFaces(params, cbdone);
    } else if (feature == 'recognizeText') {
      visual_recognition.recognizeText(params, cbdone);
    } else if (feature == 'createClassifier') {
      console.log("calling  createClassifier ")
      visual_recognition.createClassifier(params, cbdone);
    } else if (feature == 'retrieveClassifiersList') {
      visual_recognition.listClassifiers(params, cbdone);
    } else if (feature == 'retrieveClassifierDetails') {
      visual_recognition.getClassifier(params, cbdone);
    } else if (feature == 'deleteClassifier') {
      visual_recognition.deleteClassifier(params, cbdone);
    }

  }


  // This is the Watson Visual Recognition V3 Node
  function WatsonVisualRecognitionV3Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {

      node.status({});
      temp.cleanup(); // so there is at most 1 temp file at a time (did not found a better solution...)

      if (!msg.payload) {
        this.status({fill:'red', shape:'ring', text:'missing payload'}); 
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

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

      // Check which single feature has been requested.
      var feature = config["image-feature"];

      var params = {};

      // This is the callback after the call to the watson service.    
      // Set up as a var within this scope, so it has access to node, msg etc. 
      // in preparation for the Watson service action       
      var actionComplete = function(res, body, other) {

        //if (err || keywords.status === 'ERROR') {
        if (body.images[0].error) {
          err = body.images[0].error.description;
          err_id = body.images[0].error.error_id

          node.status({fill:'red', shape:'ring', text:'call to watson visual recognition v3 service failed'}); 
          msg.result = {};
          msg.result['error_id']= err_id;
          msg.result['error']= err;
          console.log('Error:', err);
          msg.payload='see msg.result.error';
          node.send(msg); 
        }
        else {
          //msg.result = keywords[FEATURE_RESPONSES[feature]] || [];
          msg.result = {};
          msg.result['all'] = body;
          msg.payload='see msg.result'; // to remove any Buffer that could remains
          node.send(msg); 
          node.status({});
        }
      }        
      
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
          //console.log('debug1');
          stream_buffer(info.path, msg.payload, function () {
            console.log('debug2: temp file size: ' + fs.statSync(info.path).size);
            params['images_file'] = fs.createReadStream(info.path);

            //console.log('info object : ', info);
            // TODO : debug why aectivating temp.cleanup is making failing of every POST classify, detectFaces, etc ..
            performAction(params, feature, actionComplete);
          });

        });
      } else if (feature=='createClassifier') {
        // copy all msg.params properties in params
          //for (var k in msg.params)
          //  params[k]=msg.params[k];
          params = Object.assign (params, msg.params);
          console.log("HERE assign" , params);
          performAction(params, feature, actionComplete);
      }
        else if (feature=='retrieveClassifiersList') { 
          performAction(params, feature, actionComplete);
      }
        else if (feature =='retrieveClassifierDetails') {
          performAction(params, feature, actionComplete);
      }
        else if (feature=='deleteClassifier') {

        performAction(params, feature, actionComplete);

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
