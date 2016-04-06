/**
 * alchemy-api - A node module for calling the Alchemy API
 * See http://www.alchemyapi.com/api/ for details about the API requests and responses
 * Copyright (c) 2012 Jason Morgan
 * MIT Licence
 */

var url = require('url');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var extend = require('./extend');
var imageType = require('image-type');

//To install via NPM type the following: `npm install alchemy-api`
var AlchemyAPI = function(api_key, opts) {
	var settings = {
		 format: "json"
		,api_url: "gateway-a.watsonplatform.net"
		,protocol: "http"
	};
	
	settings = extend(settings, opts);

	this.config = {
	    	 api_url: settings.api_url
			,protocol: settings.protocol
	};
	
	this.options = {
	    apikey: api_key
	   ,outputMode: settings.format		
	};

	return this;
};

/**
 * Returns API path depending on method being called
 * @param {String} method The Alchemy API method to call with the request
 * @return {String}
 */
AlchemyAPI.prototype._getMethodType = function(method){
	var regex = new RegExp("^(text|html|url)", "i");
	var results = regex.exec(method);
	if(results != null){
		return results[0].toLowerCase();
	}
	
	return "";
};

AlchemyAPI.prototype._getPathFromMethod = function(method){
	var results = this._getMethodType(method);
	if(results != ""){
		return "/" + results;
	}
	return "";
};


/**
 * Generates the URL object to be passed to the HTTP request for a specific
 * API method call
 * @param  {Object} query  The query object
 * @param  {String} method The Alchemy API method to call with the request
 * @return {Object} The URL object for this request
 */
AlchemyAPI.prototype._generateNiceUrl = function(query, options, method) {
  var result = url.parse(url.format({
    protocol: this.config.protocol,
    hostname: this.config.api_url,
    pathname: '/calls' + this._getPathFromMethod(method) + '/' + method,
	method: "POST",
    query: options
  }));
  // HACK: Fixes the redirection issue in node 0.4.x
  if (!result.path) { result.path = result.pathname + result.search; }
  //console.log(result);
  //if (this._urlCheck())
  return result;
};


/**
 * Function to do a HTTP request with the current query
 * @param  {Object} request_query The current query object
 * @param  {Function} cb The callback function for the returned data
 * @return {void}
 */
AlchemyAPI.prototype._doRequest = function(request_query, cb) {
  // Pass the requested URL as an object to the get request
  //console.log(request_query.nice);
  var http_protocol = (request_query.nice.protocol === 'https:') ? https : http;
  
  //var server = http.createClient(80, this.config.api_url);
  //console.log(request_query.nice.path);
  var req = http_protocol.request(request_query.nice, function(res) {
     var data = [];
     res
      .on('data', function(chunk) { data.push(chunk); })
      .on('end', function() {
          var urldata = data.join('').trim();
	  //console.log(urldata);
          var result;
          try {
            result = JSON.parse(urldata);
          } catch (exp) {
		//console.log(request_query.nice.href);
		//console.log(querystring.stringify(request_query.post));
		//console.log(urldata);
		//console.log(urldata);
            result = {'status_code': 500, 'status_text': 'JSON Parse Failed'};
          }
	  //console.log(result);
          cb(null, result);
      })
	 .on("error", function (err) {
		//console.log('response error : ' + err);
		cb(new Error("response.error: " + err), null);	
	  });

  });
  
  req.on("error", function (err) {
		cb(new Error("request.error: " + err), null);
  });

  if(req.method == "POST") {
		req.end(request_query.post.image ? request_query.post.image : querystring.stringify(request_query.post));
  } else {
		req.end();
  }

  

};


/**
 * Function to check if a passed string is a valid URL
 * @param  {String} str The URL string to be checked
 * @return {Boolean}
 */
AlchemyAPI.prototype._urlCheck = function(str) {
    var parsed = url.parse(str)
    return (!!parsed.hostname && !!parsed.protocol && str.indexOf(' ') < 0);
};

/**
 * Function to check if a passed string contains html (really just checking for tags <...>)
 * @param  {String} str The text string to be checked
 * @return {Boolean}
 */
AlchemyAPI.prototype._htmlCheck = function(str) {
    var v = new RegExp();
    v.compile("<[A-Za-z][A-Za-z0-9][^>]*>");
    if (!v.test(str)) return false;
    return true;
};

/**
 * Function to check if a passed value is a valid byte stream 
 * @param  {Byte} data Image byte stream
 * @return {Boolean}
 */
AlchemyAPI.prototype._imageCheck = function(data) {
  return data instanceof Buffer && imageType(data) !== null;
};

/**
 * Function to return request parameters based in the AlchemyAPI rest interface
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @param  {String} method The Alchemy rest service method to call   
 * @return {Object}
 */
AlchemyAPI.prototype._getQuery = function(data, opts, method) {
	var query = {};
	//console.log(this.options);
	var options = extend(this.options, opts);
	query.data = data;
	query.post = {};
	query.apimethod = "HTML" + method;
	
	var httpMethod = "POST";
	if(this._imageCheck(data)) {
		query.apimethod = "image/Image" + method;
                query.post = {image: data};
		query.headers = {
			 'content-length': data.length
			,'content-type': imageType(data).mime
		};
        }
	else if(this._urlCheck(data)){
		query.apimethod = "URL" + method;
		httpMethod = "GET";
		options.url = data;
		query.headers = {
			'content-length': '0'
		}
		//console.log("======================1==================");
	} 
	else if(!this._htmlCheck(data)){
	    query.apimethod = "Text" + method;
		query.post = {text: data};
		query.headers = {
			 'content-length': '' + querystring.stringify(query.post).length + ''
			,'content-type': 'application/x-www-form-urlencoded'
		};
		//console.log("======================2==================");
	} 
	else {
		query.post = {html: data};
		query.headers = {
			 'content-length': '' + querystring.stringify(query.post).length + ''
			,'content-type': 'application/x-www-form-urlencoded'
		};
		//console.log("======================3==================");
	}
	
	query.nice = this._generateNiceUrl(query.url, options, query.apimethod);
	query.nice.method = httpMethod;
	query.nice.headers = query.headers;
	
	return query;
	
};

