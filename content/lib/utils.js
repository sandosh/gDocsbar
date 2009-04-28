function GDOCSBARUtils() {}

(function(){
    var _CI = Components.interfaces;
    var _CC = Components.classes;
    var namespaces = [];

    this.CC = function(cName)
    {
        return _CC[cName];
    };

    this.CI = function(ifaceName)
    {
        return _CI[ifaceName];
    };

    this.CCSV = function(cName, ifaceName)
    {
        //dump(cName);
        //dump(ifaceName);
        return _CC[cName].getService(_CI[ifaceName]);
    };

    this.CCIN = function(cName, ifaceName)
    {
        return _CC[cName].createInstance(_CI[ifaceName]);
    };

    this.QI = function(obj, iface)
    {
        return obj.QueryInterface(iface);
    };

    this.ns = function(fn)
    {
        var ns = {};
        namespaces.push(fn, ns);
        return ns;
    };

    this.initialize = function()
    {
        for (var i = 0; i < namespaces.length; i += 2)
        {
            var fn = namespaces[i];
            var ns = namespaces[i+1];
            fn.apply(ns);
        }

    };
    
    this.$ = function(id){
        return document.getElementById(id);
    }
}).apply(GDOCSBARUtils);