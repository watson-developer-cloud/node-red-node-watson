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

 module.exports = function (RED) {
  var request = require('request');
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

  function ConceptInsightsNode(config) {
    RED.nodes.createNode(this,config);
    this.cname = config.cname;
    this.access = config.access;
    this.publiccorpus = config.publiccorpus;
  }

  RED.nodes.registerType("watson-concept-insights-corpus",ConceptInsightsNode);

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
            console.log(this.corpus);
            corpus_name = this.corpus.publiccorpus;
            account_id = 'public';
          }        
          var document_name = config.docname;

          node.status({fill:"blue",shape:"ring",text:"requesting..."});
          if (config.mode === 'document') {

            var params = {
              id: '/corpora/'+account_id+'/'+corpus_name+'/documents/'+document_name
            }

            switch (config.docapicall) {
              case 'annotations':

                params.id = params.id+'/annotations';
                
                //Request annotations from concept insights api
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
            //corpus
            var params = {
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
                  break;

                } else {
                  node.status({});
                  var message = 'No ids on the msg object';
                  node.error(message, msg)
                  break;
                }

              case 'documentlabel':
                params.prefix=true;
                params.query=config.query;
                concept_insights.corpora.searchByLabel(params, function(err,res) {
                    handleWatsonCallback(node,msg,err,res);
                  });
                break;

                default:
                  return;
            }
          }

        } else {
          var message = 'No corpus configuration specified';
          node.error(message, msg)
          return;
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

  function handleWatsonCallback(node,msg,err,res) {
    node.status({});
    if (err) {
      var message = err.error;
      node.error(message, msg)
      return;
    } else {
      msg.payload = res;
      node.send(msg);
    }
  }

  function searchConceptsNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      setupConceptInsightsNode(msg,config,this,function(concept_insights,account_id) {
        
        //set up parameters
        var params = {
          graph: '/graphs/wikipedia/en-latest',
          query: config.query,
          prefix: true,
          concept_fields: '{"link":1}'
        }
        node.status({fill:"blue",shape:"ring",text:"requesting..."});
        concept_insights.graphs.searchConceptByLabel(params, function(err, res) {
          node.status({});
          if (err) {
            var message = err.error;
            node.error(message, msg)
            return;
          } else {
            
            //Build up array of concept ids
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
            node.error(message, msg)
            return;
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


  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function (msg) {

      setupConceptInsightsNode(msg,config,this,function(concept_insights,account_id) {

        // Retrieve the corpus config node
        this.corpus = RED.nodes.getNode(config.corpus);
        if (this.corpus) {
          var corpus_name = this.corpus.cname;
          var access = this.corpus.access;

          var params = {
            corpus: '/corpora/'+account_id+'/'+corpus_name,              
          }

          //Check if corpus exists
          concept_insights.corpora.getCorpus(params, function(err,res) {
            if (err && err.error === 'not found') {

                //Create corpus
                params.access = access;
                node.status({fill:"blue",shape:"ring",text:"Creating corpus "+corpus_name});
                concept_insights.corpora.createCorpus(params, function(err,resp) {

                  if (err) {
                    var message = err.error;
                    node.error(message, msg)
                    return;
                  }
                  addDocument(checkStatus);
                });

              } else {
                node.status({fill:"blue",shape:"ring",text:"Using existing corpus "+corpus_name});
                addDocument(checkStatus);
              }
            });
        } else {
          var message = 'No corpus information specified';
          node.error(message, msg)
          return;
        }


        function addDocument(cb) {
          //Create document 
          var document_name= config.documentname;
          var document_label= config.documentlabel;
          var content_type = config.contenttype;
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
          }

          node.status({fill:"blue",shape:"ring",text:"Uploading document"});
          concept_insights.corpora.createDocument(params, function(err,res) {
            node.status({fill:"blue",shape:"ring",text:"Document uploaded. Started indexing"});
            if (err) {
              node.status({});
              var message = err.error;
              node.error(message, msg)
              return;
            }
            if (cb) cb();            
          });
        }

        function checkStatus() {
          //Loop every 10 secs and check the status of the document 
          var statusInterval = setInterval(function(){
            concept_insights.corpora.getDocumentProcessingState(params, function(err,res) {
              if (err) {
                node.status({});
                var message = err.error;
                node.error(message, msg)
                return;
              } else {
                //get status
                if (res.status == 'ready') {
                  node.status({fill:"green",shape:"ring",text:"Document ready"});
                  return clearInterval(statusInterval);
                }

              }
            });
          },10000);
        }
      });
    });
  }

  RED.nodes.registerType('watson-concept-insights', Node, {
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
      var message = 'Missing Concept Insights service credentials';
      node.error(message, msg)
      return;
    }

    //Connect to Watson
    var concept_insights = watson.concept_insights({
      username: username,
      password: password,
      version: 'v2'
    });

    concept_insights.accounts.getAccountsInfo({},function(err,res) {
      node.status({fill:"blue",shape:"ring",text:"Getting account information"});
      if (err) {
        var message = err.error;
        node.error(message, msg)
        return;
      } else {
        node.status({});
        var account_id = res.accounts[0].account_id;
        if (callback) callback(concept_insights,account_id);
      }
    });
  }
};


