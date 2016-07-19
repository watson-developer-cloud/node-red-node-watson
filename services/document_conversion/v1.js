module.exports = function(RED) {

	var http = require('http');
	var https = require('https');
	
	var cfEnv = require("cfenv");
	var util = require("util");
		
	var watson = require('watson-developer-cloud');
	var temp = require('temp');
	temp.track();
	var fs = require('fs');
	var fileType = require('file-type');
	var request = require('request');
  	var payloadutils = require('../../utilities/payload-utils');
	var appEnv	 = cfEnv.getAppEnv();

	var converts = [];
		
	// GNF: Read credentials information from the VCAP environment variable
	for (var i in appEnv.services) {
		// filter the services to include only the Convert ones
		if (i.match(/^(document_conversion)/i)) {
			converts = converts.concat(appEnv.services[i].map(function(v) {
				return {
					name: v.name, 
					label: v.label, 
					url: v.credentials.url,
					username: v.credentials.username,
					password: v.credentials.password
					};
			}));
		}
	}

	// GNF: This method provides service credentials when prompted from the node editor
	RED.httpAdmin.get('/convert/vcap', function(req,res) {
		res.send(JSON.stringify(converts));
	});

	function ConvertNode(config) {

		RED.nodes.createNode(this,config);

		this.name = config.name;
		this.username = config.username;
		this.password = config.password;
		this.service = config.service;		
		this.target = config.target;		

		var node = this;

		this.doCall = function(msg) {
			
			var document_conversion = watson.document_conversion({
				username: node.username,
				password: node.password,
				version: 'v1',
				version_date: '2015-12-01'
			});
			
			var stream_buffer = payloadutils.stream_buffer;

			var stream_url = payloadutils.stream_url;
			
			temp.open({suffix: '.cvt'}, function (err, info) {
				if (err) throw err;
			
				var stream_payload = (typeof msg.payload === 'string') ? stream_url : stream_buffer;
			
				stream_payload(info.path, msg.payload, function (format) {
					
					node.status({fill:"blue", shape:"dot", text:"converting"});
					document_conversion.convert({
						file: fs.createReadStream(info.path),
						conversion_target: msg.target || node.target,
						word: msg.word,
						pdf: msg.pdf,
						normalized_html: msg.normalized_html
						
					}, function (err, response) {
						node.status({});
						if (err) {
							node.error(err);
						} else {
							node.send({"payload" : response});
						}
					});
				});
			});
				
		};

		this.on('input', function (msg) {
			 this.doCall(msg);
		});
				
	}

	RED.nodes.registerType("convert",ConvertNode);

}

