function createUserSink(execlib,ParentSink){
  'use strict';

  if(!ParentSink){
    ParentSink = execlib.execSuite.ServicePack.SinkMap.get('user');
  }

  function UserSink(prophash,client){
    ParentSink.call(this,prophash,client);
  }
  ParentSink.inherit(UserSink,require('../methoddescriptors/user'));
  
  return UserSink;
}

module.exports = createUserSink;
