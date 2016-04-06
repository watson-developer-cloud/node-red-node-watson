var AlchemyAPI = require('../');
var alchemy = new AlchemyAPI('fcb11f5cebca4850ae9771ed0678ae4222d5733e');
alchemy.sentiment('This is awesome', {}, function(err, response) {
if (err) throw err;

var sentiment = response.docSentiment;
console.log(sentiment);

});