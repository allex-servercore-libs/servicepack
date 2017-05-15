function createInvokeMethodTask(execlib,InvokerTask){
  'use strict';
  var lib = execlib.lib,
      q = lib.q;
  function InvokeMethodTask(prophash){
    InvokerTask.call(this,prophash);
  }
  lib.inherit(InvokeMethodTask,InvokerTask);
  InvokeMethodTask.prototype.sinkMethodName = 'call';
  return InvokeMethodTask;
}

module.exports = createInvokeMethodTask;
