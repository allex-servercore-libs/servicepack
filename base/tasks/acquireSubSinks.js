function createAcquireStaticSubSinksTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      DestroyableTask = execSuite.DestroyableTask,
      SubServiceExtractor = execSuite.StateSubServiceExtractor,
      StateSource = execSuite.StateSource;
  function AcquireStaticSubSinksTask(prophash){
    DestroyableTask.call(this,prophash,'state');
    this.state = prophash.state;
    this.stateDestroyedListener = null;
    if (this.state.destroyed) {
      this.stateDestroyedListener = this.state.destroyed.attach(this.destroy.bind(this));
    }
    this.subinits = prophash.subinits;
    if(!this.subinits.length){
      throw new lib.Error('SUBINIT_ARRAY_EMPTY');
    }
  }
  lib.inherit(AcquireStaticSubSinksTask,DestroyableTask);
  AcquireStaticSubSinksTask.prototype.__cleanUp = function(){
    if (this.stateDestroyedListener) {
      this.stateDestroyedListener.destroy();
    }
    this.stateDestroyedListener = null;
    this.subinits = null;
    this.state = null;
    DestroyableTask.prototype.__cleanUp.call(this);
  };
  AcquireStaticSubSinksTask.prototype.go = function(){
    var initmap = new lib.Map;
    this.subinits.forEach(function(sub){
      if(!sub.name){
        throw new lib.Error('SUBINIT_HAS_NO_NAME');
      }
      if(!sub.cb){
        throw new lib.Error('SUBINIT_HAS_NO_CB');
      }
      initmap.add(sub.name,sub);
    });
    this.state.setSink(new SubServiceExtractor(this.state.sink,initmap,true));
    initmap = null;
  };
  AcquireStaticSubSinksTask.prototype.compulsoryConstructionProperties = ['state','subinits'];
  return AcquireStaticSubSinksTask;
}

module.exports = createAcquireStaticSubSinksTask;
