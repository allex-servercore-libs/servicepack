function createAuthenticationService(execlib,ParentService){
  'use strict';
  var lib = execlib.lib;

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function addStrategyInstance(as,strategyprophash,strategyname){
    var stratctor = as.strategyCtors.get(strategyname);
    if(stratctor){
      as.strategies.add(strategyname,new stratctor(strategyprophash));
    }
  }
  function AuthenticationService(prophash){
    ParentService.call(this,prophash);
    this.strategies = new lib.Map;
    execlib.lib.traverse(prophash.strategies,addStrategyInstance.bind(null,this));
  }
  ParentService.inherit(AuthenticationService,factoryCreator);
  AuthenticationService.prototype.__cleanUp = function(){
    lib.containerDestroyAll(this.strategies);
    this.strategies.destroy();
    this.strategies = null;
    ParentService.prototype.__cleanUp.call(this);
  };
  var scs = new lib.Map;
  AuthenticationService.prototype.strategyCtors = scs;

  var q = lib.q,
      AllPassStrategy = require('./strategies/allpassstrategycreator')(),
      RoleRemapperStrategy = require('./strategies/roleremapperstrategycreator')(),
      TrustedRoleStrategy = require('./strategies/trustedrolestrategycreator')(lib),
      SameMachineProcessStrategy = require('./strategies/samemachineprocessstrategycreator')(lib),
      IPStrategy = require('./strategies/ipstrategycreator')(lib),
      RemoteAuthenticatorStrategy = require('./strategies/remoteauthenticatorstrategycreator')(execlib),
      RemoteProcessIPStrategy = require('./strategies/remoteprocessipstrategycreator')(lib,q,IPStrategy);

  scs.add('allpass',AllPassStrategy);
  scs.add('roleremapper',RoleRemapperStrategy);
  scs.add('trustedrole',TrustedRoleStrategy);
  scs.add('samemachineprocess',SameMachineProcessStrategy);
  scs.add('ip',IPStrategy);
  scs.add('remote',RemoteAuthenticatorStrategy);
  scs.add('remoteprocessip',RemoteProcessIPStrategy);
  
  return AuthenticationService;
}

module.exports = createAuthenticationService;
