/**
 * Copyright 2017, 2022 IBM Corp.
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
  const SERVICE_IDENTIFIER = 'assistant',
    OLD_SERVICE_IDENTIFIER = 'conversation',
    AssistantV1 = require('ibm-watson/assistant/v1'),
    { IamAuthenticator } = require('ibm-watson/auth');

  var pkg = require('../../package.json'),
    temp = require('temp'),
    fs = require('fs'),
    serviceutils = require('../../utilities/service-utils'),
    payloadutils = require('../../utilities/payload-utils'),
    responseutils = require('../../utilities/response-utils'),
    service = serviceutils.getServiceCreds(SERVICE_IDENTIFIER),
    apikey = '', sApikey = '',
    endpoint = '', sEndpoint = '',
    version = '2018-09-20';

  if (!service) {
    service = serviceutils.getServiceCreds(OLD_SERVICE_IDENTIFIER);
  }

  const ExecutionList = {
    'listWorkspaces'  : executeListWorkspaces,
    'getWorkspace'    : executeGetWorkspace,
    'createWorkspace' : executeCreateWorkspace,
    'updateWorkspace' : executeUpdateWorkspace,
    'deleteWorkspace' : executeDeleteWorkspace,
    'listIntents'     : executeListIntents,
    'getIntent'       : executeGetIntent,
    'createIntent'    : executeCreateIntent,
    'updateIntent'    : executeUpdateIntent,
    'deleteIntent'    : executeDeleteIntent,
    'listExamples'    : executeListExamples,
    'createExample'   : executeCreateExample,
    'deleteExample'   : executeDeleteExample,
    'listCounterExamples' : executeListCounterExamples,
    'createCounterExample': executeCreateCounterExample,
    'deleteCounterExample': executeDeleteCounterExample,
    'listEntities'    : executeListEntities,
    'getEntity'       : executeGetEntity,
    'createEntity'    : executeCreateEntity,
    'updateEntity'    : executeUpdateEntity,
    'deleteEntity'    : executeDeleteEntity,
    'listEntityValues': executeListEntityValues,
    'getEntityValue'  : executeGetEntityValue,
    'addEntityValue'  : executeAddEntityValue,
    'updateEntityValue'   : executeUpdateEntityValue,
    'deleteEntityValue'   : executeDeleteEntityValue,
    'listDialogNodes' : executeListDialogNodes,
    'getDialogNode'   : executeGetDialogNode,
    'updateDialogNode': executeUpdateDialogNode,
    'createDialogNode': executeCreateDialogNode,
    'deleteDialogNode': executeDeleteDialogNode
  };

  temp.track();

  // Require the Cloud Foundry Module to pull credentials from bound service
  // If they are found then the key will be stored in
  // the variables sApikey.
  //
  // This separation is to allow
  // the end user to modify the credentials when the service is not bound.
  // Otherwise, once set credentials are never reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.

  if (service) {
    sApikey = service.apikey ? service.apikey : '';

    sEndpoint = service.url;
  }

  function executeListWorkspaces(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listWorkspaces(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'workspaces');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetWorkspace(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.getWorkspace(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'workspace');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeCreateWorkspace(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject){
      conv.createWorkspace(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'workspace');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeUpdateWorkspace(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.updateWorkspace(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'workspace');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteWorkspace(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.deleteWorkspace(params)
      .then((response) => {
        responseutils.assignResultToField(msg, response, 'workspace');
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
  }

  function executeListIntents(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listIntents(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'intents');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetIntent(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.getIntent(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'intent');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeCreateIntent(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.createIntent(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'intent');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeUpdateIntent(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.updateIntent(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'intent');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteIntent(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject){
      conv.deleteIntent(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'intent');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  // For now we are not doing anything with the pagination
  // response
  function executeListExamples(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listExamples(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'examples');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeCreateExample(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.createExample(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'example');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteExample(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.deleteExample(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'example');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeListCounterExamples(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listCounterexamples(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'counterexamples');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeCreateCounterExample(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject){
      conv.createCounterexample(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'counterexample');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteCounterExample(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.deleteCounterexample(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'counterexample');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeListEntities(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listEntities(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'entities');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetEntity(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.getEntity(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'entity');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeCreateEntity(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.createEntity(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'entity');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeUpdateEntity(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.updateEntity(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'entity');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteEntity(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.deleteEntity(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'entity');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeListEntityValues(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listValues(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'values');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetEntityValue(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.getValue(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'value');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeAddEntityValue(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.createValue(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'value');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeUpdateEntityValue(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.updateValue(params)
      .then((response) => {
        responseutils.assignResultToField(msg, response, 'value');
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
  }

  function executeDeleteEntityValue(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.deleteValue(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'value');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeListDialogNodes(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.listDialogNodes(params)
        .then((response) => {
          responseutils.parseResponseFor(msg, response, 'dialog_nodes');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeGetDialogNode(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.getDialogNode(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'dialog_node');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeCreateDialogNode(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.createDialogNode(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'dialog_node');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeUpdateDialogNode(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.updateDialogNode(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'dialog_node');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeDeleteDialogNode(node, conv, params, msg) {
    return new Promise(function resolver(resolve, reject) {
      conv.deleteDialogNode(params)
        .then((response) => {
          responseutils.assignResultToField(msg, response, 'dialog_node');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function executeUnknownMethod(node, conv, params, msg) {
    return Promise.reject('Unable to process as unknown mode has been specified');
  }

  function executeMethod(node, method, params, msg) {
    let conv = null,
      version = '2018-09-20',
      authSettings = {},
      serviceSettings = {
        version_date: version,
        version: version,
        headers: {
          'User-Agent': pkg.name + '-' + pkg.version
        }
      };

    if (apikey) {
      authSettings.apikey = apikey;
    }

    serviceSettings.authenticator = new IamAuthenticator(authSettings);

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    conv = new AssistantV1(serviceSettings);

    node.status({fill:'blue', shape:'dot', text:'executing'});

    let exe = ExecutionList[method];
    if (!exe) {
      exe = unknownMethod
    }

    return exe(node, conv, params, msg);
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
        params['workspaceId'] = workspace_id;
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
      field = 'dialogNode',
      dialogID = '';

    switch (method) {
    case 'updateDialogNode':
      field = 'old_dialogNode';
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
      params['_export'] = config['cwm-export-content'];
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
      if (params['old_dialogNode']) {
        stash['old_dialogNode'] = params['old_dialogNode'];
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
      if (params['workspaceId']) {
        stash['workspaceId'] = params['workspaceId'];
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
    return new Promise(function resolver(resolve, reject){
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
  }

  function syncTheFile(info, msg) {
    return new Promise(function resolver(resolve, reject){
      fs.writeFile(info.path, msg.payload, function(err) {
        if (err) {
          reject('Error processing data buffer');
        }
        resolve();
      });
    });
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
    let fileInfo = null;
    let p = openTheFile()
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

  function newOldUtility(params, field) {
    let newField = 'new' + field[0].toUpperCase() + field.slice(1),
      oldField = 'old_' + field;

    if (params[oldField]) {
      if (params[field]) {
        params[newField] = params[field];
      }
      params[field] = params[oldField];
      delete params[oldField];
    }
  }

  function newUtility(params, field) {
    let newField = 'new' + field[0].toUpperCase() + field.slice(1);

    if (params[field]) {
      params[newField] = params[field];
    }
    delete params[field];
  }

  function newOldParamShift(method, params) {
    return new Promise(function resolver(resolve, reject) {
      ['intent', 'entity', 'value', 'dialogNode'].forEach(function(field) {
        newOldUtility(params, field);
      });

      switch (method) {
        case 'updateIntent' :
          ['description', 'examples'].forEach(function(field) {
            newUtility(params, field);
          });
          break;
        case 'updateEntity' :
          ['description', 'metadata', 'fuzzyMatch', 'values'].forEach(function(field) {
            newUtility(params, field);
          });
          break;
        case 'updateEntityValue' :
          ['metadata', 'type', 'synonyms', 'patterns'].forEach(function(field) {
            newUtility(params, field);
          });
          break;
        case 'updateDialogNode' :
          ['description', 'conditions', 'parent', 'previousSibling', 'output',
            'context', 'metadata', 'nextStep', 'title', 'type', 'eventName',
            'variable', 'actions', 'digressIn', 'digressOut', 'digressOutSlots',
            'userLabel', 'disambiguationOptOut'].forEach(function(field) {
            newUtility(params, field);
          });
          // deliberate no break
        case 'createDialogNode':
          if (params && params.dialog_node){
            params.dialogNode = params.dialog_node;
            delete params.dialog_node;
          }
          break;
      }

      resolve(params);
    });
  }

  function initialCheck(a, m) {
    var message = '';
    if (!a) {
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
    let node = this;

    this.on('input', function(msg, send, done) {
      let method = config['cwm-custom-mode'],
        message = '',
        params = {};

      apikey = sApikey || this.credentials.apikey || config.apikey;
      endpoint = sEndpoint;

      if (config['cwm-service-endpoint']) {
        endpoint = config['cwm-service-endpoint'];
      }

      // All method to be overridden
      if (msg.params) {
        if (msg.params.method) {
          method = msg.params.method;
        }
        if (msg.params.apikey) {
          apikey = msg.params.apikey;
        }
        if (msg.params.version) {
          version = msg.params.version;
        }
        if (msg.params.endpoint) {
          endpoint = msg.params.endpoint;
        }
      }

      node.status({});
      initialCheck(apikey, method)
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
          return newOldParamShift(method, params);
        })
        .then(function(p){
          params = p;
          node.status({fill:'blue', shape:'dot', text:'executing'});
          return executeMethod(node, method, params, msg);
        })
        .then(function(){
          temp.cleanup();
          node.status({});
          send(msg);
          done();
        })
        .catch(function(err){
          temp.cleanup();
          let errMsg = payloadutils.reportError(node, msg, err);
          done(errMsg);
        });

    });
  }

  RED.nodes.registerType('watson-conversation-v1-workspace-manager', Node, {
    credentials: {
      apikey: {type: 'password'}
    }
  });

};
