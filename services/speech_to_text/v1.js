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
  var fs = require('fs');
  var fileType = require('file-type');
  var temp = require('temp');
  var watson = require('watson-developer-cloud');
  temp.track();

  var username, password;

  var service = cfenv.getAppEnv().getServiceCreds(/speech to text/i)

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-speech-to-text/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      if (!msg.payload) {
        var message_err_payload = 'Missing property: msg.payload';
        node.error(message_err_payload, msg)
        return;
      }

      username = username || this.credentials.username;
      password = password || this.credentials.password;

      if (!username || !password) {
        var message_err_credentials = 'Missing Speech To Text service credentials';
        node.error(message_err_credentials, msg)
        return;
      }

      if (!msg.payload instanceof Buffer || !typeof msg.payload === 'string') {
        var message = 'Invalid property: msg.payload, must be a URL or a Buffer.';
        node.error(message, msg)
        return;
      }

      if (!config.lang) {
        var message_err_lang = 'Missing audio language configuration, unable to process speech.';
        node.error(message_err_lang, msg)
        return;
      }

      if (!config.band) {
        var message_err_band = 'Missing audio band configuration, unable to process speech.';
        node.error(message_err_band, msg)
        return;
      }

      if (!config.continuous) {
        var message_err_continuous = 'Missing continuous details, unable to process speech.';
        node.error(message_err_continuous, msg)
        return;
      }

      var model = config.lang + '_' + config.band;

      var speech_to_text = watson.speech_to_text({
        username: username,
        password: password,
        version: 'v1',
        url: 'https://stream.watsonplatform.net/speech-to-text/api'
      });

      var s2t = function (audio, format, cb) {
        if (format !== 'wav' && format !== 'flac' && format !== 'ogg') {
          var message_err_format = 'Audio format (' + format + ') not supported, must be encoded as WAV, FLAC or OGG.';
          node.error(message_err_format, msg)
          return;
        }

        if (format === 'ogg') format += ';codecs=opus';

        var params = {
          audio: audio,
          content_type: 'audio/' + format,
          model: model,
          continuous: config.continuous
        };

        node.status({fill:"blue", shape:"dot", text:"requesting"});
        speech_to_text.recognize(params, function (err, res) {
          node.status({})
          if (err) {
            node.error(err, msg);
          } else {
            msg.transcription = '';
            if (res.results.length && res.results[0].alternatives.length) {
              msg.transcription = res.results[0].alternatives[0].transcript;
            }
          }

          node.send(msg);
          if (cb) cb();
        });
      };

      var stream_buffer = function (file, contents, cb) {
        fs.writeFile(file, contents, function (err) {
          if (err) throw err;
          cb(fileType(contents).ext)
        });
      };

      var stream_url = function (file, location, cb) {
        var wstream = fs.createWriteStream(file)
        wstream.on('finish', function () {
          fs.readFile(file, function (err, buf) {
            if (err) console.error(err);
            cb(fileType(buf).ext)
          })
        });

        request(location)
        .pipe(wstream);
      };

      temp.open({suffix: '.audio'}, function (err, info) {
        if (err) throw err;

        var stream_payload = (typeof msg.payload === 'string') ? stream_url : stream_buffer;

        stream_payload(info.path, msg.payload, function (format) {
          s2t(fs.createReadStream(info.path), format, temp.cleanup);
        });
      });
    });
  }
  RED.nodes.registerType('watson-speech-to-text', Node, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
