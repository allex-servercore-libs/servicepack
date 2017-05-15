function createSameMachineProcessStrategy(lib){
  'use strict';
  //TODO: require('is-running') to check for running pid
  function SameMachineProcessStrategy(){
  }
  SameMachineProcessStrategy.prototype.destroy = lib.dummyFunc;
  SameMachineProcessStrategy.prototype.resolveUser = function(credentials,defer){
    credentials.name = credentials.name || credentials.pid;
    defer.resolve(credentials);
  };
  return SameMachineProcessStrategy;
}

module.exports = createSameMachineProcessStrategy;
