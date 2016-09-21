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

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then they are stored in sUsername and sPassword, as the
  // service credentials. This separation from sUsername and username to allow
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  // Not ever used, and codeacy complains about it.
  // var services = cfenv.getAppEnv().services;

  var username = null, password = null, sUsername = null, sPassword = null;

  var service = cfenv.getAppEnv().getServiceCreds(/language translation/i)

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-translate-util/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
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


    // this does nothing, but am keeping it with a commented out signature, as
    // it might come in handy in the future.
    this.on('close', function() {
    });


    // The node has received an input as part of a flow, need to determine
    // what the request is for, and based on that if the required fields
    // have been provided.
    this.on('input', function (msg) {

      var message = '';

      if (!username || !password) {
        message = 'Missing Language Translation service credentials';
        node.error(message, msg);
        return;
      }

      lt = watson.language_translator({
        username: username,
        password: password,
        version: 'v2'
      });

      // set global variable in order to make them accessible for the tranlsation node
      var globalContext = this.context().global;

      globalContext.set("g_domain","");
      globalContext.set("g_src","");
      globalContext.set("g_dest","");
      globalContext.set("g_model_id","");


      ////////// ---- UTILITY FUNCTIONS ----------------------------
      // this functions creates a N dimensional array
      // it will be used in order to make an array of arrays from the wanted options to populate a dashboard dropdown list
      // the entries of the array to be created would be 'domains', 'model_id', 'source' & 'target
      function createArray(length) {

          var arr = new Array(length || 0);
          var j = length;

          if (arguments.length > 1) {
              var args = Array.prototype.slice.call(arguments, 1);
              while(j--) arr[length-1 - j] = createArray.apply(this, args);
          }
          return arr;
      };


      function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
      };
      String.prototype.capitalize = function() {
          return this.charAt(0).toUpperCase() + this.slice(1);
      };


      function makeLanguageBeautifier(string) {
        var strLang = '';
        switch (string) {

            case 'es':
              strLang = 'Spanish';
              break;

            case 'ar':
              strLang = 'Arabic';
              break;

            case 'arz':
              strLang = 'Spoken Arabic';
              break;

            case 'en':
              strLang = 'English';
              break;

            case 'fr':
              strLang = 'French';
              break;

            case 'it':
              strLang = 'Italian';
              break;

            case 'zh':
              strLang = 'Chinese';
              break;

            case 'ko':
              strLang = 'Korean';
              break;

            case 'pt':
              strLang = 'Portuguese';
              break;

            case 'de':
              strLang = 'German';
              break;

            default:
              strLang = '';
              break;
        }
        return strLang;
      };
      ////////// ---- END OF UTILITY FUNCTIONS ----------------------------


      if (lt) {

          lt.getModels({},function (err, models ){
            if (err) {
              node.error(err,msg);
            }
            else {


              msg.payload = models;

              // Debug options to show the whole 'models' object
              //console.log(models);


              //////////////////////////////////////////////////////////////////////////////
              // the overall array would be used to populate the dropdown list
              var dropdown_array = [];
              var domain_src_target_model = {};
              //var domain_src_target_model = [];
              var domain_src_target = '', sTmp = '', sTmp2 = '', sTmp3 = '';
              msg.options_dropdown = {};
              msg.dropdown_object = {};

              // Populating 'DOMAIN's into an array which would be returned by the msg object
              var ldom = []; // domains array
              msg.options_ldom = {};
              msg.domains = {};

              // Populating 'model_id' into an array which would be returned by the msg object
              var model_id_array = []; // model_id array
              msg.options_model_id = {};
              msg.model_id_obj = {};

              // Populating 'source's into an array which would be returned by the msg object
              var src_lang_array = []; // source language array
              msg.options_src_lang = {};
              msg.src_lang_object = {};

              // Populating 'target's into an array which would be returned by the msg object
              var target_lang_array = []; // dest language array
              msg.options_target_lang = {};
              msg.target_lang_object = {};


              for (var i=0; i < msg.payload.models.length; i++) {
                    ldom[i] = msg.payload.models[i].domain;               // domains array
                    ldom[i] = ldom[i].capitalize();
                    model_id_array[i] = msg.payload.models[i].model_id;   // model_id array
                    src_lang_array[i] = msg.payload.models[i].source;     // source language array
                    src_lang_array[i] = makeLanguageBeautifier(src_lang_array[i]);
                    target_lang_array[i] = msg.payload.models[i].target;  // target language array
                    target_lang_array[i] = makeLanguageBeautifier(target_lang_array[i]);

                    sTmp3 = makeLanguageBeautifier(target_lang_array[i]);

                    domain_src_target = ldom[i] + ', ' + src_lang_array[i] + ', ' + target_lang_array[i];
                    domain_src_target_model = ldom[i] + ', ' + src_lang_array[i] + ', ' + target_lang_array[i] + ', ' + model_id_array[i];
                    
                    //var j = {}
                    //j[domain_src_target] = model_id_array[i];
                   	// for later when the DropDown key:value issue is resolved
                   	//domain_src_target_model.push(j);
                   	//console.log('domain_src_target_model:', domain_src_target_model);
                    
                    // dropdown_array[i] = domain_src_target;
                    dropdown_array[i] = domain_src_target_model;
              }

              dropdown_array.sort();

              // Domains unique values
              ldom.forEach(function(item) {
                  msg.options_ldom[item] = item;
              });

              // model_id unique values
              model_id_array.forEach(function(item) {
                   msg.options_model_id[item] = item;
              });


              // source language unique values
              src_lang_array.forEach(function(item) {
                  msg.options_src_lang[item] = item;
              });

              // target language unique values
              target_lang_array.forEach(function(item) {
                  msg.options_target_lang[item] = item;
              });

              msg.domains = Object.keys(msg.options_ldom); // Domains
              msg.model_id_obj = Object.keys(msg.options_model_id); // model_id(s)
              msg.src_lang_object = Object.keys(msg.options_src_lang); // source languages
              msg.target_lang_object = Object.keys(msg.options_target_lang); // target languages
              //////////////////////////////////////////////////////////////////////////////

              // dropdown unique values
              dropdown_array.forEach(function(item) {
                  msg.options_dropdown[item] = item;
              });
              msg.dropdown_object = Object.keys(msg.options_dropdown); // dropdown list

              node.send(msg);
            }
          });
        }
        else {
          node.error("Error instantiating the language service",msg);
        }
    });
  }

  RED.nodes.registerType('watson-translate-util', SMTNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });

};
