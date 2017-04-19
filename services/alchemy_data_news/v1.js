module.exports = function(RED) {

	var cfEnv = require("cfenv");
	var appEnv   = cfEnv.getAppEnv();

	var watson = require('watson-developer-cloud');

	var newss = [];
	for (var i in appEnv.services) {
		if (i.match(/^(alchemy_api)/i)) {
			newss = newss.concat(appEnv.services[i].map(function(v) {
				return {
					name: v.name, 
					label: v.label, 
					key: v.credentials.apikey
					};
			}));
		}
	}

	RED.httpAdmin.get('/watson-news/vcap', function(req,res) {
		res.send(JSON.stringify(newss));
	});

	function NewsNode(config) {

		RED.nodes.createNode(this,config);
		
		var node = this;

		this.name = config.name;
		this.service = config.service;
		this.key = config.key;
		this.start = config.start;
		this.end = config.end;
		this.max = config.max;
		this.mode = config.node;
		this.custom = config.custom;
		this.query = config.query;
		this.queries = config.queries;
		this.results = config.results;

		this.buildQuery = function(params) {
			var queries=[];
			for (var i=0;i<node.queries.length;i++) {
				var op1,op2;
				var q = node.queries[i];
				switch (q.op) {
					case 'cc':
						op1 = "[";
						op2 = "]";
						break;
					case 'nc':
						op1 = "-[";
						op2 = "]";
						break;
					case 'gt':
						op1 = ">";
						op2 = "";
						break;
					case 'ge':
						op1 = ">=";
						op2 = "";
						break;
					case 'lt':
						op1 = "<";
						op2 = "";
						break;
					case 'le':
						op1 = "<=";
						op2 = "";
						break;
				}
				params['q.'+q.field]=op1+q.value+op2;
			}	
		};

		this.buildCustomQuery = function(params,query) {
			var	values = query.split('&');
			for (var i=0;i<values.length;i++) {
				var value = values[i];
				var a = value.indexOf('=');
				var field = value.substr(0,a);
				params[field]=value.substr(a+1);
			}	
		};

		this.on('input', function (msg) {
			var alchemy_data_news = watson.alchemy_data_news({
				api_key: node.key
			});

			var params = {
				start: new Date(msg.start || node.start).getTime()/1000, //'now-1d',
				end: new Date(msg.end || node.end).getTime()/1000, //'now',
				maxResults: msg.maximum || node.max,
				outputMode: msg.mode || node.mode,
				return: msg.result || node.results.toString()
			};

			if (msg.query ||node.query) {
				this.buildCustomQuery(params,msg.query || node.query);
			} else {
				this.buildQuery(params);
			}

			alchemy_data_news.getNews(params, function (err, news) {
				if (err) {
					node.error(err);
				} else {
					msg.payload = news;
					node.send(msg);
				}
			});
		});
	}

	RED.nodes.registerType("news",NewsNode);

}


