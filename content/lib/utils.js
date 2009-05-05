GDOCSBARUtils = new Base;
GDOCSBARUtils.extend({
    _CI: Components.interfaces,
    _CC: Components.classes,
    CC: function(cName)
    {
        return this._CC[cName];
    },
    CI: function(ifaceName)
    {
        return this._CI[ifaceName];
    },
    CCSV: function(cName, ifaceName)
    {
        return this._CC[cName].getService(this._CI[ifaceName]);
    },
    $: function(id){
        return document.getElementById(id);
    },
    zeroPadding: function(number){
        return (number.toString().length == 1 ? "0"+number.toString() : number);
    },
    addClass: function(el, cls, forceBefore) {
            if(forceBefore != null && el.className.match(new RegExp('(^| )' + forceBefore))) {
                    el.className = el.className.replace(new RegExp("( |^)" + forceBefore), '$1' + cls + ' ' + forceBefore);

            } else if(!el.className.match(new RegExp('(^| )' + cls + '($| )'))) {
                    el.className += ' ' + cls;
                    el.className = el.className.replace(/(^ +)|( +$)/g, '');
            }
    },
    removeClass: function(el, cls) {
            var old = el.className;
            var newCls = ' ' + el.className + ' ';
            newCls = newCls.replace(new RegExp(' (' + cls + ' +)+','g'), ' ');
            el.className = newCls.replace(/(^ +)|( +$)/g, '');
    }
    
});

