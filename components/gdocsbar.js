/* ---------------------------------------------------------------------- */
/* Component specific code.                                               */

const CLASS_ID = Components.ID('{C400B1A9-DC18-4615-ADB3-1E4FDCC44048}');
const CLASS_NAME = 'gDocsBar';
const CONTRACT_ID = '@gdocsbar.com/gdocsbar;1';
const SOURCE = 'chrome://gdocsbar/content/service/gdocsbar.js';
const INTERFACE = Components.interfaces.nsIGdocsBar;

/* ---------------------------------------------------------------------- */
/* Template.  No need to modify the code below.                           */
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader);

function Component() {
    this.wrappedJSObject = this;
}

Component.prototype = {
    reload: function() {
        loader.loadSubScript(SOURCE, this.__proto__);
    },

    QueryInterface: function(aIID) {
        if(!aIID.equals(INTERFACE) &&
           !aIID.equals(Ci.nsISupports))
            throw Cr.NS_ERROR_NO_INTERFACE;
        return this;
    }
};
loader.loadSubScript(SOURCE, Component.prototype);

var Factory = {
    createInstance: function(aOuter, aIID) {
        if(aOuter != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;
        var component = new Component();
        if(typeof(component.init) == 'function')
            component.init();

        return component.QueryInterface(aIID);
    }
};

var Module = {
    _firstTime: true,

    registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
        if (this._firstTime) {
            this._firstTime = false;
            throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
        };
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.registerFactoryLocation(
            CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
    },

    unregisterSelf: function(aCompMgr, aLocation, aType) {
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
    },

    getClassObject: function(aCompMgr, aCID, aIID) {
        if (!aIID.equals(Ci.nsIFactory))
            throw Cr.NS_ERROR_NOT_IMPLEMENTED;

        if (aCID.equals(CLASS_ID))
            return Factory;

        throw Cr.NS_ERROR_NO_INTERFACE;        
    },

    canUnload: function(aCompMgr) { return true; }
};

function NSGetModule(aCompMgr, aFileSpec) { return Module; }

