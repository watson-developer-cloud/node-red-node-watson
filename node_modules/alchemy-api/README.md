 alchemy-api - An Alchemy API library for Node.js
====================
[![Build Status](https://secure.travis-ci.org/framingeinstein/node-alchemy.png)](http://travis-ci.org/framingeinstein/node-alchemy)

This module provides calls to the [AlchemyAPI](http://www.alchemyapi.com/) for [Nodejs](http://nodejs.org).
For more information on the API request and responses visit the [AlchemyAPI docs](http://www.alchemyapi.com/api/).  To use the module you will need to obtain an api key from [Alchemy](http://www.alchemyapi.com/api/register.html).

Installation
------------
You can install this through npm: npm install alchemy-api

You can also install via git by cloning: `git clone https://github.com/framingeinstein/node-alchemy.git /path/to/alchemy-api`

Usage
-----
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.sentiment('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/ for format of returned object
      var sentiment = response.docSentiment;

      // Do something with data
    });

Tests
-----
To run tests type `npm test`

AlchemyAPI Features
---------------

Named Entity Extraction
-----------------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.entities('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/entity/htmlc.html for format of returned object
      var entities = response.entities;

      // Do something with data
    });

Sentiment Analysis
------------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.sentiment('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/sentiment/htmlc.html for format of returned object
      var sentiment = response.docSentiment;

      // Do something with data
    });

Targeted Sentiment Analysis
------------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.sentiment_targeted('<URL|HTML|TEXT>', '<Target>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/sentiment/htmlc.html for format of returned object
      var sentiment = response.docSentiment;

      // Do something with data
    });

Relation Extraction
-------------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.relations('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/relation/htmlc.html for format of returned object
      var relations = response.relations;

      // Do something with data
    });

Concept Tagging
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.concepts('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/concept/htmlc.html for format of returned object
      var concepts = response.concepts;

      // Do something with data
    });

Keyword / Terminology Extraction
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.keywords('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/keyword/htmlc.html for format of returned object
      var keywords = response.keywords;

      // Do something with data
    });

Taxonomy
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.taxonomies('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/taxonomy_calls/html.html for format of returned object
      var taxonomies = response.taxonomies;

      // Do something with data
    });

Topic Categorization
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.category('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/categ/htmlc.html for format of returned object
      var category = response.category;

      // Do something with data
    });

Image Link Extraction (Main Image)
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.imageLink('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/image-link-extraction/htmlc.html for format of returned object
      var image = response.image;

      // Do something with data
    });

Image Tags/Keyword Extraction
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.imageKeywords('<URL|IMAGE>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/image-tagging/urls.html for format of returned object
      var imageKeywords = response.imageKeywords;

      // Do something with data
    });

Image Faces Detection 
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.imageFaces('<URL|IMAGE>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/face-detection/urls.html for format of returned object
      var imageFaces = response.imageFaces;

      // Do something with data
    });

Language Detection
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.language('<URL|HTML|TEXT>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/lang/htmlc.html for format of returned object
      var language = response.language;

      // Do something with data
    });

Author Extraction
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.author('<URL|HTML>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/author/htmlc.html for format of returned object
      var author = response.author;

      // Do something with data
    });

Text Extraction / Web Page Cleaning
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.text('<URL|HTML>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/text/htmlc.html for format of returned object
      var text = response.text;

      // Do something with data
    });

Structured Content Scraping
---------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.scrape('<URL|HTML>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/scrape/htmlc.html for format of returned object
      var results = response.queryResults;

      // Do something with data
    });

Microformats
------------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.microformats('<URL|HTML>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/mformat/htmlc.html for format of returned object
      var microformats = response.microformats;

      // Do something with data
    });

RSS / ATOM Feed Discovery
----------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.feeds('<URL|HTML>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/feed/htmlc.html for format of returned object
      var feeds = response.feeds;

      // Do something with data
    });

Publication Date
----------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.publicationDate('<URL|HTML>', {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/publication-date/htmlc.html for format of returned object
      var publicationDate = response.publicationDate; //YYYYMMDDTHHMMSS string

      // Do something with data
    });

Combined Feature Extraction Call
----------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.combined('<URL|HTML|TEXT>', ["FEATURE_NAME",...], {}, function(err, response) {
      if (err) throw err;

      // See http://www.alchemyapi.com/api/combined-call/ for format of returned object.
      // Each feature response will be available as a separate property.
      var feature_response = response.FEATURE_NAME; 

      // Do something with data
    });

API Key Information
----------
    var AlchemyAPI = require('alchemy-api');
    var alchemy = new AlchemyAPI('<YOUR API KEY>');
    alchemy.apiKeyInfo({}, function(err, response) {
      if (err) throw err;

      // Do something with data
      console.log('Status:', response.status, 'Consumed:', response.consumedDailyTransactions, 'Limit:', response.dailyTransactionLimit);
      
    });
