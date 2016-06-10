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

  var apikey, sAPIKey;

  var service = cfenv.getAppEnv().getServiceCreds(/visual recognition/i);

  if (service) {
    sAPIKey = service.apikey;
  }

  RED.httpAdmin.get('/watson-visual-recognition/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });
 
  function imageCheck(data) {
    return data instanceof Buffer && imageType(data) !== null;
  }

  function urlCheck(str) {
    var parsed = url.parse(str);
    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
  }

  function stream_buffer(file, contents, cb) {
    fs.writeFile(file, contents, function (err) {
      if (err) {
        throw err;
      }
      cb();
    });
  }

  function verifyPayload(node, msg) {
    if (!msg.payload) {
      this.status({fill:'red', shape:'ring', text:'missing payload'}); 
      node.error('Missing property: msg.payload', msg);
      return false;
    }
    return true;
  }

  function verifyInputs(feature, node, msg) {
    var b=true;
    switch(feature) {
      case 'classifyImage':
      case 'detectFaces':
      case 'recognizeText':
        if (typeof msg.payload === 'boolean' || typeof msg.payload === 'number') {
          this.status({fill:'red', shape:'ring', text:'bad format payload'}); 
          var message = 'Bad format : msg.payload must be a URL string or a Node.js Buffer';
          node.error(message, msg);
          return false;
        }
    }
    return b;
  }

  function verifyServiceCredentials(node, msg) {
      // If it is present the newly provided user entered key 
      // takes precedence over the existing one. 
      node.apikey = sAPIKey || node.credentials.apikey;
      if (!node.apikey) {
        node.status({fill:'red', shape:'ring', text:'missing credentials'});          
        var message ='Missing Watson Visual Recognition API service credentials'; 
        node.error(message, msg);
        return false;
      }
      node.service = watson.visual_recognition({
        api_key: node.apikey,
        version: 'v3',
        version_date: '2016-05-19'
      });
      return true;
  }


  function processResponse(err, body, feature, node, msg) {
    console.log('',err, body);
    if (err != null && body==null)
    {
      node.status({fill:'red', shape:'ring', 
        text:'call to watson visual recognition v3 service failed'}); 
      msg.result = {};
      if (err.code==null)
      {
        msg.result['error']=err;
      } else {
        msg.result['error_code']= err.code;
        if (!err.error) {
          msg.result['error']= err.error;
        }        
      }
      node.error(err);
      return;
    }
    else if (err == null && body != null && body.images != null && 
      body.images[0].error)
    {
      var errDesc = body.images[0].error.description;
      var errId = body.images[0].error.error_id;
      node.status({fill:'red', shape:'ring', 
                   text:'call to watson visual recognition v3 service failed'}); 
      msg.result = {};
      msg.result['error_id']= errId;
      msg.result['error']= errDesc;
      console.log('Error:', errDesc);
      msg.payload='see msg.result.error';
      node.send(msg); 
    }
    else {
      if (feature === 'deleteClassifier')
      {
        msg.result = 'Successfully deleted classifier_id: '+ msg.params.classifier_id ;
      } else {
        msg.result = body;
      }
      msg.payload='see msg.result'; // to remove any Buffer that could remains
      node.send(msg); 
      node.status({});
    }
  }

function prepareParamsCommon(params, node, msg, cb) {
  var message;
  if (imageCheck(msg.payload)) {
    // process 1,2,3 in buffer mode
    temp.open({suffix: '.' + fileType(msg.payload).ext}, function (err, info) {
      if (err) {
        this.status({fill:'red', shape:'ring', text:'unable to open image stream'});          
        message ='Node has been unable to open the image stream'; 
        node.error(message, msg);
        return;        
      }  
      stream_buffer(info.path, msg.payload, function () {
        params['images_file'] = fs.createReadStream(info.path);
        if (msg.params != null && msg.params.classifier_ids != null)
          params['classifier_ids']=msg.params['classifier_ids'];
        if (msg.params != null && msg.params.owners != null)
          params['owners']=msg.params['owners'];
        if (msg.params != null && msg.params.threshold != null)
          params['threshold']=msg.params['threshold'];
        cb();
        });
      }); // temp.open
  } else if (urlCheck(msg.payload)) {
    params['url'] = msg.payload;
    if (msg.params != null && msg.params.classifier_ids != null)
        params['classifier_ids']=msg.params['classifier_ids'];
    if (msg.params != null && msg.params.owners != null)
        params['owners']=msg.params['owners'];
    if (msg.params != null && msg.params.threshold != null)
        params['threshold']=msg.params['threshold'];
      cb();
  } else {
    console.log('else');
    node.status({fill:'red', shape:'ring', text:'payload is invalid'});          
    message ='Payload must be either an image buffer or a string representing a url'; 
    node.error(message, msg);
    return;
  }
}


function prepareParamsCreateClassifier (params, node, msg, cb) {
  var listParams = {};
  var asyncTasks = [];
  var prop = null;
  for (var k in msg.params)
  {
    prop = k;
    if (prop.indexOf('_examples')>=0)
    {
      // before pushing the function into the task array wrap the push 
      // in an IIFE function, passing in the 'prop' parameter
      (function(prop, listParams, msg) {

       asyncTasks.push(function (callback) {
          var buffer = msg.params[prop];
          temp.open({suffix: '.' + fileType(buffer).ext}, function (err, info) {
            if (err) {
              this.status({fill:'red', shape:'ring', 
                           text:'unable to open image stream'});          
              var message ='Node has been unable to open the image stream'; 
              node.error(message, msg);
              return callback('open error on '+prop);
            }  
            stream_buffer(info.path, msg.params[prop], function () {
              listParams[prop]=fs.createReadStream(info.path);
              callback(null, prop);
            });
          }); // temp.open
      }); // asyncTasks.push

      })(prop, listParams, msg);

    } else if (prop==='name') {
      listParams[prop]=msg.params[prop];
    }
  } // for
  async.parallel(asyncTasks, function(error, results){
    // when all temp local copies are ready, 
    // copy of all parameters and request to watson api
    if (error)
    {
      console.log('createClassifier ended with error ' + error);
      throw error;
    }
    for (p in listParams)
      params[p]=listParams[p];
    cb();
  });
  }

  function performDeleteAllClassifiers(params, node, msg) {
    //var params = {};
    node.service.listClassifiers(params, function(err, body) {
      node.status({});
      if (err) {
        node.status({fill:'red', shape:'ring', 
          text:'Delete All : call to listClassifiers failed'});
        node.error(err, msg);   
      } else {
        // Array to hold async tasks
        var asyncTasks, nbTodelete, nbdeleted;
        asyncTasks = [];
        nbTodelete = body.classifiers.length;
        nbdeleted = 0;
        body.classifiers.forEach(function (aClassifier) {
          asyncTasks.push(function (cb) {
            var parms = {};
            parms.classifier_id=aClassifier.classifier_id;
            node.service.deleteClassifier(parms, function(err, body) {
              if (err) {
                node.error(err, msg);
                console.log('Error with the removal of classifier_id '
                  +parms.classifier_id +' : ' +  err);
                return cb('error');
              } else {
                console.log('Classifier ID '+ aClassifier.classifier_id 
                  + ' deleted successfully.');
                nbdeleted++;
              }
              cb(null,parms.classifier_id);
            });  
          });
        });      
        async.parallel(asyncTasks, function(error, deletedList){
          if (deletedList.length===nbTodelete) {
            msg.payload='see msg.result.error';
            msg.result = 'All custom classifiers have been deleted.';
          } else {
            msg.payload='see msg.result.error';
            msg.result = 'Some Classifiers could have not been deleted;'
            +'See log for errors.';
          }
          node.send(msg);
          node.status({});           
        });
        } // else
    }); // list classifiers
  }  // delete all func 

  function executeService(feature, params, node, msg) {
    node.status({fill:'blue', shape:'dot', text:'Calling '+ feature + ' ...'});
    switch(feature) {
      case 'classifyImage':
        prepareParamsCommon(params, node, msg, function () {
          node.service.classify(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
          });
        });
        break;
      case 'detectFaces':
        prepareParamsCommon(params, node, msg, function () {
          node.service.detectFaces(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
          });
        });
        break;
      case 'recognizeText':
        prepareParamsCommon(params, node, msg, function () {
          node.service.recognizeText(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
          });
        });
        break;
      case 'createClassifier':
        prepareParamsCreateClassifier(params, node, msg, function () {
          node.service.createClassifier(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
          });
        });
        break;
      case 'retrieveClassifiersList':
        node.service.listClassifiers(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
        });
        break;
      case 'retrieveClassifierDetails':
        params['classifier_id']=msg.params['classifier_id'];
        node.service.getClassifier(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
        });
        break;
      case 'deleteClassifier':
        params['classifier_id']=msg.params['classifier_id'];
        node.service.deleteClassifier(params, function(err, body, other) {
            processResponse(err,body,feature,node,msg);
        });
        break;
      case 'deleteAllClassifiers':
        performDeleteAllClassifiers(params,node, msg);
        break;
    }
  }





  // This is the Watson Visual Recognition V3 Node
  function WatsonVisualRecognitionV3Node (config) {
    var node = this;
    var b;
    var feature = config['image-feature'];
    RED.nodes.createNode(this, config);
    node.on('input', function (msg) {
      var params = {};
      node.status({});
      // so there is at most 1 temp file at a time (did not found a better solution...)
      temp.cleanup(); 

      b=verifyPayload(node, msg);
      if (!b) {return;}
      b=verifyInputs(node, msg);
      if (!b) {return;}
      b=verifyServiceCredentials(node, msg);
      if (!b) {return;}
      executeService(feature,params,node,msg);
  });
}
  
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
