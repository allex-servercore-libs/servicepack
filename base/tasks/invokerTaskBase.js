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
    this.params = null;
    this.methodname = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  InvokerTask.prototype.go = function(){
    this.sink[this.sinkMethodName].apply(this.sink,[this.methodname].concat(this.params)).done(
      this.onCallSucceeded.bind(this),
      this.onError,
      this.onNotify
    );
  };
  InvokerTask.prototype.onCallSucceeded = function(result){
    if(this.next){
      this.next.propertyhash.sink = this.sink,
      this.onSuccess(result,this.next.propertyhash);
      taskRegistry.run(this.next.name,this.next.propertyhash);
    }else{
      this.onSuccess(result);
    }
  };
  InvokerTask.prototype.compulsoryConstructionProperties = ['sink','methodname'];

  return InvokerTask;
}

module.exports = createInvokerTask;
