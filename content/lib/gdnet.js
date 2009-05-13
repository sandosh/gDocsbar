Base.prototype.getObject = function(){
    out = {}
    for(prop in this){
        if(typeof this[prop] != "function"){
            out[prop] = this[prop];
        }
    }
    return out;
}

Base.prototype.toString = function(){
    return JSON.toString(this.getObject());
}

gdAuthor = Base.extend({
    constructor: function(name, email){
        this.name = name;
        this.email = email;
    }
});

gdEntry = Base.extend({
    starred: false,
    trashed: false,
    hidden: false,
    viewed: false,
    mine: false,
    "private": false,
    "shared-with-domain": false,
    
    constructor: function(rawentryobject){
        r = rawentryobject;
        this.etag = r.gd$etag;
        this.folders = new Array();
        for(var i=0; i< r.category.length; i++){
            if(r.category[i].scheme == "http://schemas.google.com/g/2005/labels"){
                this[r.category[i].label] = true;
            }
            else if(r.category[i].scheme == "http://schemas.google.com/g/2005#kind"){
                this._type = r.category[i].label;
            }
            else if(r.category[i].scheme.indexOf("http://schemas.google.com/docs/2007/folders") > -1){
                this.folders.push(r.category[i].label);
            }
        }
        this.title = r.title.$t;
        this.published = UTIL_parseXmlDateTime(r.published.$t);
        this.updated = UTIL_parseXmlDateTime(r.updated.$t);
        this.id = r.id.$t;
        this.authors = new Array();
        for(var i=0; i< r.author.length; i++){
            this.authors.push(new gdAuthor(f.author[i].name.$t, f.author[i].email.$t));
        }
        this.resourceId = r.gd$resourceId.$t;
        this.writersCanInvite = Boolean(r.docs$writersCanInvite.value);
        this.feedLink = new Array();
        if(r['r.gd$feedLink']){
            for(var i=0; i< r.gd$feedLink.length; i++){
                this.feedLink.push(r.gd$feedLink[i].href);
            }
        }
        for(var i=0; i<r.link.length; i++){
            if(r.link[i].rel == "edit"){
                this.editLink = r.link[i].href;
            }
        }
        
    }
});

gdFeed = Base.extend({
    constructor: function(feed_json){
        f = feed_json.feed;
        this.id = f.id.$t;
        this.title = f.title.$t;
        this.updated = UTIL_parseXmlDateTime(f.updated.$t);
        this.authors = new Array();
        for(var i=0; i< f.author.length; i++){
            this.authors.push(new gdAuthor(f.author[i].name.$t, f.author[i].email.$t));
        }
        this.total = parseInt(f.openSearch$totalResults.$t);
        this.startIndex = parseInt(f.openSearch$startIndex.$t);
        this.etag = f.gd$etag;
        this.entries = new Array();
        if(f['entry']){
            for(var i=0; i < f.entry.length; i++){
                this.entries.push(new gdEntry(f.entry[i]));
            }
        }
    }
});


gdNet = Base.extend({
    _method: "POST",
    _debug: true,
    _req:null,
    constructor: function(url, method, queryparams, extraheaders){
        if(queryparams){
            url += "?"+this.http_build_query(queryparams);
        }
        this._url = url;
        this._req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
        this._req.open((method ? method : this._method), url, true);
        this._req.setRequestHeader('GData-Version','2.0');
        if(extraheaders && typeof extraheaders == "object"){
            for(prop in extraheaders){
                debug("setting header..");
                debug(prop+": "+extraheaders[prop]);
                this._req.setRequestHeader(prop, extraheaders[prop]);
            }
        }
        this._req.onreadystatechange = this.onreadystatechange.bind(this);
    },
    onreadystatechange: function(event){
        req = event.target;
        if(req.readyState == 4){
            
            if(req.status == 200){
                debug(req.status);
                this.onSuccess(req.responseText);
            }
            else{
                debug(req.status);
                debug(req.responseText);
                this.onError(req.status, req.responseText);
                
            }
        }
    },
    send: function(data){
        debug("Sending data to: "+this._url);
        this._req.send(data ? data: null);
    },
    onSuccess: function(data){
        debug("onSuccess");
    },
    onError: function(code, data){
        debug("onError: "+code)
    },
    
    http_build_query: function(var_arr, key_prefix, key_suffix){
        var str = "";
        for(key in var_arr){
            if( str.length ) str += "&";
            if( var_arr[key] instanceof Object ){
                str += http_build_query(var_arr[key], key_prefix + key +"[", "]" + key_suffix);
            }else{
                str +=  encodeURIComponent(key) + "=" + encodeURIComponent(var_arr[key]);
            }
        }
        return str;
    }
})


