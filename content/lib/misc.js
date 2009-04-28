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