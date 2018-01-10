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
  var pkg = require('../../package.json'),
    LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2'),
    cfenv = require('cfenv'),
    username = null, password = null, sUsername = null, sPassword = null,
    service = cfenv.getAppEnv().getServiceCreds(/language translator/i),
    endpoint = '',
    sEndpoint = 'https://gateway.watsonplatform.net/language-translator/api';

    //endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
    sEndpoint = service.url;
  }

  // These are APIs that the node has created to allow it to dynamically fetch IBM Cloud
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-translator-util/vcap', function (req, res) {
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

    // The node has received an input as part of a flow, need to determine
    // what the request is for, and based on that if the required fields
    // have been provided.
    this.on('input', function (msg) {

      var message = '',
        serviceSettings = {
          username: username,
          password: password,
          version: 'v2',
          headers: {
            'User-Agent': pkg.name + '-' + pkg.version
          }
        };

      if (!username || !password) {
        message = 'Missing Language Translation service credentials';
        node.error(message, msg);
        return;
      }

      endpoint = sEndpoint;
      if ((!config['default-endpoint']) && config['service-endpoint']) {
        endpoint = config['service-endpoint'];
      }
      if (endpoint) {
        serviceSettings.url = endpoint;
      }

      var lt = new LanguageTranslatorV2(serviceSettings);

      // set global variable in order to make them accessible for the tranlsation node
      var globalContext = this.context().global;

      globalContext.set('g_domain','');
      globalContext.set('g_src','');
      globalContext.set('g_dest','');
      globalContext.set('g_model_id','');

      // ---- UTILITY FUNCTIONS ----
      // this functions creates a N dimensional array
      // it will be used in order to make an array of arrays from the wanted options to populate a dashboard dropdown list
      // the entries of the array to be created would be 'domains', 'model_id', 'source' & 'target
      function capitalize (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }

      function makeLanguageBeautifier(string) {
        var langs = {
          'es': 'Spanish',
          'ar': 'Arabic',
          'arz': 'Spoken Arabic',
          'en': 'English',
          'fr': 'French',
          'it': 'Italian',
          'zh': 'Chinese',
          'ko': 'Korean',
          'pt': 'Portuguese',
          'de': 'German'
        };
        return langs[string];
      }
      // ---- END OF UTILITY FUNCTIONS ----

      if (lt) {
        lt.getModels({},function (err, models ){
          if (err) {
            node.error(err,msg);
          } else {
            msg.payload = models;

            // the overall array would be used to populate the dropdown list
            var dropdown_array = [];
            var domain_src_target_model = [];
            var domain_src_target = '';
            var sTmp3 = '';
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

            for (var i = 0; i < msg.payload.models.length; i++) {
              ldom[i] = msg.payload.models[i].domain;
              ldom[i] = capitalize(ldom[i]);
              model_id_array[i] = msg.payload.models[i].model_id;
              src_lang_array[i] = msg.payload.models[i].source;
              src_lang_array[i] = makeLanguageBeautifier(src_lang_array[i]);
              target_lang_array[i] = msg.payload.models[i].target;
              target_lang_array[i] = makeLanguageBeautifier(target_lang_array[i]);

              sTmp3 = makeLanguageBeautifier(target_lang_array[i]);

              domain_src_target = ldom[i] + ', ' + src_lang_array[i] + ', ' + target_lang_array[i];

              var j = {};
              j[domain_src_target] = model_id_array[i];
              domain_src_target_model.push(j);

              dropdown_array[i] = domain_src_target_model[i];
            }

            model_id_array.sort();

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

            msg.domains = Object.keys(msg.options_ldom);
            msg.model_id_obj = Object.keys(msg.options_model_id);
            msg.src_lang_object = Object.keys(msg.options_src_lang);
            msg.target_lang_object = Object.keys(msg.options_target_lang);
            msg.dropdown_object = dropdown_array;

            node.send(msg);
          }
        });
      } else {
        node.error('Error instantiating the language service',msg);
      }
    });
  }

  RED.nodes.registerType('watson-translator-util', SMTNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
