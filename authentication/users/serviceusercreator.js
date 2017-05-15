function createServiceUser(execlib,ParentUser){
  'use strict';

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  function ServiceUser(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(ServiceUser,require('../methoddescriptors/serviceuser'));
  ServiceUser.prototype.register = function(strategyparams,strategyname){
    var stratctor = this.__service.strategyCtors.get(strategyname);
    if(!stratctor){
      console.log(process.pid,'No strategy ctor registered under the name',strategyname);
      return;
    }
    //console.log(process.pid,'registering strategy',strategyname,stratctor,'with',strategyparams);
    this.__service.strategies.add(strategyname,new stratctor(strategyparams));
  };
  ServiceUser.prototype.registerStrategyConstructor = function(strategymodulename,defer){
    try{
      var strategyctor = require(strategymodulename)(execlib);
      this.__service.strategyCtors.replace(strategymodulename,strategyctor);
      defer.resolve(strategymodulename);
    }
    catch(e){
      console.log(e.stack);
      defer.reject(e);
    }
  };

  return ServiceUser;
}

module.exports = createServiceUser;
