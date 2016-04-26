/**
 * Copyright 2013,2016 IBM Corp.
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
  var watson = require('watson-developer-cloud');
  var cfenv = require('cfenv');
  var fs = require('fs');
  var temp = require('temp');

  temp.track();

  var username, password, language_translation;

  var service = cfenv.getAppEnv().getServiceCreds(/language translation/i);

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/service-dialog/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });  

  RED.httpAdmin.get('/watson-translate/models', function (req, res) {
    language_translation = watson.language_translation({
      username: username,
      password: password,
      version: 'v2'
    }); 
    language_translation.getModels({}, function (err, models) {
      if (err) {
        res.json(err);
      }
      else {
        res.json(models);
      }
    });
  });

  RED.httpAdmin.get('/watson-translate/languages', function (req, res) {
    language_translation = watson.language_translation({
      username: username,
      password: password,
      version: 'v2'
    });
    language_translation.getIdentifiableLanguages(null,
      function (err, languages) {
        if (err) {
          res.json(err);
        } else {
          res.json(languages);
        }
      });
  });

  function SMTNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var message = '';

      if (!msg.payload) {
        message = 'Missing property: msg.payload';
        node.error(message, msg)
        return;
      }

      var srclang = msg.srclang || config.srclang;

      if (!srclang) {
        node.warn('Missing source language, message not translated');
        node.send(msg);
        return;
      }

      var destlang = msg.destlang || config.destlang;

      if (!destlang) {
        node.warn('Missing target language, message not translated');
        node.send(msg);
        return;
      }

      var domain = msg.domain || config.domain;

      if (!domain) {
        node.warn('Missing translation domain, message not translated');
        node.send(msg);
        return;
      }

      var action = msg.action || config.action;

      if (!action) {
        node.warn('Missing action, please select one');
        node.send(msg);
        return;
      }

      var filetype = msg.filetype || config.filetype;

      if (!filetype) {
        node.warn('Missing file type, please select one');
        node.send(msg);
        return;
      }

      var trainid = msg.trainid || config.trainid;
      var basemodel = msg.basemodel || config.basemodel;

      username = username || this.credentials.username;
      password = password || this.credentials.password;

      if (!username || !password) {
        this.status({
          fill: 'red',
          shape: 'ring',
          text: 'missing credentials'
        });
        message = 'Missing Language Translation service credentials';
        node.error(message, msg)
        return;
      }

      language_translation = watson.language_translation({
        username: username,
        password: password,
        version: 'v2'
      });

      var model_id = '';
      if(domain === 'news') {
        model_id = srclang + '-' + destlang;
      } else {
        model_id = srclang + '-' + destlang + '-' + domain;
      }
      switch (action) {
      case 'translate':
        this.doTranslate(msg, model_id);
        break;
      case 'train':
        this.doTrain(msg, basemodel, filetype);
        break;
      case 'getstatus':
        this.doGetStatus(msg, trainid);
        break;
      case 'delete':
        this.doDelete(msg, trainid);
        break;
      }
    });

    this.doTranslate = function (msg, model_id) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'requesting'
      });
      language_translation.translate({
        text: msg.payload,
        model_id: model_id
      },
      function (err, response) {
        node.status({})
        if (err) {
          node.error(err, msg);
        } else {
          msg.payload = response.translations[0].translation;
        }
        node.send(msg);
      });
    };

    this.doTrain = function (msg, basemodel, filetype) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'requesting training'
      });

      temp.open({
        suffix: '.xml'
      }, function (err, info) {
        if (!err) {
          fs.write(info.fd, msg.payload);
          var params = {};
          switch (filetype) {
          case 'forcedglossary':
            params = {
              name: msg.filename.replace(/[^0-9a-z]/gi, ''),
              base_model_id: basemodel,
              forced_glossary: fs.createReadStream(info.path)
            };
            break;
          case 'parallelcorpus':
            params = {
              name: msg.filename.replace(/[^0-9a-z]/gi, ''),
              base_model_id: basemodel,
              parallel_corpus: fs.createReadStream(info.path)
            };
            break;
          case 'monolingualcorpus':
            params = {
              name: msg.filename.replace(/[^0-9a-z]/gi, ''),
              base_model_id: basemodel,
              monolingual_corpus: fs.createReadStream(info.path)
            };
            break;
          }
          // Watson SDK call
          language_translation.createModel(params,
            function (err, model) {
              node.status({});
              if (err) {
                node.status({
                  fill: 'red',
                  shape: 'ring',
                  text: 'call to translation service failed'
                });
                node.error(err, msg);
              } else {
                node.status({
                  fill: 'green',
                  shape: 'dot',
                  text: 'model sent to training'
                });
                msg.payload = 'Model ' + model.name + ' successfully sent for training with id: ' + model.model_id;
                node.send(msg);
                node.status({});
              }
            });
        }
      });
    }

    this.doGetStatus = function(msg, trainid) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'requesting status'
      });

      language_translation.getModel({ model_id: trainid},
        function(err, model) {
          node.status({});
          if (err) { 
            node.status({
              fill: 'red',
              shape: 'ring',
              text: 'call to translation service failed'
            });
            node.error(err, msg);
          } else {
            msg.payload = model.status;
            node.send(msg);
            node.status({});
          }
        }
      );
    }

    this.doDelete = function(msg, trainid) {
      node.status({
        fill: 'blue',
        shape: 'dot',
        text: 'deleting'
      });

      language_translation.deleteModel({ model_id: trainid},
        function(err) {
          node.status({});
          if (err) { 
            node.status({
              fill: 'red',
              shape: 'ring',
              text: 'could not delete'
            });
            node.error(err, msg);
          } else {
            msg.payload = "model deleted";
            node.send(msg);
            node.status({});
          }
        }
      );      
    }
  }

  RED.nodes.registerType('watson-translate', SMTNode, {
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
