var net = require('net');

function createRealizeTcpTransmissionTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      Task = execSuite.Task;

  function RealizeTcpTransmissionTask(prophash){
    Task.call(this,prophash);
    this.ipaddress = prophash.ipaddress;
    this.port = prophash.port;
    this.fingerprint = prophash.fingerprint;
    this.getPayload = prophash.onPayloadNeeded;
    this.onIncomingPacket = prophash.onIncomingPacket;
    this.onOver = prophash.onOver;
  }
  lib.inherit(RealizeTcpTransmissionTask,Task);
  RealizeTcpTransmissionTask.prototype.destroy = function(){
    if(this.onOver){
      this.onOver();
    }
    this.onOver = null;
    this.onIncomingPacket = null;
    this.getPayload = null;
    this.fingerprint = null;
    this.port = null;
    this.ipaddress = null;
    Task.prototype.destroy.call(this);
  };
  RealizeTcpTransmissionTask.prototype.go = function(){
    var c = net.createConnection(this.port,this.ipaddress),
      td = this.destroy.bind(this);
    c.on('error',this.destroy.bind(this));
    c.on('connect',this.sendFingerprint.bind(this,c));
    c.on('drain',this.deliverPayload.bind(this,c));
    c.on('data',this.onTransmissionData.bind(this,c));
    c.on('close',function () {
      c.removeAllListeners();
      c = null;
      td();
    });
  };
  RealizeTcpTransmissionTask.prototype.sendFingerprint = function(socket){
    this.writeToSocket(socket,this.fingerprint);
  };
  RealizeTcpTransmissionTask.prototype.deliverPayload = function(socket){
    var payload, lastone;
    switch(typeof this.getPayload){
      case 'function':
        payload = this.getPayload();
        break;
      case 'undefined':
        lib.runNext(this.destroy.bind(this));
        return;
      default:
        payload = this.getPayload;
        lastone = true;
        break;
    }
    this.handlePayload(socket, payload, lastone);
  };
  RealizeTcpTransmissionTask.prototype.handlePayload = function (socket, payload, lastone) {
    if(lastone || (payload === null)){
      if(payload===null){
        socket.end();
      }else{
        socket.end(payload);
      }
    }else{
      if (q.isPromise(payload)) {
        //console.log('blocking on promise');
        payload.done(
          this.handlePayload.bind(this, socket)
        );
      } else {
        //console.log('writing to socket', payload);
        this.writeToSocket(socket,payload);
      }
    }
  };
  RealizeTcpTransmissionTask.prototype.onTransmissionData = function(socket,data){
    if(this.onIncomingPacket){
      this.onIncomingPacket(data);
    }else{
      console.log('got data from socket',data);
    }
  };
  RealizeTcpTransmissionTask.prototype.writeToSocket = function(socket,data){
    if(socket.write(data)){
      lib.runNext(this.deliverPayload.bind(this,socket));
    }
  };
  RealizeTcpTransmissionTask.prototype.compulsoryConstructionProperties = ['ipaddress','port','fingerprint','onPayloadNeeded'];

  return RealizeTcpTransmissionTask;
}

module.exports = createRealizeTcpTransmissionTask;

