function createService(ServiceBase,User,SessionIntroductor,execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    ParentService = ServiceBase;

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,User,SessionIntroductor),
      'user': require('./users/usercreator')(execlib,User) 
    };
  }

  function Service(prophash){
    ParentService.call(this,prophash);
  }
  ParentService.inherit(Service,factoryCreator);
  return Service;
}

module.exports = createService;
