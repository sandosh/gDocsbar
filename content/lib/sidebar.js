GDOCSBARUtils.ns(function(){ with(GDOCSBARUtils){
    const gbarc = CCSV('@gdocsbar.com/gdocsbar;1', 'nsIGdocsBar');
    const nsIObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    const le_holder = $("le_holder");
    const page_list = $("gDocsList");
    const page_login = $("gDocsBarLogin");
    
    top.gbar = {
        init: function(){
            gbarc.reload();
            gbarc.init();
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
                    this.initLoggedInUser();
                    break;
                }
            }).bind(this);
            this.gdocsbarobserver = gdocsbarobserver;
            nsIObserverService.addObserver(this.gdocsbarobserver, "gdocsbar", false);
        },
        initLoggedInUser: function(){
            page_login.setAttribute('collapsed', true);
            page_list.setAttribute('collapsed', false);
            //this.getFullDocList();
            this.getFolderList();
        },
        getFullDocList: function(){
            debug("setting up requests...");
            req = gbarc.setupRequest("http://docs.google.com/feeds/documents/private/full", true);
            req = req.wrappedJSObject;
            //debug(req);
            req.onreadystatechange = (function (aEvt) {
        	    if (req.readyState == 4) {
        	        
        		     if(req.status == 200){
        		         //debug(req.responseText);
             	         debug(req.status);
        	         }else{
        	             
        	         }

                 }
            }).bind(this);
            req.send(null);
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
} });