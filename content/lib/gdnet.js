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
        this.resourceId = r.gd$resourceId.$t.split(":")[1];
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
        debug("constructing gdfeed..");
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
        
        debug(this);
    }
});


gdNet = Base.extend({
    _method: "POST",
    _debug: true,
    _req:null,
    constructor: function(url, method, queryparams, extraheaders){
        if(queryparams){
            url +=  (url.indexOf("?") == -1 ? "?" : "&")  +this.http_build_query(queryparams);
            debug(url);
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

gdBrowser = new Base;
gdBrowser.extend({
  _host: "http://docs.google.com",
  init: function() {
    this._mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
    this._gBrowser = this._mainWindow.getBrowser();
  },
  preview: function(gdEntryEl) {
    debug("in preview");
    url = this._host + "/View?revision=_latest&docid=" + gdEntryEl.getAttribute('resourceId');
    this._gBrowser.selectedTab = this._gBrowser.addTab(url);
  }
});

gdListAPI = new Base;
gdListAPI.extend({
    _host: "http://docs.google.com",
    listURL: "/feeds/documents/private/full",
    documentExport: "http://docs.google.com/feeds/download/documents/Export",
    presentationExport: "http://docs.google.com/feeds/download/presentations/Export",
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
        try{
            //debug(data);     
            if(data) {  
            result = JSON.fromString(data);
            //var documentFeed = new gdFeed(result);
            //var serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].createInstance(Components.interfaces.nsIDOMSerializer);
            return result;
            } else {
              // happens on document deletions
              return data;
            }
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
    rename: function(gdEntryEl,newName){
        debug("in rename3");
        editLink = gdEntryEl.getAttribute('edit');
        etag = gdEntryEl.getAttribute('etag');
        starred = (gdEntryEl.getAttribute('star') == 'star' ? true : false);
        outStr = outStr = gAtomFeed.getUpdateXML(gdEntryEl, 'title');
        mr = this.setupRequest(editLink, {alt: "json"}, "PUT", true,gdEntryEl.nameSaved.bind(gdEntryEl), gdEntryEl.nameSavedError.bind(gdEntryEl) , {"Content-Type": "application/atom+xml", "If-Match": etag});
        mr.send(outStr);
    },
    star: function(gdEntryEl) {
        debug("in star 2");
        editLink = gdEntryEl.getAttribute('edit');
        etag = gdEntryEl.getAttribute('etag');
        outStr = gAtomFeed.getUpdateXML(gdEntryEl, 'star'); //star(gdEntryEl.getAttribute('name'), etag);
        mr = this.setupRequest(editLink, {alt: "json"}, "PUT", true, gdEntryEl.nameSaved.bind(gdEntryEl), gdEntryEl.nameSavedError.bind(gdEntryEl)  , {"Content-Type": "application/atom+xml", "If-Match": etag});
        mr.send(outStr);
        debug(outStr);
    },
    unstar: function(gdEntryEl){
        editLink = gdEntryEl.getAttribute('edit');
        etag = gdEntryEl.getAttribute('etag');
        outStr = gAtomFeed.getUpdateXML(gdEntryEl, 'star');
        mr = this.setupRequest(editLink, {alt: "json"}, "PUT", true, gdEntryEl.nameSaved.bind(gdEntryEl), gdEntryEl.nameSavedError.bind(gdEntryEl) , {"Content-Type": "application/atom+xml", "If-Match": etag});
        mr.send(outStr);
    },
    delete: function(gdEntryEl) {
        debug("in delete");
        editLink = gdEntryEl.getAttribute('edit');
        etag = gdEntryEl.getAttribute('etag');
        // TODO: error functions to be defined. Call refreshdocumentfeed in success ??
        mr = this.setupRequest(editLink, {alt: "json"}, "DELETE", true, gdEntryEl.deleted.bind(gdEntryEl),function(){}, {"Content-Type": "application/atom+xml", "If-Match": etag});
        mr.send('');
    },
    hide: function(gdEntryEl){
        editLink = gdEntryEl.getAttribute('edit');
        etag = gdEntryEl.getAttribute('etag');
        
        outStr = gAtomFeed.getUpdateXML(gdEntryEl, 'hide');
        mr = this.setupRequest(editLink, {alt: "json"}, "PUT", true, gdEntryEl.deleted.bind(gdEntryEl),function(){}, {"Content-Type": "application/atom+xml", "If-Match": etag});
        mr.send(outStr);
    },
    move: function(gdEntryEl) {
        debug("in move");
        url = this._host + "/feeds/documents/private/full/-/folder?showfolders=true"
        mr = this.setupRequest(url,{alt: "json"}, "GET",true, function(data) {
          debug(data);
          _gdFeed = new gdFeed(data);
        },function() {});
        mr.send('');
    },
    download: function(gdEntryEl,format) {
        debug("in download");
        resource = gdEntryEl.nameSaved.bind('resource');
        var fmCmd = {"pdf" : 12, "xls" : 4, "csv" : 5, "ods" : 13, "tsv" : 23, "html" : 102 };
        key = gdEntryEl.getAttribute('resourceId');
        if(resource == "spreadsheet") {
          var url = this.spreadsheetExport + "?key=" + key +"&fmcmd=" + fmCmd[format];
        } else if(resource == "presentation") {
          var url =  this.presentationExport + "?docID="+ key +"&exportFormat=" + format
        } else {
          var url = this.documentExport + "?docID="+ key +"&exportFormat=" + format
        }
        debug(url);
        filename = gdEntryEl.getAttribute('name') + '.' + format;
        netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
        // Open the save file dialog
        const nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, "Save File...", nsIFilePicker.modeSave);
        fp.defaultString = filename;
        var rv = fp.show();
        if(rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace){
          // Open the file and write to it
          var file = fp.file;
          if(file.exists() == false){//create as necessary
            file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420 );
          }
        }
        var dm = Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager);
        var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
        var uri = ios.newURI(url, null, null);
        var fileURI = ios.newFileURI(file);
        //new persitence object
        var wbp = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
        var dl = dm.addDownload(0, uri, fileURI, file.leafName, null, 0, null, wbp);
        wbp.progressListener = dl;
        //save file to target
        wbp.saveURI(uri,null,null,null,"Authorization:GoogleLogin auth=" + this._auth +"\r\n",file);
    },
    getFolders: function(){
        this.resetOptions();
        debug("getFolders ");
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
    }
});


var gAtomFeed = new Base;
gAtomFeed.addXMLHeader = function(txt){
    return "<?xml version='1.0' encoding='UTF-8'?>\n" + txt;
}
gAtomFeed.updateTitle = function(title, etag, starred){
    if(starred){
        return this.star(title, etag);
    }
    else
        return this.unstar(title, etag);
}
/*gAtomFeed.star = function(title, etag){
    default xml namespace="http://www.w3.org/2005/Atom";

    var myxml = <atom:entry xmlns:atom="http://www.w3.org/2005/Atom" gd:etag={etag}  xmlns:gd="http://schemas.google.com/docs/2007">
      <atom:category scheme="http://schemas.google.com/g/2005#kind"
          term="http://schemas.google.com/docs/2007#document" label="document"/>
      <atom:category scheme="http://schemas.google.com/g/2005/labels"
          term="http://schemas.google.com/g/2005/labels#starred" label="starred"/>
      <atom:title>{title}</atom:title>
    </atom:entry>;
    
    var myxmlStr = myxml.toXMLString();
    debug(myxmlStr);
    return this.addXMLHeader(myxmlStr);
}*/
gAtomFeed.unstar = function(title, etag){
    default xml namespace="http://www.w3.org/2005/Atom";

    var myxml = <atom:entry xmlns:atom="http://www.w3.org/2005/Atom" gd:etag={etag}  xmlns:gd="http://schemas.google.com/docs/2007">
      <atom:category scheme="http://schemas.google.com/g/2005#kind"
          term="http://schemas.google.com/docs/2007#document" label="document"/>
      <atom:title>{title}</atom:title>
    </atom:entry>;
    
    var myxmlStr = myxml.toXMLString();
    debug(myxmlStr);
    return this.addXMLHeader(myxmlStr);
}
gAtomFeed.hide = function(){
    default xml namespace="http://www.w3.org/2005/Atom";
    var myxml = <atom:category xmlns:atom="http://www.w3.org/2005/Atom" scheme="http://schemas.google.com/g/2005/labels" term="http://schemas.google.com/g/2005/labels#hidden" label="hidden"/>;
    return myxml;
}
gAtomFeed.star = function(){
    default xml namespace="http://www.w3.org/2005/Atom";
    var myxml = <atom:category xmlns:atom="http://www.w3.org/2005/Atom" scheme="http://schemas.google.com/g/2005/labels" term="http://schemas.google.com/g/2005/labels#starred" label="starred"/>;
    return myxml;
}
gAtomFeed.title = function(title){
    default xml namespace="http://www.w3.org/2005/Atom";
    var myxml = <atom:title xmlns:atom="http://www.w3.org/2005/Atom">{title}</atom:title>;
    return myxml;
}
gAtomFeed.type = function(type){
    default xml namespace="http://www.w3.org/2005/Atom";
    term = "http://schemas.google.com/docs/2007#" + type;
    var myxml = <atom:category xmlns:atom="http://www.w3.org/2005/Atom" scheme="http://schemas.google.com/g/2005#kind" term={term} label={type}/>;
    return myxml;
}
gAtomFeed.parent = function(etag){
    default xml namespace="http://www.w3.org/2005/Atom";
    var myxml = <atom:entry xmlns:atom="http://www.w3.org/2005/Atom" gd:etag={etag}  xmlns:gd="http://schemas.google.com/docs/2007">
    </atom:entry>;
    return myxml;
}

gAtomFeed.getUpdateXML = function(gdEntryEl, overwrite){
    var parent = this.parent(gdEntryEl.getAttribute('etag'));

    var title = this.title( overwrite == "title" ? gdEntryEl.newTitle : gdEntryEl.getAttribute('name') );
    parent.appendChild(title);

    if((gdEntryEl.getAttribute('star') == "nostar" && overwrite == "star") || (gdEntryEl.getAttribute('star') == "star" && overwrite != "star")){
        var star = this.star();
        parent.appendChild(star);
    }

    if((gdEntryEl.getAttribute('_hidden') == "true" && overwrite != "hide") || Boolean(gdEntryEl.getAttribute('_hidden') == "false" && overwrite == "hide")){
        var hidden = this.hide();
        parent.appendChild(hidden);
    }
    var type = this.type(gdEntryEl.getAttribute('type'));
    parent.appendChild(type);
    xmlString = parent.toXMLString();
    debug(xmlString);
    return xmlString;
}

//gAtomFeed.getUpdateXML();
