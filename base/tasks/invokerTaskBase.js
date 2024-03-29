function createInvokerTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      SinkTask = execSuite.SinkTask,
      taskRegistry = execSuite.taskRegistry;

  function InvokerTask(prophash){
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    this.methodname = prophash.methodname;
    this.params = prophash.params || [];
    this.onSuccess = prophash.onSuccess || lib.dummyFunc;
    this.onError = prophash.onError || lib.dummyFunc;
    this.onNotify = prophash.onNotify || lib.dummyFunc;
  };
  lib.inherit(InvokerTask,SinkTask);
  InvokerTask.prototype.__cleanUp = function(){
    this.onNotify = null;
    this.onError = null;
    this.onSuccess = null;
    this.params = null;
    this.methodname = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  InvokerTask.prototype.go = function(){
    this.sink[this.sinkMethodName].apply(this.sink,[this.methodname].concat(this.params)).done(
      this.onCallSucceeded.bind(this),
      this.onCallFailed.bind(this),
      this.onNotify
    );
  };
  InvokerTask.prototype.onCallSucceeded = function(result){
    this.onError = null;
    var onsuc = this.onSuccess;
    this.onSuccess = null;
    if(this.next){
      this.next.propertyhash.sink = this.sink;
      if (lib.isFunction(onsuc)) {
        onsuc(result,this.next.propertyhash);
      }
      taskRegistry.run(this.next.name,this.next.propertyhash);
      this.destroy();
      return;
    }
    if (lib.isFunction(onsuc)) {
      onsuc(result);
    }
    this.destroy();
  };
  InvokerTask.prototype.onCallFailed = function (reason) {
    var oner = this.onError;
    this.onError = null;
    if (lib.isFunction(oner)) {
      oner(reason);
    }
    this.destroy();
  };
  InvokerTask.prototype.compulsoryConstructionProperties = ['sink','methodname','onError'];

  return InvokerTask;
}

module.exports = createInvokerTask;
