function createServiceSink(execlib,ParentSink){
  'use strict';

  if(!ParentSink){
    ParentSink = execlib.execSuite.ServicePack.SinkMap.get('user');
  }

  function ServiceSink(prophash,client){
    ParentSink.call(this,prophash,client);
  }
  ParentSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  
  return ServiceSink;
}

module.exports = createServiceSink;
