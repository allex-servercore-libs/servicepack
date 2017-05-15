function createUserSink(ServiceSink,execlib){
  'use strict';
  function UserSink(prophash,client){
    ServiceSink.call(this,prophash,client);
  }
  ServiceSink.inherit(UserSink,require('../methoddescriptors/user'));
  return UserSink;
}

module.exports = createUserSink;
