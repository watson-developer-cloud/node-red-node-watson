/**
 * Copyright 2013,2016 IBM Corp.
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

module.exports = function (RED) {
  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then they are stored in sUsername and sPassword, as the
  // service credentials. This separation from sUsername and username to allow
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.
  var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2'),
    cfenv = require('cfenv'),
    fs = require('fs'),
    temp = require('temp'),
    username = null,
    password = null,
    sUsername = null,
    sPassword = null,
    service = cfenv.getAppEnv().getServiceCreds(/language translator/i),
    endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

process.env.VCAP_SERVICES='{"VCAP_SERVICES":{"cloudantNoSQLDB":[{"credentials":{"host":"c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix.cloudant.com","password":"a955edbb1be6105dae540a26bc1cc7a71f3b46f056a4db8896de6dc5b33cde61","port":443,"url":"https://c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix:a955edbb1be6105dae540a26bc1cc7a71f3b46f056a4db8896de6dc5b33cde61@c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix.cloudant.com","username":"c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix"},"label":"cloudantNoSQLDB","name":"sample-node-red-cloudantNoSQLDB","plan":"Shared","provider":null,"syslog_drain_url":null,"tags":["data_management","ibm_created","ibm_dedicated_public"]}],"language_translator":[{"credentials":{"password":"z2uy1MUCBdp5","url":"https://gateway.watsonplatform.net/language-translator/api","username":"1d6d5991-8f9a-41db-9e2f-a35faf644953"},"label":"language_translator","name":"Language Translator-di","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}],"speech_to_text":[{"credentials":{"password":"wr0QZQHpmqeE","url":"https://stream.watsonplatform.net/speech-to-text/api","username":"92b657d6-79b3-4602-bcf3-4224754cda84"},"label":"speech_to_text","name":"Speech to Text-qe","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}],"text_to_speech":[{"credentials":{"password":"vKsiaNBfORVs","url":"https://stream.watsonplatform.net/text-to-speech/api","username":"8f7c2c38-d8ea-407f-8fb0-13682ddef14f"},"label":"text_to_speech","name":"Text to Speech-cx","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}]}}';
vcap = JSON.parse(process.env.VCAP_SERVICES || "{}");
console.log('vcap: '+ JSON.stringify(vcap));
service = vcap["VCAP_SERVICES"]["language_translator"];
console.log('service: '+ JSON.stringify(service));

  temp.track();


  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-translator/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  // API used by widget to fetch available models
  RED.httpAdmin.get('/watson-translator/models', function (req, res) {
    var lt = null;

    if(!username && !password) {
      lt = new LanguageTranslatorV2({
        username: req.query.un,
        password: req.query.pwd,
        version: 'v2',
        url: endpointUrl
      });
    } else {
      lt = new LanguageTranslatorV2({
        username: username,
        password: password,
        version: 'v2',
        url: endpointUrl
      });
    }
    lt.getModels({}, function (err, models) {
      if (err) {
        res.json(err);
      }
      else {
        res.json(models);
      }
    });
  });


  // This is the Language Translation Node.
  // The node supports four modes
  //
  // 1. translate, for which it will specify a domain, obtained from the available models
  //    along with source and target languages. The node will have only displayed
  //    available translations for the model / domain
  // 2. train, for which a glossary file is required.
  // 3. status, to determine whethere a trained corpus is available
  // 4. delete, to remove a trained corpus extension.

  function SMTNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    // The dynamic nature of this node has caused problems with the password field. it is
    // hidden but not a credential. If it is treated as a credential, it gets lost when there
    // is a request to refresh the model list.
    // Credentials are needed for each of the modes.

    username = sUsername || this.credentials.username;
    password = sPassword || this.credentials.password || config.password;

    // The node has received an input as part of a flow, need to determine
    // what the request is for, and based on that if the required fields
    // have been provided.
    this.on('input', function (msg) {
      var message = '',
        action = msg.action || config.action,
        globalContext = this.context().global,
        tmpmodel_id = globalContext.get('g_model_id'),
        result = '',
        language_translator = new LanguageTranslatorV2({
          username: username,
          password: password,
          version: 'v2',
          url: endpointUrl
        });

      if (!username || !password) {
        message = 'Missing Watson Language Translator service credentials';
        node.error(message, msg);
        return;
      }

      if (!action) {
        node.warn('Missing action, please select one');
        node.send(msg);
        return;
      }

      // checkbox option
      if (config.lgparams2 === false) {
        if (tmpmodel_id.length > 1) {
          result = tmpmodel_id.split('-');
          msg.model_id = tmpmodel_id;
          msg.srclang = result[0];
          msg.destlang = result[1];
        } else {
          msg.model_id = config.domain;
          msg.srclang = config.srclang;
          msg.destlang = config.destlang;
        }
      } else {
        msg.model_id = config.domain;
        msg.srclang = config.srclang;
        msg.destlang = config.destlang;
      }

      // These are var functions that have been initialised here, so that
      // they are available for the instance of this node to use.
      // Tried to make these protoypes, but couldn't get them to be
      // invokedd. So instead have opted to go for vars.

      // If a translation is requested, then the model id will have been
      // built by the calling function based on source, target and domain.
      var doTranslate = function(msg, model_id){
        node.status({
          fill: 'blue',
          shape: 'dot',
          text: 'requesting'
        });

        // Please be careful when reading the below. The first parameter is
        // a structure, and the tabbing enforced by codeacy imho obfuscates
        // the code, rather than making it clearer. I would have liked an
        // extra couple of spaces.
        language_translator.translate({
          text: msg.payload,
          model_id: model_id
        },
        function (err, response) {
          node.status({});
          if (err) {
            node.error(err, msg);
            console.log('err:', err);
          } else {
            msg.translation = {};
            msg.translation.response = response;
            msg.payload = response.translations[0].translation;
          }
          node.send(msg);
        });
      };

      // If training is requested then the glossary will be a file input. We are using temp
      // to sync up the fetch of the file input stream, before invoking the train service.
      var doTrain = function(msg, model_id, filetype){
        node.status({
          fill: 'blue',
          shape: 'dot',
          text: 'requesting training'
        });

        temp.open({
          suffix: '.xml'
        }, function(err, info){
          if (!err) {
            fs.write(info.fd, msg.payload);
            var params = {};
            // only letters and numbers allowed in the submitted file name
            params.name = msg.filename.replace(/[^0-9a-z]/gi, '');
            params.base_model_id = model_id;
            switch (filetype) {
            case 'forcedglossary':
              params.forced_glossary = fs.createReadStream(info.path);
              break;
            case 'parallelcorpus':
              params.parallel_corpus = fs.createReadStream(info.path);
              break;
            case 'monolingualcorpus':
              params.monolingual_corpus = fs.createReadStream(info.path);
              break;
            }

            language_translator.createModel(params,
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
                    text: 'model submitted for training'
                  });
                  msg.payload = 'Model ' + model.name + ' successfully sent for training with id: ' + model.model_id;
                  msg.trained_model_id = model.model_id;
                  node.send(msg);
                  node.status({});
                }
              }
            );
          }
        });
        node.status({ });
      };

      // Fetch the status of the trained model. It can only be used if the model is available. This
      // will also return any training errors. The full error reason is returned in msg.translation
      var doGetStatus = function (msg, trainid) {
        node.status({
          fill: 'blue',
          shape: 'dot',
          text: 'requesting status for model ' + trainid,
        });

        language_translator.getModel(
          {
            model_id: trainid,
          },
          function (err, model) {
            if (err) {
              node.status({
                fill: 'red',
                shape: 'ring',
                text: 'call to translation service failed'
              });
              node.error(err, msg);
            } else {
              msg.payload = model.status;
              msg.translation = model;
              node.send(msg);
              node.status({});
            }
          }
        );
        node.status({});
      };

      // This removes the trained corpus
      var doDelete = function (msg, trainid) {
        node.status({
          fill: 'blue',
          shape: 'dot',
          text: 'deleting model ' + trainid,
        });

        language_translator.deleteModel(
          {
            model_id: trainid,
          },
          function (err) {
            if (err) {
              node.status({
                fill: 'red',
                shape: 'ring',
                text: 'delete failed'
              });
              node.error(err, msg);
            } else {
              msg.payload = 'Model ' + trainid + ' has been deleted';
              node.send(msg);
              node.status({});
            }
          }
        );
        node.status({});
      };

      // Now that the do functions have been defined, can now determine what action this node
      // is configured for.

      if (!msg.payload) {
        message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      // We have credentials, and know the mode. Further required fields checks
      // are specific to the requested action.
      // The required fields are checked, before the relevant function is invoked.
      switch (action) {
      case 'translate':

        var domain = msg.domain || config.domain;

        if (!domain) {
          node.warn('Missing translation domain, message not translated');
          node.send(msg);
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

        var model_id = '';

        model_id = srclang + '-' + destlang;
        if (domain !== 'news') {
          model_id += ('-' + domain);
        }
        doTranslate(msg, model_id);
        break;

      case 'custom':
        var custom = msg.custom || config.custom;

        if (!custom) {
          node.warn('Missing customised model, message not translated');
          node.send(msg);
          return;
        }
        doTranslate(msg, custom);
        break;

      case 'train':
        var basemodel = msg.basemodel || config.basemodel;

        if (!basemodel) {
          node.warn('Base Model needs must be set for train mode');
          node.send(msg);
        }

        var filetype = msg.filetype || config.filetype;

        if (!filetype) {
          node.warn('Filetype needs must be set for train mode');
          node.send(msg);
        }
        doTrain(msg, basemodel, filetype);
        break;

      case 'getstatus':
        var trainid = msg.trainid || config.trainid;

        doGetStatus(msg, trainid);
        break;

      case 'delete':
        var d_trainid = msg.trainid || config.trainid;

        doDelete(msg, d_trainid);
        break;

      default:
        message = 'Unexpected Mode';
        node.status({
          fill: 'blue',
          shape: 'dot',
          text: message
        });
        node.error(message, msg);
      }
    });
  }

  RED.nodes.registerType('watson-translator', SMTNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
