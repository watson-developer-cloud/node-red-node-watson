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
  var pkg = require('../../package.json'),
    cfenv = require('cfenv'),
    fs = require('fs'),
    temp = require('temp'),
    qs = require('qs'),
    request = require('request'),
    fileType = require('file-type'),
    watson = require('watson-developer-cloud'),
    username, password,
    service = cfenv.getAppEnv().getServiceCreds(/retrieve and rank/i);

  temp.track();

  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-retrieve-and-rank/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function serviceCredentialsConfigurationNode(config) {
    RED.nodes.createNode(this,config);
    this.username = config.username;
    this.password = config.password;
  }

  function createRankerNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        if (!msg.payload instanceof String) {
          var message = 'Invalid property: msg.payload, must be a String.';
          node.error(message, msg);
          return;
        }
        var rankername, params = {
          training_data: msg.payload
        };

        (config.rankername !== '') ? rankername = config.rankername : rankername = msg.ranker_name;
        if (rankername) {
          params.training_metadata = '{\"name\": \"'+rankername+'\"}';
        }
        node.status({fill:'blue',shape:'ring',text:'Uploading training data'});
        retrieve_and_rank.createRanker(params, function(err, res) {
            handleWatsonCallback(null,node,msg,err,res,function() {
              node.status({fill:'blue',shape:'ring',text:'Training data uploaded. Ranker is training'});
              //Now check the status of the ranker
              var ranker_id = res.ranker_id;
              checkRankerStatus(retrieve_and_rank,msg,node,ranker_id);
            });;
        });
      });
    });
  }

  function rankerSettingsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        var rankerid;
        (config.rankerid !== '') ? rankerid = config.rankerid : rankerid = msg.ranker_id;
        var params = {
          ranker_id: rankerid
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

        var clusterid;
        (config.clusterid !== '') ? clusterid = config.clusterid : clusterid = msg.cluster_id;
        var collectionname;
        (config.collectionname !== '') ? collectionname = config.collectionname
         : collectionname = msg.collection_name;
        var params = {
          cluster_id: clusterid,
          collection_name: collectionname
        };
        //Get a Solr client for indexing and searching documents.
        var solrClient = retrieve_and_rank.createSolrClient(params);

        var rankerid;
        (config.rankerid !== '') ? rankerid = config.rankerid : rankerid = msg.ranker_id;
        var question = msg.payload;

        var query;

        if(config.searchmode === 'search') {
          query = qs.stringify({q: question, fl: 'id,title,body'});
        } else {
          query = qs.stringify({q: question, ranker_id: rankerid, fl: 'id,title,body'});
        }

        solrClient.get('fcselect', query, function(err, searchResponse) {
          handleWatsonCallback(null,node,msg,err,searchResponse);
        });

      });
    });
  }

  function createClusterNode(config) {
    RED.nodes.createNode(this, config)
    var node = this

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg, config, this, function (retrieve_and_rank) {

        //Cluster name can be passed into msg.payload, but the cluster name
        //specified in the config takes priority
        var clustername;
        (config.clustername !== '') ? clustername = config.clustername : clustername = msg.payload;
        var params = {
          cluster_name: clustername,
          cluster_size: config.clustersize !== 'free' ? config.clustersize : null,
        }

        node.status({ fill: 'blue', shape: 'ring', text: 'Creating cluster' });

        retrieve_and_rank.createCluster(params, function(err, res) {

          if (err) {
            node.status({});
            var message = '';
            (err.error) ? message = err.error : message = err.message;
            return node.error(message, msg);
          }

          node.status({fill: 'blue', shape: 'ring', text: 'Preparing cluster' });
            handleWatsonCallback(null, node, msg, err, res, function() {
              // Now check the status of the cluster
              var cluster_id = res.solr_cluster_id;
              checkClusterStatus(retrieve_and_rank, msg, node, cluster_id)
            })
        })
      })
    })
  }

  function clusterSettingsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        var clusterid;
        (config.clusterid !== '') ? clusterid = config.clusterid : clusterid = msg.cluster_id;
        var params = {
          cluster_id: clusterid
        }
        switch (config.mode) {
          case 'list':
            node.status({fill: 'blue', shape: 'ring', text: 'Getting clusters...' });
            retrieve_and_rank.listClusters({},function(err,res) {
              node.status({});
              handleWatsonCallback(config.mode,node,msg,err,res);
            });
            break;
          case 'info':
            if (params.cluster_id) {
              retrieve_and_rank.pollCluster(params,function(err,res) {
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            } else {
              var message = 'No cluster id specified';
              node.error(message, msg)
              return;
            }
            break;
          case 'delete':
            if (params.cluster_id) {
              retrieve_and_rank.deleteCluster(params,function(err,res) {
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            } else {
              var message = 'No cluster id specified';
              node.error(message, msg)
              return;
            }
            break;
        }
      });
    });
  }

  function uploadSolrConfigurationNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {

        //zip file comes in on msg.payload as buffer
        if (!msg.payload instanceof Buffer) {
          var message = 'Invalid property: msg.payload, must be a Buffer.';
          node.error(message, msg);
          return;
        }

        var uploadConfig = function(filePath,cb) {
          var clusterid;
          (config.clusterid !== '') ? clusterid = config.clusterid : clusterid = msg.cluster_id;
          var configname;
          (config.configname !== '') ? configname = config.configname
           : configname = msg.configuration_name;
          var params = {
            cluster_id: clusterid,
            config_name: configname,
            config_zip_path: filePath
          };
          if (!params.cluster_id || !params.config_name) {
            var message = 'No cluster id or configuration name specified';
            return node.error(message, msg);
          }
          node.status({fill: 'blue', shape: 'ring', text: 'Uploading solr configuration...' });
          retrieve_and_rank.uploadConfig(params, function (err, res) {
            node.status({});
            handleWatsonCallback(null,node,msg,err,res);
          });
        }

        var stream_buffer = function (file, contents, cb) {
          fs.writeFile(file, contents, function (err) {
            if (err) throw err;
            cb(file);
          });
        };
        temp.open({suffix: '.zip'}, function (err, info) {
          if (err) throw err;
          stream_buffer(info.path, msg.payload, function (file) {
            uploadConfig(file, temp.cleanup);
          });
        });
      });
    });
  }

  function solrConfigurationSettingsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        var clusterid;
        (config.clusterid !== '') ? clusterid = config.clusterid : clusterid = msg.cluster_id;
        var configname;
        (config.configname !== '') ? configname = config.configname : configname = msg.configuration_name;
        var params = {
          cluster_id: clusterid,
          config_name: configname
        }
        switch (config.mode) {
          case 'list':
            node.status({fill: 'blue', shape: 'ring', text: 'Getting solr configurations...' });
            retrieve_and_rank.listConfigs(params,function(err,res) {
              node.status({});
              handleWatsonCallback(config.mode,node,msg,err,res);
            });
            break;
          case 'info':
            if (params.cluster_id && params.config_name) {

              //Note. temporary workaround until bug is fixed in Node SDK
              //Stream zip file from watson api to temp directory,
              //read from temp directory and pass on in msg.payload as buffer
              var url = 'https://gateway.watsonplatform.net/retrieve-and-rank/api/v1/solr_clusters/'+params.cluster_id+'/config/'+params.config_name;
              var sendToPayload = function(zipFile, cb) {
                msg.payload = zipFile;
                node.send(msg);
                if (cb) cb();
              }

              var stream_url = function (file, location, cb) {
                var wstream = fs.createWriteStream(file);
                wstream.on('finish', function () {
                  fs.readFile(file, function (err, buf) {
                    if (err) console.error(err);
                    cb(buf);
                  })
                });
                request(location).auth(username,password)
                .pipe(wstream);
              };

              temp.open({suffix: '.zip'}, function (err, info) {
                if (err) throw err;
                stream_url(info.path, url, function (content) {
                  sendToPayload(content, temp.cleanup);
                });
              });
            } else {
              var message = 'Missing cluster id or config name';
              node.error(message, msg)
              return;
            }
            break;
          case 'delete':
            if (params.cluster_id && params.config_name) {
              retrieve_and_rank.deleteConfig(params,function(err,res) {
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            } else {
              var message = 'Missing cluster id or config name';
              node.error(message, msg)
              return;
            }
            break;
        }
      });
    });
  }

  function solrCollectionNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupRankRetrieveNode(msg,config,this,function(retrieve_and_rank) {
        var clusterid;
        (config.clusterid !== '') ? clusterid = config.clusterid : clusterid = msg.cluster_id;
        var collectionname;
        (config.collectionname !== '') ? collectionname = config.collectionname : collectionname = msg.collection_name;

        var params = {
          cluster_id: clusterid,
          collection_name: collectionname
        }
        if (!params.cluster_id || !params.collection_name) {
          var message = 'Missing cluster id or collection name';
          node.error(message, msg)
          return;
        }

        switch (config.mode) {
          case 'create':
            var configname;
             (config.configname !== '') ? configname = config.configname : configname = msg.configuration_name;
            params.config_name = configname;
            if (!configname) {
              var message = 'Missing configuration name';
              return node.error(message, msg);
            } else {
              node.status({fill: 'blue', shape: 'ring', text: 'Creating solr collection' });
              retrieve_and_rank.createCollection(params,function(err,res) {
                node.status({});
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            }
            break;
          case 'delete':
            retrieve_and_rank.deleteCollection(params,function(err,res) {
              handleWatsonCallback(config.mode,node,msg,err,res);
            });
            break;
          case 'index':

            if (msg.payload && typeof(msg.payload) == 'string') {

              var solrClient = retrieve_and_rank.createSolrClient(params);
              node.status({fill: 'blue', shape: 'ring', text: 'Indexing document' });
              solrClient.add(JSON.parse(msg.payload),function(err,res) {
                node.status({});
                handleWatsonCallback(config.mode,node,msg,err,res,function(){
                  solrClient.commit(function(err) {
                    if (err) {
                      var message = 'Error committing change: ' + err;
                      return node.error(message, msg);
                    } else {
                        msg.payload = 'Document indexed successfully';
                        node.send(msg);
                    }
                  });
                });
              });
            } else {
              var message = 'Missing or invalid document object';
              return node.error(message, msg);
            }
            break;

          case 'search':
            if (msg.payload && typeof(msg.payload) == 'string') {
              var solrClient = retrieve_and_rank.createSolrClient(params);
              var query = qs.stringify({q: msg.payload});
              node.status({fill: 'blue', shape: 'ring', text: 'Searching' });
              solrClient.search(query,function(err,res) {
                node.status({});
                handleWatsonCallback(config.mode,node,msg,err,res);
              });
            } else {
              var message = 'Missing or invalid search query';
              return node.error(message, msg);
            }
            break;
        }
      });
    });
  }

  RED.nodes.registerType('watson-retrieve-rank-credentials', serviceCredentialsConfigurationNode);
  RED.nodes.registerType('watson-retrieve-rank-create-cluster', createClusterNode);

  RED.nodes.registerType('watson-retrieve-rank-cluster-settings', clusterSettingsNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-upload-solr-configuration', uploadSolrConfigurationNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-solr-configuration-settings', solrConfigurationSettingsNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-solr-collection', solrCollectionNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-create-ranker', createRankerNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-ranker-settings', rankerSettingsNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
    }
  });
  RED.nodes.registerType('watson-retrieve-rank-search-and-rank', searchAndRankNode, {
    credentials: {
      username: {type:'text'},
      password: {type:'password'}
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
    this.credentials = RED.nodes.getNode(config.servicecreds);
    username = username || this.credentials.username;
    password = password || this.credentials.password;

    if (!username || !password) {
      message = 'Missing Retrieve and Rank service credentials';
      return node.error(message, msg);
    }

    //Connect to Watson
    var retrieve_and_rank = watson.retrieve_and_rank({
      username: username,
      password: password,
      version: 'v1',
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    });

    callback(retrieve_and_rank);
  }

  function handleWatsonCallback(mode,node,msg,err,res,cb) {
    if (err) {
      var message = '';
      if (err.description) {
        message = err.description;
      } else if (err.message) {
        message = err.message;
      } else if (err.error) {
        message = err.error;
      }
      node.status({});
      return node.error(message, msg);
    } else {
      (mode == 'delete' && Object.keys(res).length == 0) ? msg.payload = 'Ranker deleted' : msg.payload = res;
      if (mode != 'index') {
        node.send(msg);
      }
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
            console.log(err);
            var message = 'Ranker training state error: '+err.error;
            clearInterval(statusInterval);
            return node.error(message, msg);
          } else {
            switch (res.status) {
              case 'Available':
                node.status({fill:'green',shape:'ring',text:'Ranker available'});
                return clearInterval(statusInterval);
                break;

              case 'Training':
                break;

              default:
                node.status({});
                var message = 'Ranker training status: '+res.status+', description: '+res.status_description;
                clearInterval(statusInterval);
                return node.error(message, msg);
            }
          }
      });
    },interval);
  }


    function checkClusterStatus(retrieve_and_rank,msg,node,cluster_id) {
      var interval = 60000;
      //Loop and check the status of the ranker
      var statusInterval = setInterval(function(){
        var params = {
          cluster_id: cluster_id
        };
        retrieve_and_rank.pollCluster(params, function(err, res) {
            if (err) {
              node.status({});
              var message = 'Cluster creation state error: '+err.error;
              clearInterval(statusInterval);
              return node.error(message, msg);
            } else {

              switch (res.solr_cluster_status) {
                case 'READY':
                  node.status({fill:'green',shape:'ring',text:'Cluster available'});
                  return clearInterval(statusInterval);
                  break;

                case 'NOT_AVAILABLE':
                  break;

                default:
                  node.status({});
                  var message = 'Cluster status: '+res.status+', description: '+res.status_description;
                  clearInterval(statusInterval);
                  return node.error(message, msg);
              }
            }
        });
      },interval);
    }
};
