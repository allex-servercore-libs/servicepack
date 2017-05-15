function createTransmitTcpTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      SinkTask = execSuite.SinkTask,
      taskRegistry = execSuite.taskRegistry;

  function TransmitTcpTask(prophash){
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    this.ipaddress = prophash.ipaddress;
    this.options = prophash.options;
    this.onPayloadNeeded = prophash.onPayloadNeeded;
    this.onRequestNotification = prophash.onRequestNotification||lib.dummyFunc;
    this.onIncomingPacket = prophash.onIncomingPacket;
    this.onOver = prophash.onOver;
  }
  lib.inherit(TransmitTcpTask,SinkTask);
  TransmitTcpTask.prototype.__cleanUp = function(){
    if(this.onOver){
      this.onOver();
    }
    this.onOver = null;
    this.onIncomingPacket = null;
    this.onRequestNotification = null;
    this.onPayloadNeeded = null;
    this.options = null;
    this.ipaddress = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  TransmitTcpTask.prototype.go = function(){
    this.sink.call('requestTcpTransmission',this.options).done(
      this.onTransmissionGranted.bind(this),
      this.destroy.bind(this),
      this.onRequestNotification
    );
  };
  TransmitTcpTask.prototype.onTransmissionGranted = function(transmissionobj){
    try{
      transmissionobj.ipaddress = this.ipaddress;
      transmissionobj.onPayloadNeeded = this.onPayloadNeeded;
      transmissionobj.onIncomingPacket = this.onIncomingPacket;
      transmissionobj.onOver = this.destroy.bind(this);
      taskRegistry.run('realizeTcpTransmission',transmissionobj);
    }
    catch(e){
      console.error(e.stack);
      console.error(e);
      this.destroy();
    }
  };
  TransmitTcpTask.prototype.compulsoryConstructionProperties = ['sink','ipaddress','onPayloadNeeded'];

  return TransmitTcpTask;
}

module.exports = createTransmitTcpTask;
