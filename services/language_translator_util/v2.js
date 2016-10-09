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
  var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2'),
  cfenv = require('cfenv'),
  username = null, password = null, sUsername = null, sPassword = null,
  service = cfenv.getAppEnv().getServiceCreds(/language translator/i),
  endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

process.env.VCAP_SERVICES='{"VCAP_SERVICES":{"cloudantNoSQLDB":[{"credentials":{"host":"c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix.cloudant.com","password":"a955edbb1be6105dae540a26bc1cc7a71f3b46f056a4db8896de6dc5b33cde61","port":443,"url":"https://c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix:a955edbb1be6105dae540a26bc1cc7a71f3b46f056a4db8896de6dc5b33cde61@c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix.cloudant.com","username":"c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix"},"label":"cloudantNoSQLDB","name":"sample-node-red-cloudantNoSQLDB","plan":"Shared","provider":null,"syslog_drain_url":null,"tags":["data_management","ibm_created","ibm_dedicated_public"]}],"language_translator":[{"credentials":{"password":"z2uy1MUCBdp5","url":"https://gateway.watsonplatform.net/language-translator/api","username":"1d6d5991-8f9a-41db-9e2f-a35faf644953"},"label":"language_translator","name":"Language Translator-di","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}],"speech_to_text":[{"credentials":{"password":"wr0QZQHpmqeE","url":"https://stream.watsonplatform.net/speech-to-text/api","username":"92b657d6-79b3-4602-bcf3-4224754cda84"},"label":"speech_to_text","name":"Speech to Text-qe","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}],"text_to_speech":[{"credentials":{"password":"vKsiaNBfORVs","url":"https://stream.watsonplatform.net/text-to-speech/api","username":"8f7c2c38-d8ea-407f-8fb0-13682ddef14f"},"label":"text_to_speech","name":"Text to Speech-cx","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}]}}';
vcap = JSON.parse(process.env.VCAP_SERVICES || "{}");
console.log('vcap: '+ JSON.stringify(vcap));
service = vcap["VCAP_SERVICES"]["language_translator"];
console.log('service: '+ JSON.stringify(service));


  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
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
      var message = '';

      if (!username || !password) {
        message = 'Missing Language Translation service credentials';
        node.error(message, msg);
        return;
      }

      var lt = new LanguageTranslatorV2({
        username: username,
        password: password,
        version: 'v2',
        url: endpointUrl
      });

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
