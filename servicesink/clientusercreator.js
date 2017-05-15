function createClientUser(lib, Callable, StreamSource){
  'use strict';
  var q = lib.q;
  function OOBChannel(){
    lib.Destroyable.call(this);
    StreamSource.call(this); //by default - will not destroy its sink
  }
  lib.inherit(OOBChannel,StreamSource);
  lib.inheritMethods(OOBChannel,lib.Destroyable,'destroy','extendTo');
  OOBChannel.prototype.__cleanUp = function(){
    StreamSource.prototype.destroy.call(this);
    lib.Destroyable.prototype.__cleanUp.call(this);
  };
  OOBChannel.prototype.setSink = function(sink){
    if(sink && this.sink){
      this.onMultipleSinks(sink);
    }
    StreamSource.prototype.setSink.call(this,sink);
  };
  OOBChannel.prototype.onMultipleSinks = function (sink) {
    throw new lib.Error('OOBCHANNEL_ALREADY_HAS_SINK', 'Sink already exists for OOBChannel');
  };
  function ClientUser(client, oobsink){
    if (!this.__methodDescriptors) throw Error('No method descriptors');
    lib.Destroyable.call(this);
    this.client = client;
    this.oobsink = oobsink;
    this.channels = null;
    if(!this.oobsink) {
      this.channels = new lib.Map();
    }
    if (client.destroyed) {
      this.client.setOOBSink(this.oobsink || this);
      this.client.destroyed.attachForSingleShot(this.onClientDestroyed.bind(this));
    } else {
      lib.runNext(this.destroy.bind(this), 100);
    }
  }
  lib.inherit(ClientUser,lib.Destroyable);
  ClientUser.inherit = Callable.inherit;
  ClientUser.prototype.destroy = function(exception){
    if(this.client){
      //not interested in oob any more
      //console.log(process.pid, 'ClientUser telling Client to die');
      this.client.goDie();
      return;
    }
    //console.log(process.pid, 'ClientUser dying really');
    lib.Destroyable.prototype.destroy.call(this,exception);
  };
  ClientUser.prototype.__cleanUp = function(){
    if (this.channels) {
      lib.containerDestroyAll(this.channels);
      this.channels.destroy();
    }
    this.channels = null;
    this.oobsink = null;
    this.client = null;
    lib.Destroyable.prototype.__cleanUp.call(this);
    //console.log('ClientUser finally dead');
  };
  ClientUser.prototype.die = function(){
    this.destroy();
  };
  ClientUser.prototype.onClientDestroyed = function(exception){
    //console.log('Client dead');
    //console.log(process.pid, 'ClientUser got', this.client.identity ? this.client.identity.session : 'no session', 'dead');
    this.client = null;
    this.destroy(exception);
  };
  ClientUser.prototype.callCallable = function(callablename,methodname){
    if(!this.client){
      console.trace();
      console.log(arguments);
      return;
    }
    var execobj = [callablename,[methodname, null]],
      al = arguments.length,
      d;
    if(al>2){
      var d;
      if(al==3){
        d = arguments[2];
      }else{
        d = Array.prototype.slice.call(arguments,2);
      }
      //execobj.d = d;
      execobj[1][1] = d;
    }
    return this.client.exec(execobj);
  };

  ClientUser.prototype.genericCall = function(where,methodname){
    if(!this.client){
      console.trace();
      console.log(arguments);
      this.destroy();
      return q.reject(new lib.Error('CLIENT_IS_DEAD', 'Cannot issue a call on a destroyed Client'));
    }

    var md;
    if(where==='.'){
      md = this.__methodDescriptors[methodname];
    }else if(where==='!'){
      md = true;
    }
    if (!md) {
      console.trace();
      console.error('Did not yield a methodname, subservice name:', this.client.subservicename, 'has methods:');
      console.error(this.__methodDescriptors, 'got arguments', arguments);
      return q.reject(new lib.Error('NO_METHOD_DESCRIPTOR', 'No descriptor for method: '+methodname));
    }
    return this.client.exec([where, [methodname, arguments.length > 2 ? Array.prototype.slice.call(arguments,2) : null]]);
  };

  ClientUser.prototype.call = function(methodname){
    if(!methodname) {
      console.trace();
      console.log(arguments, 'miss the first argument');
    }
    return this.genericCall.apply(this,['.'].concat(Array.prototype.slice.call(arguments)));
  };

  ClientUser.prototype.sessionCall = function(methodname){
    return this.genericCall.apply(this,['!'].concat(Array.prototype.slice.call(arguments)));
  };

  ClientUser.prototype.subConnect = function(subservicename,identity){
    return this.client.subConnect(subservicename,identity);
  };
  ClientUser.prototype.getOrCreateChannel = function(channelname){
    if (!this.channels) {
      console.trace();
      console.error('cannot getOrCreateChannel when in "external oobsink" mode');
      process.exit(0);
    }
    if(channelname==='.'){
      //that's my session, skip it...
      return;
    }
    var c = this.channels.get(channelname);
    if(!c){
      c = new OOBChannel();
      this.channels.add(channelname,c);
    }
    return c;
  };
  ClientUser.prototype.dispatchToChannel = function(item,channelname){
    var c = this.getOrCreateChannel(channelname);
    if(c){
      c.handleStreamItem(item);
    }
  };
  ClientUser.prototype.onOOBData = function(data){
    this.dispatchToChannel(data[2], data[1]);
  };
  ClientUser.prototype.subscribeToChannel = function(channelname,sink){
    var c = this.getOrCreateChannel(channelname);
    if(c){
      c.setSink(sink);
    }
  };
  ClientUser.prototype.__methodDescriptors = {
    die:true,
    introduceUser:[{
      title: 'User property hash',
      type: 'object'
    }],
    subConnect:[{
      title:'SubService name',
      type: 'string'
    },{
      title:'Identity',
      type: 'object'
    },{
      title:'SubClientUser constructor',
      type: 'function'
    }]
  };
  return ClientUser;
}

module.exports = createClientUser;
