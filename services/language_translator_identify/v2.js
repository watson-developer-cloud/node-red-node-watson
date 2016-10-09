/**
 * Copyright 2013,2015 IBM Corp.
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
    services = cfenv.getAppEnv().services,
    service = cfenv.getAppEnv().getServiceCreds(/language translator/i),
    username = null,
    password = null,
    endpointUrl = 'https://gateway.watsonplatform.net/language-translator/api';

process.env.VCAP_SERVICES='{"VCAP_SERVICES":{"cloudantNoSQLDB":[{"credentials":{"host":"c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix.cloudant.com","password":"a955edbb1be6105dae540a26bc1cc7a71f3b46f056a4db8896de6dc5b33cde61","port":443,"url":"https://c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix:a955edbb1be6105dae540a26bc1cc7a71f3b46f056a4db8896de6dc5b33cde61@c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix.cloudant.com","username":"c12a4430-73e9-46d3-b2ca-1a68d5195e97-bluemix"},"label":"cloudantNoSQLDB","name":"sample-node-red-cloudantNoSQLDB","plan":"Shared","provider":null,"syslog_drain_url":null,"tags":["data_management","ibm_created","ibm_dedicated_public"]}],"language_translator":[{"credentials":{"password":"z2uy1MUCBdp5","url":"https://gateway.watsonplatform.net/language-translator/api","username":"1d6d5991-8f9a-41db-9e2f-a35faf644953"},"label":"language_translator","name":"Language Translator-di","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}],"speech_to_text":[{"credentials":{"password":"wr0QZQHpmqeE","url":"https://stream.watsonplatform.net/speech-to-text/api","username":"92b657d6-79b3-4602-bcf3-4224754cda84"},"label":"speech_to_text","name":"Speech to Text-qe","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}],"text_to_speech":[{"credentials":{"password":"vKsiaNBfORVs","url":"https://stream.watsonplatform.net/text-to-speech/api","username":"8f7c2c38-d8ea-407f-8fb0-13682ddef14f"},"label":"text_to_speech","name":"Text to Speech-cx","plan":"standard","provider":null,"syslog_drain_url":null,"tags":["watson","ibm_created","ibm_dedicated_public"]}]}}';
vcap = JSON.parse(process.env.VCAP_SERVICES || "{}");
console.log('vcap: '+ JSON.stringify(vcap));
service = vcap["VCAP_SERVICES"]["language_translator"];
console.log('service: '+ JSON.stringify(service));


  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-language-translator-identify/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    var node = this;
    RED.nodes.createNode(this, config);
    
    this.on('input', function (msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg);
        return;
      }

      username = username || this.credentials.username;
      password = password || this.credentials.password;

      if (!username || !password) {
        var message = 'Missing Watson Language Translator service credentials';
        node.error(message, msg);
        return;
      }

      var language_translator = new LanguageTranslatorV2({
        username: username,
        password: password,
        version: 'v2',
        url: endpointUrl

      });

      node.status({fill:'blue', shape:'dot', text:'requesting'});
      language_translator.identify({text: msg.payload}, function (err, response) {
        node.status({})
        if (err) {
          node.error(err, msg);
        } else {
          msg.payload = response.languages
          //msg.lang = response.languages[0]; // old identify API
        }
        node.send(msg);
      });
    });
  }
  RED.nodes.registerType('watson-language-translator-identify', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
};
