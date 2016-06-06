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

module.exports = function (RED) {
  var request = require('request');
  var cfenv = require('cfenv');
  var temp = require('temp');
  var url = require('url');
  var fs = require('fs');  
  var fileType = require('file-type');
  var watson = require('watson-developer-cloud');

  var service = cfenv.getAppEnv().getServiceCreds(/speech to text/i);

  // Require the Cloud Foundry Module to pull credentials from bound service 
  // If they are found then the username and password will be stored in 
  // the variables sUsername and sPassword. 
  //
  // This separation between sUsername and username is to allow 
  // the end user to modify the credentials when the service is not bound.
  // Otherwise, once set credentials are never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  var username, password, sUsername, sPassword;

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }


  // temp is being used for file streaming to allow the file to arrive so it can be processed. 
  temp.track();


  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
  // credentials, and also translation models. This allows the node to keep up to 
  // date with new tranlations, without the need for a code update of this node. 

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-speech-to-text/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


   // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-speech-to-text/models', function (req, res) {
    var stt = watson.speech_to_text({
      username: username ? username : req.query.un,   
      password: password ? password : req.query.pwd, 
      version: 'v1',
      url: 'https://stream.watsonplatform.net/speech-to-text/api'
    });

    stt.getModels({}, function(err, models){
      if (err) {
        res.json(err);
      } else {
        res.json(models);
      }
    });          
  });

  // Utility function to perform a URL validation check
  function urlCheck(str) {
    var parsed = url.parse(str);

    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
  }

  // Function that is syncing up the asynchronous nature of the stream
  // so that the full file can be sent to the API. 
  var stream_buffer = function(file, contents, cb) {
    fs.writeFile(file, contents, function (err) {
      if (err) throw err;
      cb(fileType(contents).ext);
    });
  };


  // Function that is syncing up the asynchronous nature of the stream
  // so that the full file can be sent to the API. 
  var stream_url = function(file, url, cb) {
    var wstream = fs.createWriteStream(file);

    wstream.on('finish', function () {
      fs.readFile(file, function (err, buf) {
        if (err) {
          throw err;
        }
        cb(fileType(buf).ext);
      });
    });

    request(url).pipe(wstream);
  };

  // This is the Speech to Text Node

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {

      // This section is for var functions that will be called, in context with
      // msg, when the input stream has been received.  

      // This is the callback after the call to the speech to text service.    
      // Set up as a var within this scope, so it has access to node, msg etc.       
      var actionComplete = function(err, data) {
        if (err || data.status === 'ERROR') {
          node.status({fill:'red', shape:'ring', text:'call to speech to text service failed'}); 
          node.error(err, msg);
        } else {
          var r = data.results; 

          msg.transcription = '';
          if (r) {
            if (r.length && r[0].alternatives.length) {
              msg.fullresult = r;
            } 
            msg.transcription = '';
            r.forEach(function(a){
              // console.log(a.alternatives);
              a.alternatives.forEach(function(t){
                msg.transcription += t.transcript;
              });
            });   
          }
          node.send(msg); 
        }        
      };  


      // Utility function that performs the speech to text service call. 
      // the cleanup removes the temp storage, and I am not sure whether 
      // it should be called here or after the service returns and passed
      // control back to cbdone.
      function performAction(audio, format, cbdone, cbcleanup) {
        var speech_to_text = watson.speech_to_text({
          username: username,
          password: password,
          version: 'v1',
          url: 'https://stream.watsonplatform.net/speech-to-text/api'
        });    

        // If we get to here then the audio is in one of the supported formats. 
        if (format === 'ogg') { 
          format += ';codecs=opus';
        }

        var model = config.lang + '_' + config.band;

        var params = {
          audio: audio,
          content_type: 'audio/' + format,
          model: model,
          continuous: config.continuous
        };

        node.status({fill:'blue', shape:'dot', text:'requesting'});

        // Everything is now in place to invoke the service 
        speech_to_text.recognize(params, function (err, res) {
          node.status({});
          cbdone(err,res);
          if (cbcleanup) {
            cbcleanup();
          }
        });

        if (cbcleanup) {
          cbcleanup();
        }
      }


      // The functions have now been defined, and will be within the context
      // of the config.
      // Now perform checks on the input and parameters, to make sure that all
      // is in place before the service is invoked.

      var message = '';

      // Credentials are needed for the service. They will either be bound or
      // specified by the user in the dialog. 
      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password; 

      if (!username || !password) {
        var message_err_credentials = 'Missing Speech To Text service credentials';

        node.error(message_err_credentials, msg);
        return;
      }  

      if (!config.lang) {
        var message_err_lang = 'Missing audio language configuration, unable to process speech.';

        node.error(message_err_lang, msg);
        return;
      }

      if (!config.band) {
        var message_err_band = 'Missing audio quality configuration, unable to process speech.';

        node.error(message_err_band, msg);
        return;
      }  

      // Has to be there, as its a checkbox, but flows switching from the old (frankly 
      // unbeliveable) select might not have it set.
      if (!config.continuous) {
        var message_err_continuous = 'Missing continuous details, unable to process speech.';

        node.error(message_err_continuous, msg);
        return;
      }  

      // The input comes in on msg.payload, and can either be an audio file or a string 
      // representing a URL.  
      if (!msg.payload instanceof Buffer || !typeof msg.payload === 'string') {
        message = 'Invalid property: msg.payload, can only be a URL or a Buffer.';

        node.error(message, msg);
        return;
      }

      // This check is repeated just before the call to the service, but 
      // its also performed here as a double check. 
      if (!(msg.payload instanceof Buffer)) {
        if (typeof msg.payload === 'string' && !urlCheck(msg.payload)) {
          message = 'Invalid URL.';

          node.error(message, msg)
          return;
        }
      } else {
        var f = fileType(msg.payload).ext;

        switch (f) {
        case 'wav':
        case 'flac':
        case 'ogg':
          break;
        default:
          var message_err_format 
              = 'Audio format (' + f + ') not supported, must be encoded as WAV, FLAC or OGG.';

          node.error(message_err_format, msg);
          return;  
        }
      }  

      // We are now ready to process the input data 
      // If its a buffer then need to read it all before invoking the service 
      if (msg.payload instanceof Buffer) {
        temp.open({suffix: '.' + fileType(msg.payload).ext}, function (err, info) {
          if (err) {
            this.status({fill:'red', shape:'ring', text:'unable to open audio stream'});          
            message = 'Node has been unable to open the audio stream'; 

            node.error(message, msg);
            return;        
          }  

          stream_buffer(info.path, msg.payload, function (format) {
            var audio = fs.createReadStream(info.path);

            performAction(audio, format, actionComplete, temp.cleanup);        
          });
        });
      } else if (urlCheck(msg.payload)) {
        temp.open({suffix: '.audio'}, function(err, info){
          if (err) {
            this.status({fill:'red', shape:'ring', 
              text:'unable to open url audio stream'});          
            message = 'Node has been unable to open the url audio stream'; 

            node.error(message, msg);
            return;        
          }  

          stream_url(info.path, msg.payload, function (format) {
            var audio = fs.createReadStream(info.path);

            performAction(audio, format, actionComplete, temp.cleanup);        
          });
        });
      } else {
        this.status({fill:'red', shape:'ring', text:'payload is invalid'});          
        message = 'Payload must be either an audio buffer or a string representing a url'; 
        node.error(message, msg);
        return;        
      }


    });  
  }

  RED.nodes.registerType('watson-speech-to-text', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};