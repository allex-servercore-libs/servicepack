function createServiceUser(execlib,ParentServiceUser,SessionIntroductor){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite;

  function ServiceUser(prophash){
    ParentServiceUser.call(this,prophash);
  }
  ParentServiceUser.inherit(ServiceUser,require('../methoddescriptors/serviceuser'),execSuite.StateSource);
  ServiceUser.prototype.introduceSession = function(sessionid,userprophash,defer){
    SessionIntroductor.introduce(userprophash,sessionid);
    defer.resolve(sessionid);
  };
  ServiceUser.prototype.dereferenceSession = function (sessionid, defer) {
    defer.resolve(SessionIntroductor.forget(sessionid));
  };

  return ServiceUser;
}

module.exports = createServiceUser;
