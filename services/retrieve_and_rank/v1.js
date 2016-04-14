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
  var cfenv = require('cfenv');
  var fs = require('fs');
  var temp = require('temp');
  var qs = require('qs');
  var watson = require('watson-developer-cloud');
  temp.track();

  var username, password;
  var service = cfenv.getAppEnv().getServiceCreds(/retrieve rank/i);

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-retrieve-rank/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

 
  function createRankerNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {

        if (!msg.payload instanceof Buffer) {
          var message = 'Invalid property: msg.payload, must be a Buffer.';
          node.error(message, msg);
          return;
        }

        var createRanker = function(training_data, cb) {
          var params = {
            training_data: training_data
          };

          if (config.rankername) {
            params.training_metadata = '{\"name\": \"'+config.rankername+'\"}';
          }
          node.status({fill:"blue",shape:"ring",text:"Uploading training data"});
          retrieve_and_rank.createRanker(params, function(err, res) {
            node.status({fill:"blue",shape:"ring",text:"Training data uploaded. Ranker is training"});
              handleWatsonCallback(null,node,msg,err,res,function() {
                //Now check the status of the ranker
                var ranker_id = res.ranker_id;
                checkRankerStatus(retrieve_and_rank,msg,node,ranker_id);
              });;
          });
        }

        //csv training file comes in on msg.payload as a buffer
        var stream_buffer = function (file, contents, cb) {
          fs.writeFile(file, contents, function (err) {
            if (err) throw err;
            cb();
          });
        };

        temp.open({suffix: '.training'}, function (err, info) {
          if (err) throw err;
          stream_buffer(info.path, msg.payload, function () {
            createRanker(fs.createReadStream(info.path), temp.cleanup);
          });
        });
      });      
    });
  }

  function rankerSettingsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        var params = {
          ranker_id: config.rankerid
        }
        switch (config.mode) {
          case 'list':
            retrieve_and_rank.listRankers({},function(err,res) {
              handleWatsonCallback(config.mode,node,msg,err,res);
            });
            break;
          case 'info':
            if (params.ranker_id) {
              retrieve_and_rank.rankerStatus(params,function(err,res) {
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            } else {
              var message = 'No ranker id specified';
              node.error(message, msg)
              return;
            }           
            break;
          case 'delete':
            if (params.ranker_id) {
              retrieve_and_rank.deleteRanker(params,function(err,res) {
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            } else {
              var message = 'No ranker id specified';
              node.error(message, msg)
              return;
            }
            break;
        }
      });      
    });
  }

  function searchAndRankNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        
        var params = {
          cluster_id: config.clusterid,
          collection_name: config.collectionname
        };
        //Get a Solr client for indexing and searching documents.
        var solrClient = retrieve_and_rank.createSolrClient(params);

        var ranker_id = config.rankerid;
        var question = msg.payload;

        var query;

        if(config.searchmode === 'search') {
          var query = qs.stringify({q: question, fl: 'id,title'});
        } else {
          var query = qs.stringify({q: question, ranker_id: ranker_id, fl: 'id,title'});
        }

        solrClient.get('fcselect', query, function(err, searchResponse) {
          handleWatsonCallback(null,node,msg,err,searchResponse);
        });

      });      
    });
  }

  RED.nodes.registerType('watson-retrieve-rank-create-ranker', createRankerNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-ranker-settings', rankerSettingsNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-search-and-rank', searchAndRankNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });



  function setupRankRetrieveNode(msg,config,node,callback) {
    //Check for payload
    if (!msg.payload) {
      var message = 'Missing property: msg.payload';
      node.error(message, msg)
      return;
    }

    //Check credentials
    username = username || node.credentials.username;
    password = password || node.credentials.password;

    if (!username || !password) {
      message = 'Missing Concept Insights service credentials';
      return node.error(message, msg);
    }

    //Connect to Watson
    var retrieve_and_rank = watson.retrieve_and_rank({
      username: username,
      password: password,
      version: 'v1'
    });

    callback(retrieve_and_rank);
  }

  function handleWatsonCallback(mode,node,msg,err,res,cb) {
    if (err) {
      var message = "";
      (err.error) ? message = err.error : message = err.message;
      return node.error(message, msg);
    } else {
      (mode == 'delete' && Object.keys(res).length == 0) ? msg.payload = "Ranker deleted" : msg.payload = res;
      node.send(msg);
      if (cb) cb();
    }
  }

  function checkRankerStatus(retrieve_and_rank,msg,node,ranker_id) {
    var interval = 10000;
    //Loop and check the status of the ranker 
    var statusInterval = setInterval(function(){
      var params = {
        ranker_id: ranker_id
      };
      retrieve_and_rank.rankerStatus(params, function(err, res) {
          if (err) {
            node.status({});
            var message = "Ranker training state error: "+err.error;
            clearInterval(statusInterval);
            return node.error(message, msg);
          } else {
            switch (res.status) {
              case 'Available':
                node.status({fill:"green",shape:"ring",text:"Ranker available"});
                return clearInterval(statusInterval);
                break;

              case 'Training':
                break;

              default:
                node.status({});
                var message = "Ranker training status: "+res.status+", description: "+res.status_description;
                clearInterval(statusInterval);
                return node.error(message, msg);
            }
          }
      });
    },interval);
  }
};


