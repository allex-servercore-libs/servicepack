function createRemoteAuthenticatorStrategy(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  function RemoteAuthenticatorStrategy(prophash){
    this.sinkname = prophash.sinkname;
    this.identity = prophash.identity;
    this.task = null;
    this.sink = null;
    this.q = new lib.Fifo;
  }
  RemoteAuthenticatorStrategy.prototype.destroy = function(){
    if(!this.q){
      return;
    }
    this.q.destroy();
    this.q = null;
    this.sink = null;
    this.task = null;
    this.identity = null;
    this.sinkname = null;
  };
  RemoteAuthenticatorStrategy.prototype.startTask = function(){
    if(!this.task){
      this.task = taskRegistry.run('findSink',{
        sinkname: this.sinkname,
        identity: this.identity,
        onSink: this.onSink.bind(this)
      });
    }
  };
  RemoteAuthenticatorStrategy.prototype.onSink = function (sink) {
    this.sink = sink;
    if(!this.sink){
      return;
    }
    this.checkQ();
  };
  RemoteAuthenticatorStrategy.prototype.qDrainer = function (job) {
    this.goResolve(job[0],job[1]);
  };
  RemoteAuthenticatorStrategy.prototype.checkQ = function () {
    this.q.drain(this.qDrainer.bind(this));
  };
  RemoteAuthenticatorStrategy.prototype.resolveUser = function(credentials,defer){
    this.startTask();
    if(!this.sink){
      this.q.push([credentials,defer]);
    }else{
      if(this.q.length){
        this.q.push([credentials,defer]);
      }else{
        this.goResolve(credentials,defer);
      }
    }
  };
  RemoteAuthenticatorStrategy.prototype.goResolve = function(credentials,defer){
    this.sink.call('resolveUser',credentials).done(
      this.onResolveSuccess.bind(this,defer),
      this.onResolveFail.bind(this,credentials,defer)
    );
  };
  RemoteAuthenticatorStrategy.prototype.onResolveSuccess = function(defer,result){
    defer.resolve(result);
    this.checkQ();
    defer = null;
  };
  RemoteAuthenticatorStrategy.prototype.onResolveFail = function(credentials,defer,reason){
    if (this.sink) {
      console.error('RemoteAuthenticatorStrategy resolveUser failed:',reason, 'on', this.sink.modulename, this.sink.role);
    } else {
      console.error('RemoteAuthenticatorStrategy resolveUser failed:',reason, 'with no sink to remote');
    }
    //make a decision:
    //1. redo the resolving job
    //2. reject the defer
    //for now
    if (reason && reason.code === 'RESOLVER_DB_DOWN'){
      lib.runNext(this.resolveUser.bind(this,credentials, defer),lib.intervals.Second);
    } else {
      defer.reject(reason);
    }
  };

  return RemoteAuthenticatorStrategy;
}

module.exports = createRemoteAuthenticatorStrategy;
