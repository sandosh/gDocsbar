loader.loadSubScript('chrome://gdocsbar/content/lib/misc.js');

function init() {
    this._loginurl = "https://www.google.com/accounts/ClientLogin";
    this._docslisturl = "http://docs.google.com/feeds/documents/private/full";
    this._service = "writely";
    this._source = "gDocsBar-gDocsBar-1.0";
    this._accountType = "HOSTED_OR_GOOGLE";
    this._loginResponse = null;
    this.nsIObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    this.loggedIn = false;
    this.email = null;
    debug("gdocsbar comp init done...");
}

function getSignedRequestHeader(){
    if(!this._loginResponse || !this._loginResponse['auth']){
        return false;
    }
    var out = this._loginResponse['auth'];
    return out;
}

function sayHello() {
    Components
        .classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService)
        .alert(null, 'Greeting...', this._message);
}

function setupRequest(url, signed){
    debug(url);
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    req.open("GET", url, true);
    req.setRequestHeader('GData-Version','2.0');
    if(signed){
        req.setRequestHeader("Authorization", "GoogleLogin auth="+this._loginResponse['auth']);
    }
    return req;
}

function login(email, password, captchaValue){
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    req.open("POST", this._loginurl, true);
    req.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
	req.onreadystatechange = (function (aEvt) {
	    if (req.readyState == 4) {
	        debug(req.responseText);
	        debug("got authinfo");
	        this._loginResponse = response = parseResponse(req.responseText);
	        debug(response, req.status);
		     if(req.status == 200){
		         this.loggedIn = true;
		         this.globalNotify(response,"login-success");
	         }else{
	             this.globalNotify(response,"login-error");
	             this.loggedIn = false;
	         }
	         
         }
    }).bind(this);
    debug("Tisemebar", "sending Auth info");
    //accountType=HOSTED_OR_GOOGLE&Email=jondoe@gmail.com&Passwd=north23AZ&service=cl&source=Gulp-CalGulp-1.05
    var data = "";
    data += "accountType="+encodeURIComponent(this._accountType)+"&";
    data += "service="+encodeURIComponent(this._service)+"&";
    data += "source="+encodeURIComponent(this._source)+"&";
    
    if(this._loginResponse){
        if(this._loginResponse['error'] == "CaptchaRequired"){
            data += "logintoken="+encodeURIComponent(this._loginResponse.captchatoken)+"&";
            data += "logincaptcha="+encodeURIComponent(captchaValue)+"&";
        }
    }
    
    
    data += "Email="+encodeURIComponent(email)+"&";
    data += "Passwd="+encodeURIComponent(password);
    
    debug("sending data...", data);
    
    req.send(data);
    this.email = email;
}

function globalNotify(subject, topic){
    subject.wrappedJSObject = subject;
    this.nsIObserverService.notifyObservers(subject,"gdocsbar",topic);    
}