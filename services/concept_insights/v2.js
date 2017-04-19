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
  var watson = require('watson-developer-cloud');

  var username, password;
  var service = cfenv.getAppEnv().getServiceCreds(/concept insights/i);
 
  if (service) {
    username = service.username;
    password = service.password;
  }

  RED.httpAdmin.get('/watson-concept-insights/vcap', function (req, res) {
    res.json(service ? {bound_service: true} : null);
  });

  function CorpusConfigurationNode(config) {
    RED.nodes.createNode(this,config);
    this.cname = config.cname;
    this.access = config.access;
    this.publiccorpus = config.publiccorpus;
  }

  RED.nodes.registerType("watson-concept-insights-corpus", CorpusConfigurationNode);

  function searchNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupConceptInsightsNode(msg,config,this,function(concept_insights,account_id) {
        this.corpus = RED.nodes.getNode(config.corpus);
        
        if (this.corpus) {
          var corpus_name;
          if (this.corpus.cname) {
            corpus_name = this.corpus.cname;
          } else {
            corpus_name = this.corpus.publiccorpus;
            account_id = 'public';
          }        
          var document_name = config.docname;

          node.status({fill:"blue",shape:"ring",text:"requesting..."});

          //Check for document or corpus mode
          if (config.mode === 'document') {

            if (!document_name) {
              node.status({});
              var message = 'No document name specified';
              return node.error(message, msg);
            }

            var params = {
              id: '/corpora/'+account_id+'/'+corpus_name+'/documents/'+document_name
            }

            switch (config.docapicall) {
              case 'annotations':
                params.id = params.id+'/annotations';
                concept_insights.corpora.getDocumentAnnotations(params, function(err,res) {
                  handleWatsonCallback(node,msg,err,res);
                });
                break;

              case 'relatedconcepts':
                concept_insights.corpora.getRelatedConcepts(params, function(err,res) {
                  handleWatsonCallback(node,msg,err,res);
                });
                break;

              case 'relationscores':
              params.concepts = msg.concepts;
                concept_insights.corpora.getRelationScores(params, function(err,res) {
                  handleWatsonCallback(node,msg,err,res);
                });
                break;
            }
          } else {
            //Corpus mode
            params = {
              corpus: '/corpora/'+account_id+'/'+corpus_name
            }
            switch (config.corpusapicall) {
              case 'statistics':
                concept_insights.corpora.getCorpusStats(params, function(err,res) {
                  handleWatsonCallback(node,msg,err,res);
                });
                break;

              case 'relatedconcepts':
                concept_insights.corpora.getRelatedConcepts(params, function(err,res) {
                  handleWatsonCallback(node,msg,err,res);
                });
                break;

              case 'relationscores':
                params.concepts = msg.concepts;
                concept_insights.corpora.getRelationScores(params, function(err,res) {
                  handleWatsonCallback(node,msg,err,res);
                });
                break;

              case 'conceptualsearch':
                if (msg.concepts) {
                  params.ids = msg.concepts;
                  concept_insights.corpora.getRelatedDocuments(params, function(err,res) {
                    handleWatsonCallback(node,msg,err,res);
                  });
                } else {
                  node.status({});
                  var message = 'No concepts exist on the msg object';
                  node.error(message, msg);
                }
                break;

              case 'documentlabel':

                if (params.query) {
                  params.prefix=true;
                  params.query=config.query;
                  concept_insights.corpora.searchByLabel(params, function(err,res) {
                      handleWatsonCallback(node,msg,err,res);
                  });
                } else {
                  node.status({});
                  message = 'No query term specified';
                  node.error(message, msg);
                }
                break;

              default:
                return;
            }
          }
        } else {
          message = 'No corpus configuration specified';
          return node.error(message, msg);
        }
      });
    });
  }

  RED.nodes.registerType('watson-concept-insights-search', searchNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });

  function searchConceptsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupConceptInsightsNode(msg,config,this,function(concept_insights,account_id) {
        
        //Set up parameters, searching the latest wikipedia graph
        if (!msg.payload || typeof(msg.payload) != 'string') {
          var message = "No query term specified";
          return node.error(message, msg);
        }
        var params = {
          graph: '/graphs/wikipedia/en-latest',
          query: msg.payload,
          prefix: true,
          concept_fields: '{"link":1}'
        }
        node.status({fill:"blue",shape:"ring",text:"requesting..."});
        concept_insights.graphs.searchConceptByLabel(params, function(err, res) {
          node.status({});
          if (err) {
            var message = err.error;
            return node.error(message, msg);
          } else {
            
            //Build up array of concept ids to attach to msg.concepts
            var concepts = [];
            var matches = res.matches;
            for (var i=0; i<matches.length; i++) {
              concepts.push(matches[i].id);
            }
            msg.concepts = concepts;
            msg.payload = res;
            node.send(msg);
          }
        });
      });
    });
  }

  RED.nodes.registerType('watson-concept-insights-search-concepts', searchConceptsNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });

  function relatedConceptsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupConceptInsightsNode(msg,config,this,function(concept_insights,account_id) {
       
        var params = {
          graph: '/graphs/wikipedia/en-latest',
          concepts: msg.concepts
        }
        node.status({fill:"blue",shape:"ring",text:"requesting..."});
        concept_insights.graphs.getRelatedConcepts(params, function(err, res) {
          node.status({});
          if (err) {
            var message = err.error;
            return node.error(message, msg);
          } else {
            msg.payload = res;
            node.send(msg);
          }
        }); 
      });
    }); 
  }

  RED.nodes.registerType('watson-concept-insights-related-concepts', relatedConceptsNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });


  function uploadDocumentNode (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {

      setupConceptInsightsNode(msg,config,this,function(concept_insights,account_id) {
        this.corpus = RED.nodes.getNode(config.corpus);
        if (this.corpus) {
          var corpus_name = this.corpus.cname;
          var access = this.corpus.access;

          //Private corpus takes precedence, but change to public if there is one.
          if (this.corpus.publiccorpus && !this.corpus.cname) {
            corpus_name = this.corpus.publiccorpus;
            account_id = 'public';
          }
          var params = {
            corpus: '/corpora/'+account_id+'/'+corpus_name,              
          }

          //If corpus doesn't exist, create it
          concept_insights.corpora.getCorpus(params, function(err,res) {
            if (err && err.error === 'not found') {
              //Create corpus
              params.access = access;
              node.status({fill:"blue",shape:"ring",text:"Creating corpus "+corpus_name});
              concept_insights.corpora.createCorpus(params, function(err,resp) {
                if (err) {
                  var message = "Creating Corpus error: "+err.error;
                  return node.error(message, msg);
                } else {
                  addDocument(checkStatus(msg.payload.length));
                }
              });
            } else {
              node.status({fill:"blue",shape:"ring",text:"Using existing corpus "+corpus_name});
              if (account_id !== "public") {
                addDocument(checkStatus(msg.payload.length));
              } else {
                node.status({});
                var message = "Permission denied";
                return node.error(message, msg);
              } 
            }
          });
        } else {
          var message = 'No corpus information specified';
          return node.error(message, msg);
        }

        function addDocument(cb) {
          var document_name= config.documentname;
          var document_label= config.documentlabel;
          var content_type = config.contenttype;

          //Check fields are populated
          if (document_name && document_label && content_type) {
            params = {
              'id': '/corpora/'+account_id+'/'+corpus_name+'/documents/'+document_name,
              'document': {
                'label': document_label,
                'parts': [
                {
                  'name': 'part-one',
                  'content-type': content_type,
                  'data': msg.payload
                }
                ]
              }
            };
            node.status({fill:"blue",shape:"ring",text:"Uploading document"});
            concept_insights.corpora.createDocument(params, function(err,res) {
              node.status({fill:"blue",shape:"ring",text:"Document uploaded. Started indexing"});
              if (err) {
                node.status({});
                var message = "Creating document error: "+err.error;
                return node.error(message, msg);
              } else {
                if (cb) cb(); 
              }         
            });
          } else {
            var message = "Creating document error: Missing document name, label or content type";
            return node.error(message, msg);
          }
        }    

        function checkStatus(fileLength) {

          //Calculate interval based on length of file, default to 10 seconds
          var interval = 10000;
          if (fileLength > 0) interval = (2*fileLength) + 5;
          
          //Loop and check the status of the document 
          var statusInterval = setInterval(function(){
            concept_insights.corpora.getDocumentProcessingState(params, function(err,res) {
              if (err) {
                node.status({});
                var message = "Document processing state error: "+err.error;
                clearInterval(statusInterval);
                return node.error(message, msg);
              } else {
                //get status
                if (res.status == 'ready') {
                  node.status({fill:"green",shape:"ring",text:"Document ready"});
                  return clearInterval(statusInterval);
                }
              }
            });
          },interval);
        }
      });
    });
  }

  RED.nodes.registerType('watson-concept-insights-upload-document', uploadDocumentNode, {
    credentials: {
      username: {type:"text"},
      password: {type:"password"}
    }
  });

  function setupConceptInsightsNode(msg,config,node,callback) {
  
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
    var concept_insights = watson.concept_insights({
      username: username,
      password: password,
      version: 'v2'
    });

    node.status({fill:"blue",shape:"ring",text:"Getting account information"});
    concept_insights.accounts.getAccountsInfo({},function(err,res) {
      node.status({});
      if (err) {
        var message = err.error;
        return node.error(message, msg);
      } else {
        var account_id = res.accounts[0].account_id;
        if (callback) callback(concept_insights,account_id);
      }
    });
  }

  function handleWatsonCallback(node,msg,err,res) {
    node.status({});
    if (err) {
      var message = err.error;
      return node.error(message, msg);
    } else {
      msg.payload = res;
      node.send(msg);
    }
  }
};


