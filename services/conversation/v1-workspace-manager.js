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
  var pkg = require('../../package.json'),
    temp = require('temp'),
    fs = require('fs'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    ConversationV1 = require('watson-developer-cloud/conversation/v1'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    username = '', password = '', sUsername = '', sPassword = '',
    endpoint = '', sEndpoint = '';

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
    sEndpoint = service.url;
  }

  function executeListWorkspaces(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.listWorkspaces(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['workspaces'] = response.workspaces ?
                                        response.workspaces: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetWorkspace(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getWorkspace(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['workspace'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateWorkspace(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createWorkspace(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['workspace'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeUpdateWorkspace(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.updateWorkspace(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['workspace'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteWorkspace(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteWorkspace(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['workspace'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListIntents(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getIntents(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['intents'] = response.intents ?
                                        response.intents: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetIntent(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getIntent(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          // returning the whole response even though response.intent has
          // the intent, but the details with export = true
          // are provided as response.examples
          msg['intent'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateIntent(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createIntent(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['intent'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeUpdateIntent(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.updateIntent(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['intent'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteIntent(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteIntent(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['intent'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  // For now we are not doing anything with the pagination
  // response
  function executeListExamples(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getExamples(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['examples'] = response.examples ?
                                        response.examples: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateExample(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createExample(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['example'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteExample(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteExample(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['example'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListCounterExamples(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getCounterExamples(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['counterexamples'] = response.counterexamples ?
                                        response.counterexamples: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateCounterExample(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createCounterExample(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['counterexample'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteCounterExample(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteCounterExample(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['counterexample'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListEntities(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getEntities(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['entities'] = response.entities ? response.entities: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetEntity(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getEntity(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          // returning the whole response even though response.intent has
          // the intent, but the details with export = true
          // are provided as response.examples
          msg['entity'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateEntity(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createEntity(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['entity'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeUpdateEntity(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.updateEntity(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['entity'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteEntity(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteEntity(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['entity'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListEntityValues(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getValues(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['values'] = response.values ? response.values: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetEntityValue(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getValue(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['value'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeAddEntityValue(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createValue(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['value'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeUpdateEntityValue(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.updateValue(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['value'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteEntityValue(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteValue(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['value'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeListDialogNodes(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getDialogNodes(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['dialog_nodes'] = response.dialog_nodes ? response.dialog_nodes: response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeGetDialogNode(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.getDialogNode(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['dialog_node'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeCreateDialogNode(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.createDialogNode(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['dialog_node'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeUpdateDialogNode(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.updateDialogNode(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['dialog_node'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeDeleteDialogNode(node, conv, params, msg) {
    var p = new Promise(function resolver(resolve, reject){
      conv.deleteDialogNode(params, function (err, response) {
        if (err) {
          reject(err);
        } else {
          msg['dialog_node'] = response;
          resolve();
        }
      });
    });
    return p;
  }

  function executeUnknownMethod(node, conv, params, msg) {
    return Promise.reject('Unable to process as unknown mode has been specified');
  }

  function executeMethod(node, method, params, msg) {
    var conv = null,
      serviceSettings = {
        username: username,
        password: password,
        version_date: '2017-05-26',
        headers: {
          'User-Agent': pkg.name + '-' + pkg.version
        }
      };

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    conv = new ConversationV1(serviceSettings);

    node.status({fill:'blue', shape:'dot', text:'executing'});

    var p = null;

    switch (method) {
    case 'listWorkspaces':
      p = executeListWorkspaces(node, conv, params, msg);
      break;
    case 'getWorkspace':
      p = executeGetWorkspace(node, conv, params, msg);
      break;
    case 'createWorkspace':
      p = executeCreateWorkspace(node, conv, params, msg);
      break;
    case 'updateWorkspace':
      p = executeUpdateWorkspace(node, conv, params, msg);
      break;
    case 'deleteWorkspace':
      p = executeDeleteWorkspace(node, conv, params, msg);
      break;
    case 'listIntents':
      p = executeListIntents(node, conv, params, msg);
      break;
    case 'getIntent':
      p = executeGetIntent(node, conv, params, msg);
      break;
    case 'createIntent':
      p = executeCreateIntent(node, conv, params, msg);
      break;
    case 'updateIntent':
      p = executeUpdateIntent(node, conv, params, msg);
      break;
    case 'deleteIntent':
      p = executeDeleteIntent(node, conv, params, msg);
      break;
    case 'listExamples':
      p = executeListExamples(node, conv, params, msg);
      break;
    case 'createExample':
      p = executeCreateExample(node, conv, params, msg);
      break;
    case 'deleteExample':
      p = executeDeleteExample(node, conv, params, msg);
      break;
    case 'listCounterExamples':
      p = executeListCounterExamples(node, conv, params, msg);
      break;
    case 'createCounterExample':
      p = executeCreateCounterExample(node, conv, params, msg);
      break;
    case 'deleteCounterExample':
      p = executeDeleteCounterExample(node, conv, params, msg);
      break;
    case 'listEntities':
      p = executeListEntities(node, conv, params, msg);
      break;
    case 'getEntity':
      p = executeGetEntity(node, conv, params, msg);
      break;
    case 'createEntity':
      p = executeCreateEntity(node, conv, params, msg);
      break;
    case 'updateEntity':
      p = executeUpdateEntity(node, conv, params, msg);
      break;
    case 'deleteEntity':
      p = executeDeleteEntity(node, conv, params, msg);
      break;
    case 'listEntityValues':
      p = executeListEntityValues(node, conv, params, msg);
      break;
    case 'getEntityValue':
      p = executeGetEntityValue(node, conv, params, msg);
      break;
    case 'addEntityValue':
      p = executeAddEntityValue(node, conv, params, msg);
      break;
    case 'updateEntityValue':
      p = executeUpdateEntityValue(node, conv, params, msg);
      break;
    case 'deleteEntityValue':
      p = executeDeleteEntityValue(node, conv, params, msg);
      break;
    case 'listDialogNodes':
      p = executeListDialogNodes(node, conv, params, msg);
      break;
    case 'getDialogNode':
      p = executeGetDialogNode(node, conv, params, msg);
      break;
    case 'updateDialogNode':
      p = executeUpdateDialogNode(node, conv, params, msg);
      break;
    case 'createDialogNode':
      p = executeCreateDialogNode(node, conv, params, msg);
      break;
    case 'deleteDialogNode':
      p = executeDeleteDialogNode(node, conv, params, msg);
      break;
    default:
      p = executeUnknownMethod(node, conv, params, msg);
      break;
    }

    return p;
  }

  function buildWorkspaceParams(msg, method, config, params) {
    var message = '',
      workspace_id = '';

    switch (method) {
    case 'getIntent':
    case 'updateIntent':
    case 'getWorkspace':
    case 'listIntents':
    case 'updateWorkspace':
    case 'deleteWorkspace':
    case 'createIntent':
    case 'deleteIntent':
    case 'listExamples':
    case 'createExample':
    case 'deleteExample':
    case 'listCounterExamples':
    case 'createCounterExample':
    case 'deleteCounterExample':
    case 'getEntity':
    case 'listEntities':
    case 'createEntity':
    case 'updateEntity':
    case 'deleteEntity':
    case 'listEntityValues':
    case 'getEntityValue':
    case 'addEntityValue':
    case 'updateEntityValue':
    case 'deleteEntityValue':
    case 'listDialogNodes':
    case 'getDialogNode':
    case 'createDialogNode':
    case 'updateDialogNode':
    case 'deleteDialogNode':
      if (msg.params && msg.params.workspace_id) {
        workspace_id = msg.params.workspace_id;
      } else if (config['cwm-workspace-id']) {
        workspace_id = config['cwm-workspace-id'];
      }
      if (workspace_id) {
        params['workspace_id'] = workspace_id;
      } else {
        message = 'Workspace ID is required';
      }
      break;
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function buildIntentParams(msg, method, config, params) {
    var message = '',
      intent = '',
      field = 'intent';

    switch (method) {
    case 'updateIntent':
      field = 'old_intent';
      // deliberate no break
    case 'getIntent':
    case 'deleteIntent':
    case 'listExamples':
    case 'createExample':
    case 'deleteExample':
      if (msg.params && msg.params.intent) {
        intent = msg.params.intent;
      } else if (config['cwm-intent']) {
        intent = config['cwm-intent'];
      }
      if (intent) {
        params[field] = intent;
      } else {
        message = 'a value for Intent is required';
      }
      break;
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function buildEntityParams(msg, method, config, params) {
    var message = '',
      field = 'entity',
      entity = '';

    switch (method) {
    case 'updateEntity':
      field = 'old_entity';
      // deliberate no break
    case 'getEntity':
    case 'deleteEntity':
    case 'listEntityValues':
    case 'getEntityValue':
    case 'addEntityValue':
    case 'updateEntityValue':
    case 'deleteEntityValue':
      if (msg.params && msg.params.entity) {
        entity = msg.params.entity;
      } else if (config['cwm-entity']) {
        entity = config['cwm-entity'];
      }
      if (entity) {
        params[field] = entity;
      } else {
        message = 'a value for Entity is required';
      }
      break;
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function buildEntityValueParams(msg, method, config, params) {
    var message = '',
      field = 'value',
      entityValue = '';

    switch (method) {
    case 'updateEntityValue':
      field = 'old_value';
      // deliberate no break
    case 'getEntityValue':
    case 'addEntityValue':
    case 'deleteEntityValue':
      if (msg.params && msg.params.entity_value) {
        entityValue = msg.params.entity_value;
      } else if (config['cwm-entity-value']) {
        entityValue = config['cwm-entity-value'];
      }
      if (entityValue) {
        params[field] = entityValue;
      } else {
        message = 'a value for Entity value is required';
      }
      break;
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function buildDialogParams(msg, method, config, params) {
    var message = '',
      field = 'dialog_node',
      dialogID = '';

    switch (method) {
    case 'updateDialogNode':
      field = 'old_dialog_node';
      // deliberate no break
    case 'getDialogNode':
    case 'deleteDialogNode':
      if (msg.params && msg.params.dialog_node) {
        dialogID = msg.params.dialog_node;
      } else if (config['cwm-dialog-node']) {
        dialogID = config['cwm-dialog-node'];
      }
      if (dialogID) {
        params[field] = dialogID;
      } else {
        message = 'a value for Dialog Node ID is required';
      }
      break;
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function buildExampleParams(msg, method, config, params) {
    var message = '',
      example = '';

    switch (method) {
    case 'createExample':
    case 'deleteExample':
    case 'createCounterExample':
    case 'deleteCounterExample':
      if (msg.params && msg.params.example) {
        example = msg.params.example;
      } else if (config['cwm-example']) {
        example = config['cwm-example'];
      }
      if (example) {
        params['text'] = example;
      } else {
        message = 'Example Input is required';
      }
      break;
    }
    if (message) {
      return Promise.reject(message);
    }
    return Promise.resolve();
  }

  function buildExportParams(method, config, params) {
    switch (method) {
    case 'getIntent':
    case 'getWorkspace':
    case 'listIntents':
    case 'listEntities':
    case 'getEntity':
    case 'listEntityValues':
    case 'getEntityValue':
      params['export'] = config['cwm-export-content'];
      break;
    }
    return Promise.resolve();
  }


  // Copy over the appropriate parameters for the required
  // method from the node configuration
  function buildParams(msg, method, config, params) {
    var p = buildWorkspaceParams(msg, method, config, params)
      .then(function(){
        return buildIntentParams(msg, method, config, params);
      })
      .then(function(){
        return buildExampleParams(msg, method, config, params);
      })
      .then(function(){
        return buildEntityParams(msg, method, config, params);
      })
      .then(function(){
        return buildEntityValueParams(msg, method, config, params);
      })
      .then(function(){
        return buildDialogParams(msg, method, config, params);
      })
      .then(function(){
        return buildExportParams(method, config, params);
      });

    return p;
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
  // So will work for intent as is, for
  // 'intent', 'description', 'examples'
  // Just need to add the workspace id back in. For intent
  // updates the old_intent will have already been set.
  function setWorkspaceParams(method, params, workspaceObject) {
    var workspace_id = null;
    var stash = {};

    if ('object' !== typeof workspaceObject) {
      return Promise.reject('json content expected as input on payload');
    }

    switch(method) {
    case 'updateIntent':
      if (params['old_intent']) {
        stash['old_intent'] = params['old_intent'];
      }
      break;
    case 'updateEntity':
      if (params['old_entity']) {
        stash['old_entity'] = params['old_entity'];
      }
      break;
    case 'updateEntityValue':
      if (params['old_value']) {
        stash['old_value'] = params['old_value'];
      }
      if (params['entity']) {
        stash['entity'] = params['entity'];
      }
      break;
    case 'updateDialogNode':
      if (params['old_dialog_node']) {
        stash['old_dialog_node'] = params['old_dialog_node'];
      }
      break;
    }

    switch(method) {
    case 'updateWorkspace':
    case 'createIntent':
    case 'updateIntent':
    case 'createEntity':
    case 'updateEntity':
    case 'updateEntityValue':
    case 'createDialogNode':
    case 'updateDialogNode':
      if (params['workspace_id']) {
        stash['workspace_id'] = params['workspace_id'];
      }
      break;
    }

    if (workspaceObject) {
      params = workspaceObject;
    }

    if (stash) {
      for (var k in stash) {
        params[k] = stash[k];
      }
    }

    return Promise.resolve(params);
  }


  function openTheFile() {
    var p = new Promise(function resolver(resolve, reject){
      temp.open({
        suffix: '.txt'
      }, function(err, info) {
        if (err) {
          reject('Error receiving the data buffer');
        } else {
          resolve(info);
        }
      });
    });
    return p;
  }

  function syncTheFile(info, msg) {
    var p = new Promise(function resolver(resolve, reject){
      fs.writeFile(info.path, msg.payload, function(err) {
        if (err) {
          reject('Error processing data buffer');
        }
        resolve();
      });
    });
    return p;
  }


  // I know this says workspace, but its actually a json
  // object that works both for workspace, intent and entity
  function processFileForWorkspace(info, method) {
    var workspaceObject = null;

    switch (method) {
    case 'createWorkspace':
    case 'updateWorkspace':
    case 'createIntent':
    case 'updateIntent':
    case 'createEntity':
    case 'updateEntity':
    case 'updateEntityValue':
    case 'createDialogNode':
    case 'updateDialogNode':
      try {
        workspaceObject = JSON.parse(fs.readFileSync(info.path, 'utf8'));
      } catch (err) {
        workspaceObject = fs.createReadStream(info.path);
      }
    }

    return Promise.resolve(workspaceObject);
  }


  // We are expecting a file on payload.
  // Some of the functions used here are async, so this
  // function is returning a consolidated promise,
  // compromising of all the promises from the async and
  // sync functions.
  function loadFile(node, method, params, msg) {
    var fileInfo = null;
    var p = openTheFile()
      .then(function(info){
        fileInfo = info;
        return syncTheFile(fileInfo, msg);
      })
      .then(function(){
        return processFileForWorkspace(fileInfo, method);
      })
      .then(function(workspaceObject){
        return setWorkspaceParams(method, params, workspaceObject);
      });

    return p;
  }


  // For certain methods a file input is expected on the payload
  function checkForFile(method) {
    switch (method) {
    case 'createWorkspace':
    case 'updateWorkspace':
    case 'createIntent':
    case 'updateIntent':
    case 'createEntity':
    case 'updateEntity':
    case 'updateEntityValue':
    case 'createDialogNode':
    case 'updateDialogNode':
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  function initialCheck(u, p, m) {
    var message = '';
    if (!u || !p) {
      message = 'Missing Conversation service credentials';
    } else if (!m || '' === m) {
      message = 'Required mode has not been specified';
    }
    if (message){
      return Promise.reject(message);
    }
    return Promise.resolve();
  }


  // These are APIs that the node has created to allow it to dynamically fetch IBM Cloud
  // credentials, and also translation models. This allows the node to keep up to
  // date with new tranlations, without the need for a code update of this node.

  // Node RED Admin - fetch and set vcap services
  RED.httpAdmin.get('/watson-conversation-v1-workspace-manager/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });


  // This is the Conversation Workspace Manager Node
  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {
      var method = config['cwm-custom-mode'],
        message = '',
        params = {};

      username = sUsername || this.credentials.username;
      password = sPassword || this.credentials.password || config.password;  

      // All method to be overridden
      if (msg.params) {
        if (msg.params.method) {
          method = msg.params.method;          
        }
        if (msg.params.username) {
          username = msg.params.username;
        }
        if (msg.params.password) {
          password = msg.params.password;
        }
      }
      endpoint = sEndpoint;
      if ((!config['cwm-default-endpoint']) && config['cwm-service-endpoint']) {
        endpoint = config['cwm-service-endpoint'];
      }

      node.status({});
      initialCheck(username, password, method)
        .then(function(){
          return buildParams(msg, method, config, params);
        })
        .then(function(){
          return checkForFile(method);
        })
        .then(function(fileNeeded){
          if (fileNeeded) {
            if (msg.payload instanceof Buffer) {
              return loadFile(node, method, params, msg);
            }
            // If the data is a json object then it will not
            // have been detected as a buffer.
            return setWorkspaceParams(method, params, msg.payload);
          }
          return Promise.resolve(params);
        })
        .then(function(p){
          params = p;
          node.status({fill:'blue', shape:'dot', text:'executing'});
          return executeMethod(node, method, params, msg);
        })
        .then(function(){
          temp.cleanup();
          node.status({});
          node.send(msg);
        })
        .catch(function(err){
          temp.cleanup();
          payloadutils.reportError(node,msg,err);
        });

    });
  }

  RED.nodes.registerType('watson-conversation-v1-workspace-manager', Node, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });

};
