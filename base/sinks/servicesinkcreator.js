function createServiceSink(_ServiceSink,execlib){
  'use strict';
  var lib = execlib.lib,
    execSuite = execlib.execSuite;

  function ServiceSink(prophash,client){
    _ServiceSink.call(this,prophash,client);
  }
  _ServiceSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  ServiceSink.prototype.__cleanUp = function(){
    _ServiceSink.prototype.__cleanUp.call(this);
  };
  ServiceSink.prototype.introduceUser = function(userhash){
    //console.log('ServiceSink',this.modulename,this.role,'introduceUser',userhash);
    var d = lib.q.defer();
    this.subConnect('.',userhash,{}).done(
      d.resolve.bind(d),
      d.reject.bind(d)
    );
    return d.promise;
  };
  return ServiceSink;
}

module.exports = createServiceSink;
