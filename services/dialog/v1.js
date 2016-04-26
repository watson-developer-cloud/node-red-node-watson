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
  var temp = require('temp');
  var async = require('async');
  var watson = require('watson-developer-cloud');
  temp.track();

  // Require the Cloud Foundry Module to pull credentials from bound service 
  // If they are found then they are stored in sUsername and sPassword, as the 
  // service credentials. This separation from sUsername and username to allow 
  // the end user to modify the node credentials when the service is not bound.
  // Otherwise, once set username would never get reset, resulting in a frustrated
  // user who, when he errenously enters bad credentials, can't figure out why
  // the edited ones are not being taken.
	
  var services = cfenv.getAppEnv().services;

  var username, password, sUsername, sPassword;
  var service = cfenv.getAppEnv().getServiceCreds(/dialog/i);
  
  if (service) {
    sUsername = service.username;
    sPassword = service.password;
  }
  
  RED.httpAdmin.get('/service-dialog/vcap', function (req, res) {
		res.json(service ? {bound_service: true} : null);
  });  
  
  
  // This is the Dialog Node. 
  // The node supports six modes
  // create a dialog from a dialog template
  // delete a dialog : the Watson Dialog service Instance is limited to 10 dialog instances
  // list - retrieves a list of the Dialogs
  // start conversation - initiates a conversation with an existing conversation
  // continue a conversation - continues with a started conversation
  // get profile variable - GETs the profile variables associated with the dialog

  function WatsonDialogNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;
   
    this.log('Watson Developer Cloud Contribution - Dialog Node Instantiated') ;
	
    this.on('input', function (msg) {
      this.log('Watson Developer Cloud Contribution - Input received');
		
      var message = '';
      if (!msg.payload) {
			 message = 'Missing property: msg.payload';
			 node.error(message, msg);
			 return;
      }

      var username = sUsername || this.credentials.username;
      var password = sPassword || this.credentials.password;
      this.status({});  
			
      if (!username || !password) {
        this.status({fill:'red', shape:'ring', text:'missing credentials'});  
        message = 'Missing Watson Dialog service credentials';
        this.error(message, msg);
        return;
      } 

      var dialog = watson.dialog({
        username: username,
        password: password,
        version: 'v1'
      });	  

      var params = {};
      if (config.mode === 'create') {
        performCreate(node,dialog,msg);
      }
      else if (config.mode === 'delete') {
        performDelete(node,dialog,msg,config);
      }
      else if (config.mode === 'deleteall') {
        performDeleteAll(node,dialog,msg,config);
      }
       else if (config.mode === 'list') {
        performList(node,dialog,msg);
      } else if (config.mode === 'startconverse' || config.mode === 'converse' || config.mode === 'getprofile') {
          var dialogid = config.dialog;
          var clientid = config.clientid;
          var converseid = config.converse;

          if (!dialogid || '' == dialogid) {
            if (msg.dialog_params && 'dialog_id' in msg.dialog_params) {
              dialogid = msg.dialog_params['dialog_id'];
            }	
          }
		  
          if (!dialogid || '' == dialogid) {
            message = 'Missing Dialog ID';
            node.status({fill:'red', shape:'dot', text:message});	
            node.error(message, msg);	
          }			
			
          if (config.mode === 'converse'  || config.mode === 'getprofile') {
            if (!clientid || '' == clientid) {
              if (msg.dialog_params && 'client_id' in msg.dialog_params) {
                clientid = msg.dialog_params['client_id'];
              }	
            }				  
            if (!converseid || '' === converseid) {
              if (msg.dialog_params && 'converse_id' in msg.dialog_params) {
                converseid = msg.dialog_params['converse_id'];
              }	
            }				  
		    if (!clientid || '' === clientid) {
              message = 'Missing Client ID';
              node.status({fill:'red', shape:'dot', text:message});	
              node.error(message, msg);	
            }
            if (!converseid || '' === converseid) {
              var message = 'Missing Conversation ID';
              node.status({fill:'red', shape:'dot', text:message});	
              node.error(message, msg);	
            }
            params.client_id = clientid;
            params.conversation_id = converseid;
          }

          params.dialog_id = dialogid;
          params.input = msg.payload;
		  
          if (config.mode === 'startconverse' || config.mode === 'converse') {			  
            node.status({fill:'blue', shape:'dot', text:'Starting Dialog Conversation'});
            dialog.conversation (params, function (err, dialog_data) {
              node.status({});
              if (err) {
                node.status({fill:'red', shape:'ring', text:'call to dialog service failed'}); 
                console.log('Error:', msg, err);
                node.error(err, msg);
              } else {
                msg.dialog = dialog_data;		  
                msg.payload = 'Check msg.dialog dialog data';
                node.send(msg);
              }   
            });
          }
          else {
            node.status({fill:'blue', shape:'dot', text:'Requesting dialog profile variables'});
            dialog.getProfile (params, function (err, dialog_data) {
              node.status({});
              if (err) {
                node.status({fill:'red', shape:'ring', text:'call to dialog service failed'}); 
                node.error(err, msg);
              } else {
                msg.dialog = dialog_data;		  
                msg.payload = 'Check msg.dialog dialog data';
                node.send(msg);
              }  
            });
         }			  
      } 	  
    });
  }

  // This function creates a new dialog template. The name must be unique, the file can be in any
  // accepted format, and be either a text file or a binary buffer.
  function performCreate(node,dialog,msg) {
    var params = {}
    node.status({fill:'blue', shape:'dot', text:'requesting create of new dialog template'});	 
    //if ('file' in msg.dialog_params && 'dialog_name' in msg.dialog_params) {
    if ('dialog_name' in msg.dialog_params) {  
      // extension supported : only XML
      // TODO : support other API format (json and encrypted crt)
      temp.open({suffix: '.xml'}, function (err, info) {
        if (err) throw err;
        //var fileBuffer = msg.dialog_params['file'];
        var fileBuffer = msg.payload;
        fs.writeFile(info.path, fileBuffer, function (err) {
            if (err) {
              console.error(err);
              throw err;
            }
            var aFileStream = fs.createReadStream(info.path);
            params.file = aFileStream;
            params.name = msg.dialog_params['dialog_name'];
            // Watson SDK call
            dialog.createDialog(params, function(err, dialog_data){
                  node.status({});
                  if (err) {
                    node.status({fill:'red', shape:'ring', text:'call to dialog service failed'}); 
                    node.error(err, msg);
                  } else {
                    msg.dialog = dialog_data;     
                    msg.payload = 'Check msg.dialog dialog data';
                    node.send(msg);
                  }       
            });  
        });
     });
    } /* else if (! 'file' in msg.dialog_params) {
      var errtxt = 'Missing Dialog template file';
      node.status({fill:'red', shape:'ring', text:errtxt}); 		
      node.error(errtxt, msg);
    }*/
    else {
      errtxt = 'dialog_name not specified';
      node.status({fill:'red', shape:'ring', text:errtxt}); 		
      node.error(errtxt, msg); 
    }   
  }