gdListAPI = new Base;
gdListAPI.extend({
    _host: "http://docs.google.com",
    listURL: "/feeds/documents/private/full",
    documentExport: "/feeds/download/documents/Export",
    presentationExport: "/feeds/download/presentations/Export",
    spreadsheetExport: "http://spreadsheets.google.com/feeds/download/spreadsheets/Export",
    defaultPageSize: 20,
    __options: {alt: "json", "start-index": 1, "max-results": 20},
    _options: null,
    _lasturl:null,
    _lastq:null,
    init: function(auth){
        this._auth = auth;
        this._options = new Base;
        this._options.extend(this.__options);
    },
    setupRequest: function(url, data, method, host, onSuccess, onError, extheaders){
        if(!host){
            url = this._host + url;
        }
        try{
            o = new Base;
            o.extend({"Authorization":"GoogleLogin auth="+this._auth});
            
            debug(extheaders);
            if(extheaders){
                o.extend(extheaders);
            }
            
            debug(o.getObject());
            r = new gdNet(url, method, (data ? data : null), o.getObject());
        }
        catch(e){
            debug(e);
        }
        r._onSuccess = onSuccess;
        r.onSuccess = (function(data){ this._onSuccess(this.parseResponse(data)); }).bind(r);
        r.onError = onError;
        r.parseResponse = this.parseResponse;
        return r;
    },
    parseResponse: function(data){
        debug(data);
        try{
            
            
            result = JSON.fromString(data);
            //var documentFeed = new gdFeed(result);
            
            //var serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].createInstance(Components.interfaces.nsIDOMSerializer);
            
           
            
            
            return result;
        }
        catch(e){
            debug("Exception: "+e);
            debug(data);
            return false;
        }
    },
    resetOptions: function(){
        this._options = new Base;
        this._options.extend(this.__options);
    },
    getAllDocuments: function(types, query, success, error){
        this.resetOptions();
        debug("getAllDocuments ");
        if(query){
            this._options.extend(query);
        }
        q = this._options.getObject();
        
        debug(q);
        
        url = this.listURL;
        
        if(types.showtype && types.feedtype){
            url += "/-/" + types.showtype + "/" + types.feedtype;
        }
        else if(types.feedtype){
            url +=  "/-/" + types.feedtype;
        }
        else if(types.showtype){
            url +=  "/-/" + types.showtype;
        }
        debug(url);
        mr = this.setupRequest(url, q, "GET", null, success, error);
        mr.send(null);
        
        this.lasturl = url;
        this.lastq = q;
    },
    getMoreDocuments: function(success, error){
        this.lastq['start-index'] += this.lastq['max-results'];
        mr = this.setupRequest(this.lasturl, this.lastq, "GET", null, success, error);
        mr.send(null);
    },
    refreshFeed: function(success, error){
        this.lastq['start-index'] = 1;
        mr = this.setupRequest(this.lasturl, this.lastq, "GET", null, success, error);
        mr.send(null);
    },
    rename: function(editLink, etag, success, error){
        mr = this.setupRequest(editLink, {alt: "json"}, "PUT", true, success, error, {"Content-Type": "application/atom+xml", "If-Match": etag});
        mr.send(outStr);
    }
});


var gAtomFeed = new Base;
gAtomFeed.addXMLHeader = function(txt){
    return "<?xml version='1.0' encoding='UTF-8'?>\n" + txt;
}
gAtomFeed.updateTitle = function(title, etag){
    default xml namespace="http://www.w3.org/2005/Atom";

    var phoneBook = <atom:entry xmlns:atom="http://www.w3.org/2005/Atom" gd:etag={etag} xmlns:gd="http://schemas.google.com/docs/2007">
      <atom:category scheme="http://schemas.google.com/g/2005#kind"
          term="http://schemas.google.com/docs/2007#document" label="document"/>
      <atom:title>{title}</atom:title>
    </atom:entry>;
    
    var phoneBookStr = phoneBook.toXMLString();
    return this.addXMLHeader(phoneBookStr);
}
gAtomFeed.star = function(){
    default xml namespace="http://www.w3.org/2005/Atom";

    var myxml = <atom:entry xmlns:atom="http://www.w3.org/2005/Atom" gd:etag={etag} xmlns:gd="http://schemas.google.com/docs/2007">
      <atom:category scheme="http://schemas.google.com/g/2005#kind"
          term="http://schemas.google.com/docs/2007#document" label="document"/>
      <atom:category scheme="http://schemas.google.com/g/2005/labels"
          term="http://schemas.google.com/g/2005/labels#starred" label="starred"/>
    </atom:entry>;
    
    var myxmlStr = myxml.toXMLString();
    return this.addXMLHeader(myxmlStr);
}



//gAtomFeed.updateTitle("Sandosh", "BxAaTxRZAyp7ImBq");