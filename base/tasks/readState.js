function createReadStateTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      DestroyableTask = execSuite.DestroyableTask,
      ADS = execSuite.ADS;
  function ReadStateTask(prophash){
    DestroyableTask.call(this,prophash,'state');
    this.state = prophash.state;
    this.name = prophash.name;
    this.cb = prophash.cb;
  }
  lib.inherit(ReadStateTask,DestroyableTask);
  ReadStateTask.prototype.__cleanUp = function(){
    this.cb = null;
    this.name = null;
    this.state = null;
    DestroyableTask.prototype.__cleanUp.call(this);
  };
  ReadStateTask.prototype.go = function(){
    var namepath = lib.isArray(this.name) ? this.name : [this.name];
    this.state.setSink(this.extendTo(ADS.listenToScalar(namepath,{rawsetter:this.cb})));
  };
  ReadStateTask.prototype.compulsoryConstructionProperties = ['state','name','cb'];
  return ReadStateTask;
}

module.exports = createReadStateTask;