// This function delete an existing dialog instance.
  function performDelete(node,dialog,msg, config) {
    var params = {};
    var message = '';
    node.status({fill:'blue', shape:'dot', text:'requesting delete of a dialog instance'}); 

    if (!config.dialog || '' != config.dialog) {
    
      params.dialog_id = config.dialog;

      dialog.deleteDialog(params, function(err, dialog_data){
          node.status({});
          if (!err) {
              message='Dialog deleted successfully';
              msg.dialog = dialog_data;     
              msg.payload = message;
              node.send(msg);
          } else if (err && err.code==404) {
              message='Dialog already deleted or not existing (404)';
              node.status({fill:'green', shape:'dot', text:message});      
              msg.payload = message;
              console.log(err);
              node.error(message, msg);
          } else {
              node.status({fill:'red', shape:'ring', text:'call to dialog service failed'}); 
              node.error(err, msg);
              console.log(err);
          }
      });  
    } else {
      message = 'Dialog Id not specified';
      node.status({fill:'red', shape:'ring', text:message});    
      node.error(errmessage, msg); 
    }   
  }

  // This function performs the operation to fetch a list of all dialog templates
  function performList(node,dialog,msg) {
  
  node.status({fill:'blue', shape:'dot', text:'requesting list of dialogs'});	    
	dialog.getDialogs({}, function(err, dialogs){
    node.status({});
	  if (err) {
        node.status({fill:'red', shape:'ring', text:'call to dialog service failed'});
        node.error(err, msg);		
      } else {
        msg.dialog = dialogs;
        msg.payload = 'Check msg.dialog for list of dialogs';
        node.send(msg);
      }		  
    });
  }		

  // This function performs the operation to Delete ALL Dialogs
  function performDeleteAll(node,dialog,msg) {

    node.status({fill:'blue', shape:'dot', text:'requesting Delete All dialogs'});   
    dialog.getDialogs({}, function(err, dialogs){
      node.status({});
      if (err) {
          node.status({fill:'red', shape:'ring', text:'Delete All : call to getDialogs service failed'});
          node.error(err, msg);   
        } else {
          // Array to hold async tasks
          var asyncTasks = [];
          var nb_todelete = dialogs.dialogs.length;
          var nbdeleted = 0;
          dialogs.dialogs.forEach(function (aDialog) {

              asyncTasks.push(function (cb) {
                var parms = {};
                parms.dialog_id=aDialog.dialog_id;;
                dialog.deleteDialog(parms, function(err, dialog_data){
                node.status({});
                if (err) {
                    node.error(err, msg);
                    console.log('Error with the removal of Dialog ID '+parms.dialog_id +' : ' +  err);
                  } else {
                    console.log('Dialog ID '+ aDialog.dialog_id + ' deleted successfully.');
                    nbdeleted++;
                  }
                  cb();
                });  
              });
          });

        } // else

        async.parallel(asyncTasks, function(){
          // All tasks are done now
          console.log('Deleted ' + nbdeleted + ' dialog objects on ' + nb_todelete );
          if (nbdeleted==nb_todelete)
            msg.payload = 'All Dialogs have been deleted';
          else
            msg.payload = 'Some Dialogs could have not been deleted; See node-RED log for errors.';
          console.log(msg.payload);
          node.send(msg);            
        });

      });
  
    }  // delete all func 

  
  //Register the node as service-dialog to nodeRED 
  RED.nodes.registerType('service-dialog', 
                         WatsonDialogNode, 
                         {credentials: { username: {type:'text'},
                                         password: {type:'password'}
                                       }
                         });
							
};


