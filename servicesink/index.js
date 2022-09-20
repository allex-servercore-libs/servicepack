function createServiceSink(execlib){
  'use strict';
  var lib = execlib.lib,
    registry = execlib.execSuite.registry,
    ClientUser = require('./clientusercreator')(lib, execlib.execSuite.Callable, execlib.execSuite.StateSource);

  function ServiceSinkChannel(cb){
    this.cb = cb;
  }
  ServiceSinkChannel.prototype.destroy = function(){
    this.cb = null;
  };
  ServiceSinkChannel.prototype.onStream = function(item){
    this.cb(item);
  };

  function ServiceSink(prophash,client){
    lib.Destroyable.call(this);
    var nochannels = (prophash && prophash.nochannels) ? true : false;
    this.clientuser = null;
    this.state = null; //meant to be used thru materializeState task
    //if used, will be given to consumeChannel('s'
    //and therefore will be autodestroyed
    this.oobsink = null;
    if (nochannels) {
      this.state = this.extendTo(new lib.Fifo());
    }
    this.clientuser = new (this.ClientUser)(client, nochannels ? this : null);
    this.clientuser.destroyed.attachForSingleShot(this.onClientUserDestroyed.bind(this));
  }
  lib.inherit(ServiceSink,lib.Destroyable);
  ServiceSink.prototype.destroy = function(exception){
    //console.log(process.pid, 'ServiceSink destroy');
    if(this.clientuser){
      if(this.clientuser.destroyed){
        this.clientuser.die();
        return;
      }else{
        this.clientuser = null;
      }
    }
    lib.Destroyable.prototype.destroy.call(this,exception);
  };
  ServiceSink.prototype.__cleanUp = function(){
    //console.log(this.modulename,'ServiceSink dying');
    this.oobsink = null;
    this.state = null; //autodestroyed
    this.clientuser = null;
    lib.Destroyable.prototype.__cleanUp.call(this);
  };
  function destroyable(servicesink,obj){
    if(obj.destroyed){
      return obj;
    }else{
      return servicesink.extendTo(obj);
    }
  };
  ServiceSink.prototype.consumeOOB = function (consumer) {
    this.state.drain(consumer.onOOBData.bind(consumer));
    this.oobsink = consumer;
  };
  ServiceSink.prototype.consumeChannel = function(channelcode,consumer){
    var dcons = null;
    if (!this.clientuser) {
      return;
    }
    if(!consumer){
      this.clientuser.subscribeToChannel(channelcode,null);
      return;
    }
    if(consumer.onStream){
      dcons = destroyable(this,consumer);
      this.clientuser.subscribeToChannel(channelcode,dcons);
    }else if('function' === typeof consumer){
      dcons = this.extendTo(new ServiceSinkChannel(consumer));
      this.clientuser.subscribeToChannel(channelcode,dcons);
    }
    return dcons;
  };
  ServiceSink.prototype.connectionString = function(){
    return this.clientuser.client.connectionString();
  };
  ServiceSink.prototype.onClientUserDestroyed = function(exception){
    //console.log(process.pid, 'Sink', this.modulename, this.role, 'got ClientUser dead');
    this.clientuser = null;
    this.destroy(exception);
  };
  ServiceSink.prototype.subConnect = function(subservicename,identity,prophash){
    var d = lib.q.defer(), ret = d.promise;
    if (!this.clientuser) {
      d.reject(new lib.Error('ALREADY_DEAD', 'No point in subConnect-ing to a dead Sink'));
      return ret;
    }
    this.clientuser.subConnect(subservicename,identity,this.ClientUser).done(
      this.onSubConnectDone.bind(this,d,prophash),
      d.reject.bind(d)
    );
    d = null;
    subservicename = null;
    identity = null;
    prophash = null;
    return ret;
  };
  ServiceSink.prototype.onSubConnectDone = function(d,prophash,clientpack){
    if(clientpack){
      registry.resolve(clientpack.servicepackname,clientpack.role,clientpack.client,prophash,d);
    }else{
      d.reject('subConnect failed');
    }
    d = null;
    prophash = null;
  };
  ServiceSink.prototype.call = function(){
    if (!this.clientuser) {
      console.error('Sink', this.modulename, this.role, 'cannot call', arguments[0], this);
      return lib.q.reject(new lib.Error('NO_USER_TO_CALL', 'Cannot call '+arguments[0]+' without a connected user'));
    }
    return this.clientuser.call.apply(this.clientuser,arguments);
  };
  ServiceSink.prototype.sessionCall = function(){
    if (!this.clientuser) {
      return lib.q.reject(new lib.Error('NO_USER_TO_CALL', 'Cannot call '+arguments[0]+' without a connected user'));
    }
    return this.clientuser.sessionCall.apply(this.clientuser,arguments);
  };
  ServiceSink.prototype.session = function(){
    return this.clientuser.client.identity.session;
  };
  /*
  ServiceSink.prototype.die = function(){
    if (this.clientuser) {
      return this.clientuser.die();
    } else {
      console.log('no clientuser on', this);
      return lib.q(true);
    }
  };
  */
  ServiceSink.prototype.onOOBData = function (item) {
    if (this.oobsink) {
      this.oobsink.onOOBData(item);
    } else {
      this.state.push(item);
    }
  };
  ServiceSink.prototype.ClientUser = ClientUser;
  ServiceSink.inherit = function(childSinkCtor,methodDescriptors){
    var CU = this.prototype.ClientUser;
    function SinkClientUser(client, oobsink){
      CU.call(this,client,oobsink);
    }
    CU.inherit(SinkClientUser,methodDescriptors);
    lib.inherit(childSinkCtor,this);
    childSinkCtor.prototype.ClientUser = SinkClientUser;
    childSinkCtor.inherit = this.inherit;
  };
  return ServiceSink;
}

module.exports = createServiceSink;
