Components.utils.import("resource://gre/modules/JSON.jsm");

var panelDragDropObserver = 
{
	onDrop : function (evt, transferData, session) {
		evt.preventDefault(); 
		debug(evt);
		evt.preventDefault(); 
		debug('ondrop...');
		gbar.getDropFiles(session);
		//document.getElementById('uploadDrop').style.backgroundColor = "#93C2F1";
	},
	onDragOver : function (evt, transferData, session) {
		//document.getElementById('uploadDrop').style.backgroundColor = "#FAE298";
		evt.preventDefault(); 
		//debug('ondragover...');
		//gbar.$("gDocsList").setAttribute('collapsed', true);
		//gbar.$("gDocsUploadpage").setAttribute('collapsed', false);
		gbar.switchTab(topmenu_upload);
	},
	ondragenter : function (evt, transferData, session) {
		evt.preventDefault(); 
		debug('ondragenter...');
	},
	onDragExit : function (evt, transferData, session) {
		evt.preventDefault(); 
		debug('onDragExit...');
		//gbar.$("gDocsList").setAttribute('collapsed', false);
		//gbar.$("gDocsUploadpage").setAttribute('collapsed', true);
		//document.getElementById('uploadDrop').style.backgroundColor = "#93C2F1";
	},
	getSupportedFlavours: function () {
    var flavourSet = new FlavourSet();
    flavourSet.appendFlavour("text/x-moz-url");
    flavourSet.appendFlavour("text/unicode");
    flavourSet.appendFlavour("application/x-moz-file", "nsIFile");
    return flavourSet;
  }
}
gbar = GDOCSBARUtils.extend({
    _uploadQ : [],
    _uploadStatus : false,
    init: function(){
        (function(){
            $ = this.$;
            gbarc = Components.classes["@gdocsbar.com/gdocsbar;1"].getService(Components.interfaces.nsIGdocsBar);
            nsIObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
            passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
            
            le_holder = this.$("le_holder");
            page_list = this.$("gDocsList");
            page_login = this.$("gDocsBarLogin");
            page_upload = this.$("gDocsUploadpage");
            
            gDocsList_list = this.$("gDocsList_list");
            gDocsList_folders = this.$("gDocsList_folders");
            moreloader = this.$("moreloader");
            gdlistholder = this.$("gdlistholder");
            feedtype = this.$("feedtype");
            showtypes = this.$("showtypes");
            gdsearchform = this.$("gdsearchform");
            gdBrowser.init();
            folderHistory = new Array();
            foldertree = this.$("foldertree");
            gdUploadQueueBox = this.$("gdUploadQueueBox");
            topmenu_documents = this.$("topmenu_documents");
            topmenu_search = this.$("topmenu_search");
            topmenu_upload = this.$("topmenu_upload");
            login_loading = this.$("login_loading");
            topmenu = this.$("topmenu");
            gDocsList_folders_label = this.$("gDocsList_folders_label");
            gDocsList_folders_title = this.$("gDocsList_folders_title");
            gDocsList_folders_loading = this.$("gDocsList_folders_loading");
            wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
        }).bind(this)();
        
        
        debug("sidebar init...");
        var gdocsbarobserver = new Object();
        gdocsbarobserver.observe = (function(a,b,c){
            debug(c);
            switch(c){
                case "login-error":
                $("login_btn").setAttribute('disabled', false);
                login_loading.setAttribute('collapsed', true);
                error = a.wrappedJSObject;
                if(error['error'])
                    this.setLoginError(error);
                break;
                
                case "login-success":
                auth = a.wrappedJSObject.auth;
                $("login_btn").setAttribute('disabled', false);
                login_loading.setAttribute('collapsed', true);
                this.saveLoginInfo();
                this.initLoggedInUser(auth);
                break;
            }
        }).bind(this);
        this.gdocsbarobserver = gdocsbarobserver;
        nsIObserverService.addObserver(this.gdocsbarobserver, "gdocsbar", false);
        debug(gbarc.wrappedJSObject.loggedIn);
        if(gbarc.wrappedJSObject.loggedIn){
            this.initLoggedInUser(gbarc.getSignedRequestHeader());
        }else{
            var hostname = 'chrome://gdocsbar/';
            var formSubmitURL = null;  // not http://www.example.com/foo/auth.cgi
            var httprealm = 'User Registration';
            var username;
            var password;

            try {
               // Get Login Manager 
               // Find users for the given parameters
               var logins = passwordManager.findLogins({}, hostname, formSubmitURL, httprealm);
               // Find user from returned array of nsILoginInfo objects
               for (var i = 0; i < logins.length; i++) {
                  $("email").value = logins[i].username;
                  $("password").value = logins[i].password;
                  break;
               }
            }
            catch(ex) {
               // This will only happen if there is no nsILoginManager component class
            }
        }
    },
    saveLoginInfo: function(){
        var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",Components.interfaces.nsILoginInfo, "init");
        var extLoginInfo = new nsLoginInfo('chrome://gdocsbar/',null, 'User Registration',$("email").value, $("password").value, "", "");
        try{
            passwordManager.removeLogin(loginInfo);
            passwordManager.addLogin(extLoginInfo);
        }
        catch(e){
            
        }
    },
    logoutUser: function(){
        gbarc.logout();
        topmenu.setAttribute('collapsed', true);
        page_list.setAttribute('collapsed', true);
        page_upload.setAttribute('collapsed', true);
        gdsearchform.setAttribute('collapsed', true);
        page_login.setAttribute('collapsed', false);
    },
    switchTab: function(A){
        switch(A.id){
            case "topmenu_documents":
            topmenu_search.removeAttribute('selected');
            topmenu_upload.removeAttribute('selected');
            page_list.setAttribute('collapsed', false);
            page_upload.setAttribute('collapsed', true);
            gdsearchform.setAttribute('collapsed', true);
            
            var b = gdsearchform.getQueryParams();        
            if(b.queryText.length > 0){
                gdsearchform.resetForm();
                this.getFullDocList();
            }
            
            
            
            break;
            
            case "topmenu_search":
            topmenu_documents.removeAttribute('selected');
            topmenu_upload.removeAttribute('selected');
            page_list.setAttribute('collapsed', false);
            page_upload.setAttribute('collapsed', true);
            gdsearchform.setAttribute('collapsed', false);
            
            break;
            case "topmenu_upload":
            topmenu_search.removeAttribute('selected');
            topmenu_documents.removeAttribute('selected');
            page_list.setAttribute('collapsed', true);
            page_upload.setAttribute('collapsed', false);
            gdsearchform.setAttribute('collapsed', true);
            
            break;
        }
        
        A.setAttribute('selected', true);
    },
    initLoggedInUser: function(auth){
        page_login.setAttribute('collapsed', true);
        page_list.setAttribute('collapsed', false);
        gdListAPI.init(auth);
//        gbar.switchTab(topmenu_upload);
        this.getFullDocList();
        this.getFolderList();
        topmenu.setAttribute("collapsed", false);
    },
    setFolder: function(folderid, back, folder_name){
        gdlistholder.setAttribute('folder', folderid);
        gDocsList_folders_title.setAttribute('folder', folderid);
        
        gDocsList_folders_label.value = folder_name;
        
        if(!back)
            folderHistory.push({id: folderid, name: folder_name});
        this.getFullDocList();
        this.getFolderList();
    },
    takeAction: function(el, event){
        type = el.getAttribute('type');
        if(type == "folder"){
            this.setFolder(el.getAttribute('resourceId'), false, el.getAttribute('name'));
        }
        else{
            var recentWindow = wm.getMostRecentWindow("navigator:browser");
            recentWindow.openUILink(el.getAttribute('view'), event, false, true);
        }
    },
    uploadFilesFromUI: function(){
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, "Select one or more Files", nsIFilePicker.modeOpenMultiple);
        var res = fp.show();
        if (res == nsIFilePicker.returnOK){
          var thefile = fp.file;
          var enumerator = fp.files;

          while (enumerator.hasMoreElements()) {
            var file = enumerator.getNext().QueryInterface(Components.interfaces.nsILocalFile);
            
            var gdupdocument = document.createElement("gdupdocument");
              gdupdocument.setAttribute('title', file.leafName);
              gdupdocument.setAttribute('status', "uploading");

              if(gdlistholder.getAttribute('folder')){
                  folder = gdlistholder.getAttribute('folder');
                  gdupdocument.setAttribute('folder', folder);
              }



              if(gdUploadQueueBox.childNodes.length == 0)
                gdUploadQueueBox.appendChild(gdupdocument);
              else
                gdUploadQueueBox.insertBefore(gdupdocument, gdUploadQueueBox.firstChild);

              gdupdocument.setFile(file);
              gdupdocument.upload();
              
              
          }
          
        }
        
    },
    goBackFolder: function(){
        folderHistory.pop();
        if(folderHistory.length > 0)
            this.setFolder(folderHistory[folderHistory.length -1].id, true, folderHistory[folderHistory.length -1].name);
        else
        {
            gdlistholder.removeAttribute('folder');
            gDocsList_folders_title.removeAttribute('folder');
            gDocsList_folders_label.value = "Folders";
            this.getFullDocList();
            this.getFolderList();
        }
    },
    getQueryParams: function(){
        var types = {};
        types.feedtype = feedtype.value;
        types.showtype = showtypes.value;
        
        if(gdlistholder.getAttribute('folder'))
            types.folder = gdlistholder.getAttribute('folder');
        
        a = false;
        var b = gdsearchform.getQueryParams();        
        if(b.title){
            if(b.queryText.length > 0){
                var a = {};
                a.title = b.queryText;
                a['title-exact'] = b['title-exact'];
            }
        }else if(b.queryText.length > 0){
            var a = {};
            a.q = b.queryText;
        }
        
        
        var out = {}
        out.types = types;
        
        out.query = a;
        return out;
    },
    downloadMultiple: function() {
      debug("in downloadmultiple")
      debug(gdlistholder)
      oElm = gdlistholder
      strTagName = "gdocument"
      strAttributeName = "checked"
      strAttributeValue = "true"
      var arrElements = (strTagName == "*" && oElm.all)? oElm.all : oElm.getElementsByTagName(strTagName);
      var arrReturnElements = new Array();
      var oAttributeValue = (typeof strAttributeValue != "undefined")? new RegExp("(^|\\s)" + strAttributeValue + "(\\s|$)", "i") : null;
      var oCurrent;
      var oAttribute;
      for(var i=0; i<arrElements.length; i++){
          oCurrent = arrElements[i];
          oAttribute = oCurrent.getAttribute && oCurrent.getAttribute(strAttributeName);
          if(typeof oAttribute == "string" && oAttribute.length > 0){
              if(typeof strAttributeValue == "undefined" || (oAttributeValue && oAttributeValue.test(oAttribute))){
                  arrReturnElements.push(oCurrent);
              }
          }
      }
      debug(arrReturnElements.length);
      format_table = {"document" : "doc", "spreadsheet" : "xls", "presentation" : "ppt"} 
      for(var i=0; i<arrReturnElements.length; i++){
        resource = arrReturnElements[i].getAttribute("resource")
        debug(resource)
        format = format_table[resource] ? format_table[resource] : "pdf"
        gdListAPI.download(arrReturnElements[i],format) 
      }
    },
    getMoreDocuments: function(){
        this.addClass(gdlistholder, "loading");
        q = this.getQueryParams();
        q.query = {}
        q.query['start-index'] = parseInt(gdlistholder.getAttribute('startindex')) + parseInt(gdlistholder.getAttribute('step'));
        gdListAPI.getAllDocuments(q.types, (q.query ? q.query : null), this.displayPartialDocList.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    getFullDocList: function(){
        debug("setting up requests...");
        gdlistholder.clearContents();
        this.addClass(gdlistholder, "loading");
        q = this.getQueryParams();
        gdListAPI.getAllDocuments(q.types, (q.query ? q.query : null), this.displayDocList.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    refreshDocumentFeed: function(){
        gdlistholder.clearContents();
        this.addClass(gdlistholder, "loading");
        q = this.getQueryParams();
        q.query['last-index'] = 1;
        gdListAPI.getAllDocuments(q.types, (q.query ? q.query : null), this.displayDocList.bind(this) , function(code, data){ debug(code +", "+ data); });
        
        this.getFolderList();
        
    },
    displayRefreshedFeed: function(){
        
    },
    parsePartialDocFeed: function(data){
        try{
            result = JSON.fromString(data);
            var documentFeed = new gdFeed(result);
            this.displayPartialDocList(documentFeed);
        }
        catch(e){
            debug("Exception: "+e);
        }
    },
    parseDocFeed: function(data){
        try{
            result = JSON.fromString(data);
            var documentFeed = new gdFeed(result);
            this.displayDocList(documentFeed);
        }
        catch(e){
            debug("Exception: "+e);
        }
    },
    displayPartialDocList: function(result){
        _gdFeed = new gdFeed(result);
        this.removeClass(gdlistholder, "loading");
        if(_gdFeed.entries.length < 1){
            gdlistholder.setAttribute("empty", true);
            return false;
        }
        gdlistholder.removeAttribute("empty");
        debug(_gdFeed.total);
        entries = _gdFeed.entries;


        for(var i=0; i<entries.length; i++){
            var entry = this.makegdocument(entries[i]);
            //gDocsList_list.insertBefore(entry, moreloader);
            gdlistholder.appendChild(entry);
        }
        gdlistholder.removeAttribute("empty");
        gdlistholder.setAttribute('total', _gdFeed.total);
        gdlistholder.setAttribute('startindex', _gdFeed.startIndex);
        gdlistholder.startindex = _gdFeed.startIndex;

    },
    displayDocList: function(result){
        _gdFeed = new gdFeed(result);
        this.removeClass(gdlistholder, "loading");
        if(_gdFeed.entries.length < 1){
            gdlistholder.setAttribute("empty", true);
            return false;
        }
        gdlistholder.removeAttribute("empty");
//        debug(_gdFeed.total);
        entries = _gdFeed.entries;
//        debug("hello");
        q = this.getQueryParams();
        debug(q.types);
        for(var i=0; i<entries.length; i++){
            var entry = this.makegdocument(entries[i]);
            //gDocsList_list.insertBefore(entry, moreloader);
            if(q.types.showtype && q.types['folder'] || q.types.showtype && q.types.feedtype && !q.types['folder']) { 
              if(entries[i]._type == q.types.showtype)
                gdlistholder.appendChild(entry);
            } else {
                gdlistholder.appendChild(entry);
            }
        }

        debug(_gdFeed.etag);
        gdlistholder.setAttribute('etag', _gdFeed.etag);
        gdlistholder.removeAttribute("empty");
        gdlistholder.setAttribute('total', _gdFeed.total);
        gdlistholder.setAttribute('startindex', _gdFeed.startIndex);
        gdlistholder.startindex = _gdFeed.startIndex;

    },
    makegdocument: function(e){
        d = document.createElement("gdocument");
        d.setAttribute("context", "gdocumentmenu");
//        d.setAttribute("mode", "edit");
        d.setAttribute("name", e.title);
        d.setAttribute("star", e.starred ? "star" : "nostar");
        d.setAttribute("_hidden", e.hidden);
        var monthname = new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
        datestring = this.zeroPadding(e.updated.getMonth()+1) + "/" + this.zeroPadding(e.updated.getDate());
        d.setAttribute("datetime", datestring);
        d.setAttribute("author", e.authors[0].name);
        d.setAttribute("edit", e.editLink);
        d.setAttribute("view", e.viewLink);
        d.setAttribute("etag", e.etag);
        d.setAttribute("type", e._type);
        d.setAttribute("resourceId",e.resourceId);
        d.setAttribute("resource",e._type);
        
        d.setAttribute("folders", JSON.toString(e.folders));
        
        this.addClass(d, e._type);
        return d;
    },
    newDocument: function(type){
        
            d = document.createElement("gdocument");
            d.setAttribute("name", "New "+type);
            d.setAttribute("new", "true");
            d.setAttribute("type", type);
            this.addClass(d, type);
            this.addClass(d, "edit");
            d.setAttribute("star", "nostar");
        if(type != "folder"){
            gdlistholder.insertBefore(d, gdlistholder.firstChild);
        }
        else{
            gDocsList_folders.setAttribute('hidden', false);
            gDocsList_folders.insertBefore(d, gDocsList_folders.firstChild);
        }
    },
    prepareFoldersForMove: function(){
        foldertree.openPopup(document.popupNode, "at_pointer");
        if(!foldertree.getAttribute('init'))
            this.initTreeFolders();
    },
    moveToFolder: function(){
        var tree = document.getElementById("myTree");
          item = tree.view.getItemAtIndex(tree.currentIndex);
            folder = item.firstChild.firstChild.getAttribute('folder');
            if(!folder){
                return ;
            }
        debug(folder, document.popupNode);
        document.popupNode.move(folder);
        foldertree.hidePopup();
    },
    initTreeFolders: function(){
       /* gbarc = Components.classes["@gdocsbar.com/gdocsbar;1"].getService(Components.interfaces.nsIGdocsBar);
        auth = gbarc.getSignedRequestHeader();
        gdListAPI.init(auth);
*/
        foldertree.setAttribute('init', 'done');
        var types = {};
        types['feedtype'] = "folder"
        
        gdListAPI.getAllDocuments(types, {showfolders: true}, this.displayFolderListTree.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    navigateFolder: function(event){
        var tree = document.getElementById("myTree");
          var tbo = tree.treeBoxObject;

          // get the row, col and child element at the point
          var row = { }, col = { }, child = { };
          tbo.getCellAt(event.clientX, event.clientY, row, col, child);

          var cellText = tree.view.getCellText(row.value, col.value);
          debug(event);
          
          item = tree.view.getItemAtIndex(row.value);
            //debug(item.firstChild.firstChild.id);
            folder = item.firstChild.firstChild.getAttribute('folder');
            if(!folder){
                return ;
            }
            var types = {};
            types['feedtype'] = "folder";
            types['folder'] = folder;
            gdListAPI.getAllDocuments(types, {showfolders: true}, (function(data){ debug(this.folder, data); this.scope.displayFolderListTree(data, this.folder); }).bind({'folder': folder, scope: this}) , function(code, data){ debug(code +", "+ data); });
            
    },
    displayFolderListTree: function(data, folder){
        
        _gdFeed = new gdFeed(result);
        
        if(folder){
            var c = document.getElementById( "f_" + folder ).parentNode.parentNode.getElementsByTagName("treechildren");
            if(c.length > 0)
                c[0].parentNode.removeChild(c[0]);
        }
        
        if(_gdFeed.entries.length ==0 && folder){
            treechildren = document.createElement("treechildren");
            var treeitem = document.createElement("treeitem");
            var treerow = document.createElement("treerow");
            var treecell = document.createElement("treecell");

            treecell.setAttribute('label', "[No folders found]");
            treecell.setAttribute('disabled', true);
//           treecell.setAttribute('id', e.resourceId);
            treeitem.setAttribute('container', false);
            treerow.appendChild(treecell);
            treerow.setAttribute('disabled', true);
            treeitem.appendChild(treerow);
            
            treeitem.setAttribute('disabled', true);
            treechildren.appendChild(treeitem);
            document.getElementById( "f_" + folder ).parentNode.parentNode.appendChild(treechildren);
            return;
        }
        
        if(folder){
            treechildren = document.createElement("treechildren");
        }
        
        for( var i=0; i < _gdFeed.entries.length; i++){
            debug("inside folder loop");
            e = _gdFeed.entries[i];
            if(e.folders.length != 0 && !folder)
            {
                continue;
            }
            var treeitem = document.createElement("treeitem");
            var treerow = document.createElement("treerow");
            
            
            var treecell = document.createElement("treecell");
            treecell.setAttribute('label', e.title);
            treecell.setAttribute('folder', e.resourceId);
            treecell.setAttribute('id', "f_" + e.resourceId);
            treeitem.setAttribute('container', true);
            treerow.appendChild(treecell);
            treeitem.appendChild(treerow);
            
            if(folder){
                treechildren.appendChild(treeitem);
            }
            else
                this.$("foldertreechildren").appendChild(treeitem);
        }
        if(folder){
            document.getElementById( "f_" + folder ).parentNode.parentNode.appendChild(treechildren);
        }
    },
    getFolderList: function(){
        
        gDocsList_folders.setAttribute('collapsed', true);
        gDocsList_folders_title.setAttribute('collapsed', true);
        gDocsList_folders_loading.setAttribute('collapsed', false);
        
        while(gDocsList_folders.childNodes.length > 0){
            gDocsList_folders.removeChild(gDocsList_folders.firstChild);
        }
        
        var types = {};
        types['feedtype'] = "folder"
        if(gdlistholder.getAttribute('folder'))
            types.folder = gdlistholder.getAttribute('folder');
            
        gdListAPI.getAllDocuments(types, {showfolders: true}, this.displayFolderList.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    displayFolderList: function(data){
        debug(data);
        _gdFeed = new gdFeed(result);
        var l = 0;
        for( var i=0; i < _gdFeed.entries.length; i++){
            e = _gdFeed.entries[i];
            if(e.folders.length != 0 && !gdlistholder.hasAttribute('folder'))
            {
                continue;
            }  
            /*var f = document.createElement("gfolder");
            f.setAttribute('title', e.title);
            f.setAttribute('id', e.resourceId);
            */
            var entry = this.makegdocument(_gdFeed.entries[i]);
            
            //f.setAttribute('onclick', "gbar.setFolder(this.getAttribute('id'),false,  '"+e.title+"');")
            gDocsList_folders.appendChild(entry);
            l++;
        }
        
        gDocsList_folders_label.value = (folderHistory.length > 0 ? folderHistory[folderHistory.length -1].name : "Folders") + " ( "+l+" )";
        gDocsList_folders.setAttribute('collapsed', false);
        gDocsList_folders_title.setAttribute('collapsed', false);
        gDocsList_folders_loading.setAttribute('collapsed', true);
    },
    showHideFolders: function(){
        
        if(gDocsList_folders.getAttribute('hidden') == "true" ){
            gDocsList_folders.setAttribute('hidden', false);
        }
        else{
            gDocsList_folders.setAttribute('hidden', true);
        }
    },
    destruct: function(){
      nsIObserverService.removeObserver(this.gdocsbarobserver, "gdocsbar");
    },
    login: function(){
        for(var i=0; i<le_holder.childNodes.length; i++){
            le_holder.childNodes[i].setAttribute('collapsed', true);
        }
        debug($("email").value, $("password").value);
        gbarc.login($("email").value, $("password").value, $("captcha_textbox").value);
        $("login_btn").setAttribute('disabled', true);
        login_loading.setAttribute('collapsed', false);
    },
    cancelLogin: function(){
        for(var i=0; i<le_holder.childNodes.length; i++){
            le_holder.childNodes[i].setAttribute('collapsed', true);
        }
        $("email").value = "";
        $("password").value = "";
    },
    setLoginError: function(error){
        error_id = "le_"+error['error'];
        $(error_id).setAttribute('collapsed', false);
        login_loading.setAttribute('collapsed', true);
        $("captcha_image").setAttribute('src',"http://www.google.com/accounts/" + error['captchaurl']);
    },
    toggleSearchBox: function(){
        if(gdsearchform.hasAttribute('collapsed')){
            gdsearchform.removeAttribute('collapsed');
        }
        else{
            gdsearchform.setAttribute('collapsed', true );
        }
    },
    renameDocument: function(el, newName){
        editLink = el.getAttribute('edit');
        etag = el.getAttribute('etag');
        outStr = gAtomFeed.updateTitle(newName);
    },
    getDropFiles: function(dropSession) {
      debug("dropped files " + dropSession.numDropItems);
      for (var m = 0; m < dropSession.numDropItems; m++) {
        var tobj = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
        tobj.addDataFlavor("application/x-moz-file");
        //tobj.addDataFlavor("text/x-moz-url");
        //tobj.addDataFlavor("text/html");
        //tobj.addDataFlavor("text/unicode");
        dropSession.getData(tobj, m);


        var dataObj = new Object();
        var dropSizeObj = new Object();
        var flavourObj = new Object();
        tobj.getAnyTransferData(flavourObj, dataObj, dropSizeObj);
        debug("in getdrop files");
        debug(flavourObj.value.toString());
        //prompt("Save as", "default value in the text field");
        /*
        if(flavourObj.value.toString() == "text/x-moz-url")
        {
          var myObj = dataObj.value.QueryInterface(Components.interfaces.nsISupportsString);
          debug(dataObj);
          debug(dataObj.data);
          debug(myObj);
        }
        else if(flavourObj.value.toString() == "text/html"){
          var myObj = dataObj.value.QueryInterface(Components.interfaces.nsISupportsString);
          this._uploadQ.push({"data": dataObj, "_size":dropSizeObj, "_type": "data", "name": prompt("Save as", "file name")+(this.getCharPreference('clipboardExtension') ? "."+this.getCharPreference('clipboardExtension') : "")});
        }
        else if (flavourObj.value.toString() == "application/x-moz-file") {
        */
        if (flavourObj.value.toString() == "application/x-moz-file") {
          debug("in x-moz-file");
          var fileObj = dataObj.value.QueryInterface(Components.interfaces.nsIFile);
          _path = fileObj.parent ? fileObj.parent.path: fileObj.path;
          var dupe = false;
          for (var i = 0; i < this._uploadQ.length; i++) {
              path = this._uploadQ[i].file.parent ? this._uploadQ[i].file.parent.path: this._uploadQ[i].file.path;
              if (fileObj.leafName == this._uploadQ[i].file.leafName && path == _path) {
                  dupe = true;
                  debug("dupe");
                  break
              }
          }
          if (dupe || fileObj.isDirectory()) {
              continue
          }
          debug("filename: " + fileObj.leafName);
          this._uploadQ.push({"file": fileObj, "_type": "file", "name": fileObj.leafName});
          
          var gdupdocument = document.createElement("gdupdocument");
          gdupdocument.setAttribute('title', fileObj.leafName);
          gdupdocument.setAttribute('status', "uploading");
          
          if(gdlistholder.getAttribute('folder')){
              folder = gdlistholder.getAttribute('folder');
              gdupdocument.setAttribute('folder', folder);
          }
          
          
          
          if(gdUploadQueueBox.childNodes.length == 0)
            gdUploadQueueBox.appendChild(gdupdocument);
          else
            gdUploadQueueBox.insertBefore(gdupdocument, gdUploadQueueBox.firstChild);
          
          gdupdocument.setFile(fileObj);
          gdupdocument.upload();
        } 
      }
      //this.processQ();
    },
    processQ: function() {
      if (this._uploadQ.length > 0) {
         if(this._uploadQ[0]._type == "file"){
           debug("in file");
           gdListAPI.upload(this._uploadQ[0].file,this.uploadSuccess.bind(this),this.uploadError.bind(this));
         }
         else if(this._uploadQ[0]._type == "data")
           debug("in data");
      } else {
           debug("in else");
        if (this._uploadQ.length == 0) {
           debug("queue is 0..refreshing docs list");
           this.getFullDocList();
        }
      }
    },
    uploadSuccess: function(data) {
      debug("upload success");
      if (this._uploadQ.length > 0) {
        this._uploadQ.splice(0, 1);
      } 
      this.processQ();
    },
    uploadError: function(data,error) {
      debug("upload failed");
      debug(data, error);
    }
});


/*Components.utils.import("resource://gre/modules/JSON.jsm");

GDOCSBARUtils.ns(function(){ with(GDOCSBARUtils){
    const gbarc = CCSV('@gdocsbar.com/gdocsbar;1', 'nsIGdocsBar');
    const nsIObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    const le_holder = $("le_holder");
    const page_list = $("gDocsList");
    const page_login = $("gDocsBarLogin");
    const gDocsList_list = $("gDocsList_list");
    
    top.gbar = {
        init: function(){
            //gbarc.reload();
            //gbarc.init();
            debug("sidebar init...", true);
            var gdocsbarobserver = new Object();
            gdocsbarobserver.observe = (function(a,b,c){
                debug(c);
                switch(c){
                    case "login-error":
                    $("login_btn").setAttribute('disabled', false);
                    error = a.wrappedJSObject;
                    if(error['error'])
                        this.setLoginError(error);
                    break;
                    
                    case "login-success":
                    auth = a.wrappedJSObject.auth;
                    this.initLoggedInUser(auth);
                    break;
                }
            }).bind(this);
            this.gdocsbarobserver = gdocsbarobserver;
            nsIObserverService.addObserver(this.gdocsbarobserver, "gdocsbar", false);
            debug(gbarc.wrappedJSObject.loggedIn);
            if(gbarc.wrappedJSObject.loggedIn){
                this.initLoggedInUser(gbarc.getSignedRequestHeader());
            }
        },
        initLoggedInUser: function(auth){
            page_login.setAttribute('collapsed', true);
            page_list.setAttribute('collapsed', false);
            gdListAPI.init(auth);
            this.getFullDocList();
            //this.getFolderList();
        },
        getFullDocList: function(){
            debug("setting up requests...");
            gdListAPI.getAllDocuments(null, this.parseDocFeed.bind(this) , function(){ debug("error"); });
        },
        parseDocFeed: function(data){
            try{
                result = JSON.fromString(data);
                var documentFeed = new gdFeed(result);
                this.displayDocList(documentFeed);
            }
            catch(e){
                debug("Exception: "+e);
            }
        },
        displayDocList: function(gdFeed){
            if(gdFeed.entries.length < 1){
                return false;
            }
            
            entries = gdFeed.entries;
            
            for(var i=0; i<entries.length; i++){
                var entry = this.makegdocument(entries[i]);
                gDocsList_list.appendChild(entry);
            }
        },
        makegdocument: function(e){
            d = document.createElement("gdocument");
            d.setAttribute("context", "gdocumentmenu");
            d.setAttribute("class", e._type);
            d.setAttribute("name", e.title);
            d.setAttribute("star", e.starred ? "star" : "nostar");
            var monthname=new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
            datestring = monthname[e.updated.getMonth()] + " " + e.updated.getDate();
            d.setAttribute("datetime", datestring);
            d.setAttribute("author", e.authors[0].name);
            return d;
        },
        getFolderList: function(){
            
            req = gbarc.setupRequest("http://docs.google.com/feeds/documents/private/full/-/folder?showfolders=true&alt=json", true);
            req = req.wrappedJSObject;
            //debug(req);
            req.onreadystatechange = (function (aEvt) {
        	    if (req.readyState == 4) {
        	        
        		     if(req.status == 200){
        		         debug(req.responseText);
             	         debug(req.status);
        	         }else{
        	             
        	         }

                 }
            }).bind(this);
            req.send(null);
        },
        destruct: function(){
          nsIObserverService.removeObserver(this.gdocsbarobserver, "gdocsbar");
        },
        login: function(){
            for(var i=0; i<le_holder.childNodes.length; i++){
                le_holder.childNodes[i].setAttribute('collapsed', true);
            }
            debug($("email").value, $("password").value);
            gbarc.login($("email").value, $("password").value, $("captcha_textbox").value);
            $("login_btn").setAttribute('disabled', true);
        },
        cancelLogin: function(){
            for(var i=0; i<le_holder.childNodes.length; i++){
                le_holder.childNodes[i].setAttribute('collapsed', true);
            }
            $("email").value = "";
            $("password").value = "";
        },
        setLoginError: function(error){
            error_id = "le_"+error['error'];
            $(error_id).setAttribute('collapsed', false);
            $("captcha_image").setAttribute('src',"http://www.google.com/accounts/" + error['captchaurl']);
        }
    }
} });*/
