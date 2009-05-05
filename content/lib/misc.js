/*
	Base.js, version 1.1
	Copyright 2006-2007, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/

var Base = function() {
	// dummy
};

Base.extend = function(_instance, _static) { // subclass
	var extend = Base.prototype.extend;
	
	// build the prototype
	Base._prototyping = true;
	var proto = new this;
	extend.call(proto, _instance);
	delete Base._prototyping;
	
	// create the wrapper for the constructor function
	//var constructor = proto.constructor.valueOf(); //-dean
	var constructor = proto.constructor;
	var klass = proto.constructor = function() {
		if (!Base._prototyping) {
			if (this._constructing || this.constructor == klass) { // instantiation
				this._constructing = true;
				constructor.apply(this, arguments);
				delete this._constructing;
			} else if (arguments[0] != null) { // casting
				return (arguments[0].extend || extend).call(arguments[0], proto);
			}
		}
	};
	
	// build the class interface
	klass.ancestor = this;
	klass.extend = this.extend;
	klass.forEach = this.forEach;
	klass.implement = this.implement;
	klass.prototype = proto;
	klass.toString = this.toString;
	klass.valueOf = function(type) {
		//return (type == "object") ? klass : constructor; //-dean
		return (type == "object") ? klass : constructor.valueOf();
	};
	extend.call(klass, _static);
	// class initialisation
	if (typeof klass.init == "function") klass.init();
	return klass;
};

Base.prototype = {	
	extend: function(source, value) {
		if (arguments.length > 1) { // extending with a name/value pair
			var ancestor = this[source];
			if (ancestor && (typeof value == "function") && // overriding a method?
				// the valueOf() comparison is to avoid circular references
				(!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
				/\bbase\b/.test(value)) {
				// get the underlying method
				var method = value.valueOf();
				// override
				value = function() {
					var previous = this.base || Base.prototype.base;
					this.base = ancestor;
					var returnValue = method.apply(this, arguments);
					this.base = previous;
					return returnValue;
				};
				// point to the underlying method
				value.valueOf = function(type) {
					return (type == "object") ? value : method;
				};
				value.toString = Base.toString;
			}
			this[source] = value;
		} else if (source) { // extending with an object literal
			var extend = Base.prototype.extend;
			// if this object has a customised extend method then use it
			if (!Base._prototyping && typeof this != "function") {
				extend = this.extend || extend;
			}
			var proto = {toSource: null};
			// do the "toString" and other methods manually
			var hidden = ["constructor", "toString", "valueOf"];
			// if we are prototyping then include the constructor
			var i = Base._prototyping ? 0 : 1;
			while (key = hidden[i++]) {
				if (source[key] != proto[key]) {
					extend.call(this, key, source[key]);

				}
			}
			// copy each of the source object's properties to this object
			for (var key in source) {
				if (!proto[key]) extend.call(this, key, source[key]);
			}
		}
		return this;
	},

	base: function() {
		// call this method from any other method to invoke that method's ancestor
	}
};

// initialise
Base = Base.extend({
	constructor: function() {
		this.extend(arguments[0]);
	}
}, {
	ancestor: Object,
	version: "1.1",
	
	forEach: function(object, block, context) {
		for (var key in object) {
			if (this.prototype[key] === undefined) {
				block.call(context, object[key], key, object);
			}
		}
	},
		
	implement: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == "function") {
				// if it's a function, call it
				arguments[i](this.prototype);
			} else {
				// add the interface using the extend method
				this.prototype.extend(arguments[i]);
			}
		}
		return this;
	},
	
	toString: function() {
		return String(this.valueOf());
	}
});


Function.prototype.bind = function(obj) {
  var method = this,
   temp = function() {
    return method.apply(obj, arguments);
   };
 
  return temp;
}


var debug = function() {
  dump('TiseMe: ');
  if (debug.caller && debug.caller.name)
    dump(debug.caller.name + ': ')
  for( var i=0; i < arguments.length; i++ ) {
    if( i ) dump( ', ' );
    switch( typeof arguments[i] ) {
      case 'xml':
        dump( arguments[i].toXMLString() );
        break;s
      case 'object':
        dump( '[obj]\n' );
        for( prop in arguments[i] )
          dump( ' ' + prop + ': ' + arguments[i][prop] + '\n' );
        dump( '[/obj]\n' );
        break;
      default:
        dump( arguments[i] );
    }
  }
  dump('\n');
}

function executeSoon(aFunc)
{
  var tm = Components.classes["@mozilla.org/thread-manager;1"]
                     .getService(Components.interfaces.nsIThreadManager);

  tm.mainThread.dispatch({
    run: function()
    {
      aFunc();
    }
  }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
}


function parseResponse(txt){
    var lines = txt.split(/\n/);
    re = /(\w+)(\=)(.*)/;
    output = {};
    for(var i=0; i<lines.length; i++){
        debug(lines[i]);
        ar = re.exec(lines[i]);
        if(!ar)
            continue;
        if(ar.length == 4){
            output[ar[1].toLowerCase()] = ar[3];
        }
    }
    debug(output);
    return output;
}




function UTIL_parseXmlDateTime(dateString) {
  var d = null;
  var dateParts = dateString.match( /(\d{4})-?(\d{2})-?(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))(Z)?(([+-])(\d{2}):(\d{2}))?/ );
  if (dateParts == null) {
    //
    // if dateTime didn't parse, try date
    //
    //return UTIL_parseXmlDate(dateString);
  } else {
    d = new Date();
    var year = parseInt(dateParts[1],10);
    var month = parseInt(dateParts[2],10);
    var day = parseInt(dateParts[3],10);
    var hour = parseInt(dateParts[4],10);
    var min = parseInt(dateParts[5],10);
    var sec = parseInt(dateParts[6],10);

    if ((dateParts[8] || dateParts[9]) && !(hour==0 && min==0 && sec==0)) {
      // utc mode
      d.setUTCFullYear(year);
      d.setUTCMonth(month-1);
      d.setUTCDate(day);
      d.setUTCHours(hour);
      d.setUTCMinutes(min);
      d.setUTCSeconds(sec);
      d.setUTCMilliseconds(0);

      if (dateParts[8] === 'Z') {
        // so the time is in UTC
      } else {
        // should be an offset now
        var timeOffset = 0;
        if (dateParts[10]) {
          timeOffset = Number(dateParts[11]) * 60;
          timeOffset += Number(dateParts[12]);
          timeOffset *= ((dateParts[10] === '-') ? 1 : -1);
        }
        timeOffset *= 60 * 1000;
        d = new Date(Number(d) + timeOffset);
      }

      //
      // BUGBUG - apply +/- bias from part 8
      //
    } else {
      d.setFullYear(year);
      d.setMonth(month-1);
      d.setDate(day);
      d.setHours(hour);
      d.setMinutes(min);
      d.setSeconds(sec);
      d.setMilliseconds(0);
    }
  }
  return d;
}
