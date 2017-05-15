function createInvokeSessionMethodTask(execlib,InvokerTask){
  'use strict';
  var lib = execlib.lib,
      q = lib.q;
  function InvokeSessionMethodTask(prophash){
    InvokerTask.call(this,prophash);
  }
  lib.inherit(InvokeSessionMethodTask,InvokerTask);
  InvokeSessionMethodTask.prototype.sinkMethodName = 'sessionCall';
  return InvokeSessionMethodTask;
}

module.exports = createInvokeSessionMethodTask;
