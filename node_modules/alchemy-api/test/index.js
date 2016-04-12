var Alchemy = require('../');

var testURL = "https://github.com/framingeinstein/node-alchemy";
var testRSSURL = "http://www.cnn.com/services/rss/";
var testAuthorURL = "http://www.cnn.com/2014/08/09/world/meast/iraq-crisis/index.html?hpt=hp_t1s";
var testHTML = '<html><head><title>Alchemy Test HTML</title><meta name="author" content="Jason Morgan" /></head><body><h1>Alchemy Test HTML</h1><p>This is something I am writing about.  I have to write this as I do not feel like getting it from the web.  So here it is.  A bunch of text to test the API with</p><div class="geo">GEO: <span class="latitude">37.386013</span>, <span class="longitude">-122.082932</span></div></body></html>';
var testImageURL = "https://www.google.co.za/images/srpr/logo11w.png";

var apikey = "fcb11f5cebca4850ae9771ed0678ae4222d5733e";

module.exports = {
	'check html match': function(test) {
		var alchemy = new Alchemy(apikey);
		var result = alchemy._htmlCheck(testHTML);
		test.deepEqual(result, true);
		test.done();    
	},
	'check url match': function(test){
		var alchemy = new Alchemy(apikey);
		test.equal(alchemy._urlCheck(testURL), true);
		test.equal(alchemy._urlCheck(testHTML), false);
		test.equal(alchemy._urlCheck("http://feedproxy.google.com/~r/nmecom/rss/newsxml/~3/oAtTtYbCpl0/story01.htm"), true);
		test.equal(alchemy._urlCheck('http://google.com is my favorite site ever'), false);
		test.done();
	},
	'get api key info': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.apiKeyInfo({}, function(error, result) {
			test.ifError(error);
			test.ok(result);
			test.ok(result.hasOwnProperty('status'));
			test.ok(result.hasOwnProperty('consumedDailyTransactions'));
			test.ok(result.hasOwnProperty('dailyTransactionLimit'));
			//console.log(result.docSentiment);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	},
	'get sentiment': function(test) {
		var alchemy = new Alchemy(apikey);
	        alchemy.sentiment(testURL, {}, function(error, result) {
			test.ifError(error);
			//console.log(result.docSentiment);
			//test.deepEqual(result.status, "OK");
			test.done();
	        });
	},
	'get sentiment_targeted': function(test) {
		var alchemy = new Alchemy(apikey);
	        alchemy.sentiment_targeted("Guy Somethington is an candidate but Hillary is not", "Guy Somethington", {}, function(error, result) {
			test.ifError(error);

			//console.log(result);
			test.deepEqual(result.docSentiment.type, "positive");
			test.done();
	        });
	},
	'get sentiment_targeted 2': function(test) {
		var alchemy = new Alchemy(apikey);
	        alchemy.sentiment_targeted("Guy Somethington is an awesome candidate but Billary is not", "Billary", {}, function(error, result) {
			test.ifError(error);
			test.deepEqual(result.docSentiment.type, "negative");
			//console.log(result);
			//test.deepEqual(result.status, "OK");
			test.done();
	        });
	},
	'get relations': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.relations(testURL, {sentiment: 1}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		 });
	 },
	'get concepts': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.concepts(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		 });
	 },
	'get entities': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.entities(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		 });
	 },	
	'get keywords': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.keywords(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get russian keywords': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.keywords("http://www.framingeinstein.com/russian.html", {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get russian keywords from text': function(test) {
		var alchemy = new Alchemy(apikey);
		var text = "сервис, который поможет все успеть и ничего не пропустить Создание событий добавьте в календарь напоминание о фильме или концерте или создавайте напоминания о своих делах Оповещение настройте оповещение и календарь предупредит вас Используйте другие службы Яндекса добавляйте события из Телепрограммы или Афиши";
		alchemy.keywords(text, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	},	
	'get taxonomies': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.taxonomies(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get category': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.category(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get image link': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.imageLink(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get image keywords': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.imageKeywords(testImageURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get language': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.language(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get language from html': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.language(testHTML, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get author': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.author(testAuthorURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			test.deepEqual(result.status, "OK");
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get publication date': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.publicationDate(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			test.deepEqual(result.status, "OK");
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'scrape text': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.scrape(testURL, {cquery:"all readme"}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get microformats': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.microformats(testURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			test.deepEqual(result.status, "OK");
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'get feeds': function(test) {
		var alchemy = new Alchemy(apikey);
		alchemy.feeds(testRSSURL, {}, function(error, result) {
			//console.log(result);
			test.ifError(error);
			test.deepEqual(result.status, "OK");
			//test.deepEqual(result.status, "OK");
			test.done();
		});
	 },
	'small positive text': function(test){
		var alchemy = new Alchemy(apikey);
		alchemy.sentiment("This is awesome", {}, function(error, result) {
			test.ifError(error);
			//console.log(result.docSentiment);
			test.deepEqual(result.docSentiment.type, "positive");
			test.done();
   	       });
	}
};
