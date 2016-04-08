/**
 * Copyright 2015 IBM Corp.
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

module.exports = function(RED) {
  var request = require('request');
  var cfenv = require('cfenv');
  var fs = require('fs');
  var temp = require('temp');
  var fileType = require('file-type');
  temp.track();

  var username, password;

  var service = cfenv.getAppEnv().getServiceCreds(/visual recognition/i)

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-visual-recognition/vcap', function(req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function Node(config) {
    RED.nodes.createNode(this,config);
    var node = this;

      this.on('input', function(msg) {
        if (!msg.payload) {
          var message = 'Missing property: msg.payload';
          node.error(message, msg);
          return;
        }

        if (!msg.payload instanceof Buffer || !typeof msg.payload === 'string') {
          var message = 'Invalid property: msg.payload, must be a URL or a Buffer.';
          node.error(message, msg);
          return;
        }

        username = username || this.credentials.username;
        password = password || this.credentials.password;

        if (!username || !password) {
          var message = 'Missing Visual Recognition service credentials';
          node.error(message, msg)
          return;
        }

        var watson = require('watson-developer-cloud');

        var visual_recognition = watson.visual_recognition({
          username: username,
          password: password,
          version: 'v1-beta'
        });

        var file_extension = function (file) {
          var ext = '.jpeg';

          // For URLs, look for file extension in the path, default to JPEG.
          if (typeof file === 'string') {
            var match = file.match(/\.[\w]{3,4}$/i)
            ext = match && match[0]
          // ...for Buffers, we can look at the file header.
          } else if (file instanceof Buffer) {
            ext = '.' + fileType(file).ext;
          }

          return ext;
        }

        var recognize = function (image, cb) {
          node.status({fill:"blue", shape:"dot", text:"requesting"});
          visual_recognition.recognize({image_file: image}, function(err, res) {
            node.status({})
            if (err) {
              node.error(err, msg);
            } else {
              msg.labels = res.images && res.images[0].labels;
            }

            node.send(msg);
            if (cb) cb();
          });
        }

        var stream_buffer = function (file, contents, cb) {
          fs.writeFile(file, contents, function (err) {
              if (err) throw err;
              cb();
            });
        };

        var stream_url = function (file, location, cb) { 
          var wstream = fs.createWriteStream(file)
          wstream.on('finish', cb);

          request(location)
            .pipe(wstream);
        };

        temp.open({suffix: file_extension(msg.payload)}, function (err, info) {
          if (err) throw err;

          var stream_payload = (typeof msg.payload === 'string') ? stream_url : stream_buffer;

          stream_payload(info.path, msg.payload, function () {
            recognize(fs.createReadStream(info.path), temp.cleanup);
          });
        });
      });
  }
  RED.nodes.registerType("watson-visual-recognition",Node, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
};