/**
 * Function to return the API key usage information
 * @param  {Object} options Options to be passed to the AlchemyAPI (no options are currently supported)
 * @param cb
 */
AlchemyAPI.prototype.apiKeyInfo = function(options, cb) {
	// Since this request is nothing like the others, build it manually
	var opts = extend(this.options, opts),
		query = {
			data: "",
			post: {},
			apimethod: "info/GetAPIKeyInfo",
			headers: {
				"content-length": 0
			}
		};
	query.nice = this._generateNiceUrl(null, opts, query.apimethod)
	query.nice.method = "GET";
	query.nice.headers = query.headers;
	this._doRequest(query, cb)
};

/**
 * Function to return sentiment of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @param  {Object} options Options to be passed to the AlchemyAPI (no options are currently supported) 
 * @return {Object} 
 */
AlchemyAPI.prototype.sentiment = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetTextSentiment"), cb);
};

AlchemyAPI.prototype.sentiment_targeted = function(data, target, options, cb) {
	if(typeof target !== 'Object'){
		options.target = target;
	}
    this._doRequest(this._getQuery(data, options, "GetTargetedSentiment"), cb);
};
/**
 * Function to return relations in the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.relations = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetRelations"), cb);
};

/**
 * Function to return concepts in the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.concepts = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetRankedConcepts"), cb);
};

/**
 * Function to return entities in the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.entities = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetRankedNamedEntities"), cb);
};

/**
 * Function to return keywords in the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.keywords = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetRankedKeywords"), cb);
};

/**
 * Function to return taxonomies in the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.taxonomies = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetRankedTaxonomy"), cb);
};

/**
 * Function to return category of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.category = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetCategory"), cb);
};

/**
 * Function to return image links of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text
 * @return {Object} 
 */
AlchemyAPI.prototype.imageLink = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The imageLinks method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetImage"), cb);
};

/**
 * Function to return image keywords of the data passed in
 * @param  {String} data The text to be passed to Alchemy should be a url of a image
 * @return {Object} 
 */
AlchemyAPI.prototype.imageKeywords = function(data, options, cb) {
	if (!this._imageCheck(data) && !this._urlCheck(data)) {
		cb(new Error('The imageKeywords method can only be used with a URL or a raw byte stream. HTML encoded text and plain text is not supported.'), null);
		return;
	}

        options.imagePostMode = 'raw';
	this._doRequest(this._getQuery(data, options, "GetRankedImageKeywords"), cb);
};

/**
 * Function to detect faces in an image from the data passed in
 * @param  {String} data URL pointing to an image or the raw images bytes
 * @return {Object} 
 */
AlchemyAPI.prototype.imageFaces = function(data, options, cb) {
	if (!this._imageCheck(data) && !this._urlCheck(data)) {
		cb(new Error('The imageFaces method can only be used with a URL or a raw byte stream. HTML encoded text and plain text is not supported.'), null);
		return;
	}

        options.imagePostMode = 'raw';
	this._doRequest(this._getQuery(data, options, "GetRankedImageFaceTags"), cb);
};

/**
 * Function to return language of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url, html text or plain text 
 * @return {Object} 
 */
AlchemyAPI.prototype.language = function(data, options, cb) {
	this._doRequest(this._getQuery(data, options, "GetLanguage"), cb);
};

/**
 * Function to return author of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.author = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The author method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetAuthor"), cb);
};

/**
 * Function to return publication date of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.publicationDate = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The publicationDate method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetPubDate"), cb);
};

/**
 * Function to return plain text of the data passed in
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.text = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The text method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetText"), cb);
};

/**
 * Function to return structured plain text of the data passed in retaining semantic meanings
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.scrape = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The scrape method can only use a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetConstraintQuery"), cb);
};

/**
 * Function to return the microformats used in a URL or html text passed in
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.microformats = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The microformats method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetMicroformatData"), cb);
};

/**
 * Function to return the RSS/ATOM feeds found in a URL or html text passed in
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.feeds = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The feeds method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetFeedLinks"), cb);
};

/**
 * Function to return the title found in a URL or html text passed in
 * @param  {String} data The text to be passed to Alchemy can either a url or html text
 * @return {Object} 
 */
AlchemyAPI.prototype.title = function(data, options, cb) {
	if (!this._urlCheck(data) && !this._htmlCheck(data)) {
		cb(new Error('The text method can only be used a URL or HTML encoded text.  Plain text is not supported.'), null);
		return;
	}
	this._doRequest(this._getQuery(data, options, "GetTitle"), cb);
};

/**
 * Function to run combined feature extraction from the URL, HTML or Text that is passed in.
 * @param  {String} data The text to be passed to Alchemy can either a url, html or raw text
 * @return {Array} extract List of API features to be analysed on the input data. For valid feature names, see: http://www.alchemyapi.com/api/combined/urls.html
 * @return {Object} options Custom request parameters that are passed to the Alchemy API 
 */
AlchemyAPI.prototype.combined = function(data, extract, options, cb) {
	if (!extract.length) {
		cb(new Error('The extract parameter must contain at least ONE feature.'), null);
		return;
	}
        options.extract = extract.join(",");
	this._doRequest(this._getQuery(data, options, "GetCombinedData"), cb);
};

// Export as main entry point in this module
module.exports = AlchemyAPI;
