/**
 * Copyright 2017 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'conversation';
  var temp = require('temp'),
    fs = require('fs'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    ConversationV1 = require('watson-developer-cloud/conversation/v1'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = '', password = '', sUsername = '', sPassword = '';

  temp.track();

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the username and password will be stored in
  // the variables sUsername and sPassword.
  //
  // This separation between sUsername and username is to allow
  // the end user to modify the credentials when the service is not bound.
  // Otherwise, once set credentials are never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }

  function executeListWorkspaces(node, conv, params, msg) {
    conv.listWorkspaces(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['workspaces'] = response.workspaces ?
                                      response.workspaces: response;
      }
      node.send(msg);
    });
  }

  function executeGetWorkspace(node, conv, params, msg) {
    conv.getWorkspace(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['workspace'] = response;
      }
      node.send(msg);
    });
  }

  function executeCreateWorkspace(node, conv, params, msg) {
    conv.createWorkspace(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['workspace'] = response;
      }
      node.send(msg);
    });
  }

  function executeUpdateWorkspace(node, conv, params, msg) {
    conv.updateWorkspace(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['workspace'] = response;
      }
      node.send(msg);
    });
  }

  function executeDeleteWorkspace(node, conv, params, msg) {
    conv.deleteWorkspace(params, function (err, response) {
      node.status({});
      if (err) {
        payloadutils.reportError(node, msg, err);
      } else {
        msg['workspace'] = response;
      }
      node.send(msg);
    });
  }

  function executeUnknownMethod(node, conv, params, msg) {
    payloadutils.reportError(node, msg, 'Unknown Mode');
    msg.error = 'Unable to process as unknown mode has been specified';
    node.send(msg);
  }

  function executeMethod(node, method, params, msg) {
    var conv = new ConversationV1({
      username: username,
      password: password,
      version_date: '2017-02-03'
    });

    node.status({fill:'blue', shape:'dot', text:'executing'});

    switch (method) {
    case 'listWorkspaces':
      executeListWorkspaces(node, conv, params, msg);
      break;
    case 'getWorkspace':
      executeGetWorkspace(node, conv, params, msg);
      break;
    case 'createWorkspace':
      executeCreateWorkspace(node, conv, params, msg);
      break;
    case 'updateWorkspace':
      executeUpdateWorkspace(node, conv, params, msg);
      break;
    case 'deleteWorkspace':
      executeDeleteWorkspace(node, conv, params, msg);
      break;
    default:
      executeUnknownMethod(node, conv, params, msg);
      break;
    }
  }

  function buildParams(msg, method, config) {
    var params = {};

    switch (method) {
    case 'getWorkspace':
      params['export'] = config['cwm-export-content'];
      // Deliberate no break as want workspace ID also;
    case 'updateWorkspace':
    case 'deleteWorkspace':
      if (config['cwm-workspace-id']) {
        params['workspace_id'] = config['cwm-workspace-id'];
      }
      break;
    }

    return params;
  }

  // No need to have complicated processing here Looking
  // for individual fields in the json object, like name,
  // language, entities etc. as these are the parameters
  // required for this method are in the json object, at
  // the top level of the json object. So it is safe
  // to overwrite params.
  //  'name', 'language', 'entities', 'intents',
  // 'dialog_nodes', 'metadata', 'description',
  // 'counterexamples'
  function setWorkspaceParams(method, params, workspaceObject) {
    var workspace_id = null;
    if ('updateWorkspace' === method && params['workspace_id']) {
      workspace_id = params['workspace_id'];
    }
    if (workspaceObject) {
      params = workspaceObject;
    }
    if (workspace_id) {
      params['workspace_id'] = workspace_id;
    }
    return params;
  }

  function loadFile(node, method, params, msg) {
    temp.open({
      suffix: '.txt'
    }, function(err, info) {
      if (err) {
        node.status({
          fill: 'red',
          shape: 'dot',
          text: 'Error receiving the data buffer'
        });
        throw err;
      }

      // Syncing up the asynchronous nature of the stream
      // so that the full file can be sent to the API.
      fs.writeFile(info.path, msg.payload, function(err) {
        if (err) {
          node.status({
            fill: 'red',
            shape: 'dot',
            text: 'Error processing data buffer'
          });
          throw err;
        }

        var workspaceObject = null;

        switch (method) {
        case 'createWorkspace':
        case 'updateWorkspace':
          try {
            workspaceObject = JSON.parse(fs.readFileSync(info.path, 'utf8'));
          } catch (err) {
            workspaceObject = fs.createReadStream(info.path);
          }
        }

        params = setWorkspaceParams(method, params, workspaceObject);
        executeMethod(node, method, params, msg);
        temp.cleanup();
      });
    });
  }

  function checkForFile(method) {
    switch (method) {
    case 'createWorkspace':
    case 'updateWorkspace':
      return true;
    }
    return false;
  }


  // These are APIs that the node has created to allow it to dynamically fetch Bluemix
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-conversation-v1-workspace-manager/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  // This is the Speech to Text V1 Query Builder Node
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var method = config['cwm-custom-mode'],
        message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;

      if (!username || !password) {
        message = 'Missing Conversation service credentials';
      } else if (!method || '' === method) {
        message = 'Required mode has not been specified';
      } else {
        params = buildParams(msg, method, config);
      }

      if (message) {
        payloadutils.reportError(node, msg, message);
        return;
      }

      if (checkForFile(method)) {
        if (msg.payload instanceof Buffer) {
          loadFile(node, method, params, msg);
          return;
        }
        // If the data is a json object then it will not
        // have been detected as a buffer.
        params = setWorkspaceParams(method, params, msg.payload);
      }

      executeMethod(node, method, params, msg);
    });
  }

  RED.nodes.registerType('watson-conversation-v1-workspace-manager', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });

};
