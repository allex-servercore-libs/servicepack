function remoteProcessIPStrategyCreator(lib,q,IPStrategy){
  'use strict';
  function RemoteProcessIPStrategy(ips){
    IPStrategy.call(this,ips);
  }
  lib.inherit(RemoteProcessIPStrategy,IPStrategy);
  RemoteProcessIPStrategy.prototype.destroy = function(){
    IPStrategy.prototype.destroy.call(this);
  };
  RemoteProcessIPStrategy.prototype.onIPResolved = function(credentials,defer,result){
    console.log('ip resolved',result);
    result.name = credentials.name+credentials.pid;
    defer.resolve(result);
    credentials = null;
    defer = null;
  };
  RemoteProcessIPStrategy.prototype.onIPError = function(defer,reason){
    defer.reject(reason);
  };
  RemoteProcessIPStrategy.prototype.onIPProgress = function(defer,progress){
    defer.notify(progress);
  };
  RemoteProcessIPStrategy.prototype.resolveUser = function(credentials,defer){
    console.log('resolveUser',credentials);
    var d = q.defer();
    IPStrategy.prototype.resolveUser.bind(this,credentials,d);
    d.done(
      this.onIPResolved.bind(this,credentials,defer),
      this.onIPError.bind(this,defer),
      this.onIPProgress.bind(this,defer)
    );
  };
  return RemoteProcessIPStrategy;
}

module.exports = remoteProcessIPStrategyCreator;
