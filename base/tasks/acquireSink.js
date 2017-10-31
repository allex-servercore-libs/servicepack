function createAcquireSinkTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      Task = execSuite.Task,
      ResolvableTaskError = execSuite.ResolvableTaskError;

  function ResolvableBadAddressError(){
    var ret = ResolvableTaskError.call(this);
    return ret;
  }
  lib.inherit(ResolvableBadAddressError,ResolvableTaskError);


  function AcquireSinkTask(prophash){
    Task.call(this,prophash);
    this.identity = prophash.identity||null;
    this.session = prophash.session;
    this.onSink = prophash.onSink;
    this.connectionString = prophash.connectionString;
    this.onCannotConnect = prophash.onCannotConnect;
    this.onConnectionLost = prophash.onConnectionLost;
    this.prophash = prophash.propertyhash;
    this.singleshot = prophash.singleshot || false;
    this.connected = false;
    this.sinkDestroyedListener = null;
    if(!this.connectionString){
      throw new lib.Error('NO_CONNECTION_STRING', 'property hash missing the connectionString field');
    }
  }
  lib.inherit(AcquireSinkTask,Task);
  AcquireSinkTask.prototype.destroy = function(){
    if(this.sinkDestroyedListener){
      this.sinkDestroyedListener.destroy();
    }
    this.sinkDestroyedListener = null;
    this.connected = null;
    this.singleshot = null;
    this.prophash = null;
    this.onConnectionLost = null;
    this.onCannotConnect = null;
    this.connectionString = null;
    this.onSink = null;
    this.identity = null;
    Task.prototype.destroy.call(this);
  };
  AcquireSinkTask.prototype.go = function(){
    if(!this.onSink){
      return;
    }
    this.log('AcquireSinkTask starting', this);
    registry.spawn(this.prophash,this.connectionString,this.identity,this.session).done(
      this.onSpawnSuccess.bind(this),
      this.onSpawnError.bind(this)
    );
  };
  AcquireSinkTask.prototype.onSpawnSuccess = function(sink){
    if (!this.onSink) { //me ded
      sink.destroy();
      return;
    }
    this.log(this.connectionString,'got a sink',sink.modulename,sink.role,'for',this.singleshot ? 'singleshot' : 'continuous monitoring');
    if(this.connected===null){
      sink.destroy();
      return;
    }
    this.connected = true;
    if('function' === typeof this.onSink){
      if(this.singleshot){
        this.log('AcquireSinkTask will die in next tick');
        lib.runNext(this.destroy.bind(this));
      }else{
        this.sinkDestroyedListener = sink.destroyed.attach(this.onSinkDown.bind(this));
      }
      this.onSink(sink);
    }else{
      sink.destroy();
      this.destroy();
    }
  };
  AcquireSinkTask.prototype.onSpawnError = function(reason){
    var wasconnected;
    if(this.connected===null){
      return;
    }
    this.log('Spawn Error',reason.toString(),'was connected',wasconnected);
    wasconnected = this.connected;
    this.connected = false;
    if(wasconnected){
      if(this.onConnectionLost){
        this.onConnectionLost(reason);
        //return;
      }
    }else{
      if(this.onCannotConnect){
        this.onCannotConnect(reason);
        //return;
      }
    }
    //this.log('Spawn Error',reason,'was connected',wasconnected,this);
    /*
    switch(reason.code){
      case 'NO_SERVER':
        lib.runNext(this.go.bind(this),1000);
        break;
      case 'BAD_ADDRESS':
        this.raiseException(new ResolvableTaskError);
        break;
      default:
        this.handleError(reason);
        break;
    }
    */
    lib.runNext(this.go.bind(this),1000);
  };
  AcquireSinkTask.prototype.onSinkDown = function(reason){
    this.connected = false;
    this.sinkDestroyedListener.destroy();
    this.sinkDestroyedListener = null;
    if(this.onSink){
      this.onSink(null);
      this.go();
    }
  };
  AcquireSinkTask.prototype.handleError = function(error){
    console.log(this.connectionString, 'NO FUTURE',error);
    if(this.onCannotConnect){
      this.onCannotConnect(error);
    }else{
      //throw error;
      this.destroy();
    }
  };
  AcquireSinkTask.prototype.compulsoryConstructionProperties = ['onSink','connectionString'];
  return AcquireSinkTask;
};

module.exports = createAcquireSinkTask;
