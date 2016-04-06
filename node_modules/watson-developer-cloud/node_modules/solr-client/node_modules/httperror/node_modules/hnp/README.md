# hnp - hasNestedProperty method

# Usage

```js
var hasNestedProperty = require('hnp');

var o = {
	lol : {
		yes : 'why?'
	}
};

// hasNestedProperty(object,path)
if(hasNestedProperty(o,'lol.yes')) console.log('yes property is there');
if(hasNestedProperty(o,'lol.no') === false) console.log('no property is not available');

```

# Licence

Copyright(C) 2012 Rémy Loubradou

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE 
				Version 2, December 2004 

Copyright (C) 2004 Sam Hocevar <sam@hocevar.net> 

Everyone is permitted to copy and distribute verbatim or modified 
copies of this license document, and changing it is allowed as long 
as the name is changed. 

        DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE 
TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION 

0. You just DO WHAT THE FUCK YOU WANT TO. 