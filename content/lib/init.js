function all_init(){
    GDOCSBARUtils.initialize();
	gbar.init();
}

window.addEventListener("load", function(e) { 
    executeSoon(all_init);    
}, false);

window.addEventListener("unload", function(e) { 
    gbar.destruct(); 
}, false);
