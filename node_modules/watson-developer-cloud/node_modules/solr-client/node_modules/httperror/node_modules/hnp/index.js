module.exports = hasNestedProperty;

/**
 * Check if the nested property describe by `path` exist
 *
 * @param {Object} object - object to test against the given `path`
 * @param {Array|String} path - path with the dot-notation and bracket-notation or an array of primitives values representing the path
 *
 * @return {Boolean}
 * @api public
 */

function hasNestedProperty (object,path){
	if(typeof object !== 'object') return false;

	if(typeof path === 'string'){
		var parts = parsePath(path);
	}else if(Array.isArray(path)){
		var parts = path;
	}else{
		return false;
	}

	var i = 0;
	while(parts.length > i){
		if(Object.hasOwnProperty.apply(object,[parts[i]])){
			object = object[parts[i]];
		}else{
			return false;
		}
		i++;
	}
	return true;

}

/**
 * Remove " or ' characters if present at the beginning AND at the end of the string
 *
 * @param {String} string -
 *
 * @return {String}
 * @api private
 */

function removeEnclosing(string){
	var isEnclosed = (string[0] === '"' && string[string.length - 1] === '"') || (string[0] === '\'' && string[string.length - 1] === '\'');
	if(isEnclosed) return string.substring(1,string.length - 1);
	return string;
}

/**
 * Parse the path following dot-notation and bracket-notation used in javascript
 *
 * @param {String} path -
 *
 * @return {Array}
 * @api private
 */

function parsePath(path){
	var parts = [];
	var matchBracket = /^(.*)?\[(.*)\]$/;
	path.split('.').forEach(function(part){
		var match = part.match(matchBracket);
		if(match){
			if(match[1]) parts.push(match[1]); // "if" handle this case "['l-ol'].otherkey"
			parts.push(removeEnclosing(match[2]));
		}else{
			parts.push(part);
		}
	});
	return parts;
}