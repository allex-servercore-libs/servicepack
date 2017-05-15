function createSession2RemoteSink(lib, q, UserSession, Callable) {
  'use strict';

  function Session2RemoteSink(creatingusersession, session, remotesink){
    Callable.call(this);
    this.user = {__service:true}; //fool the gate
    this.session = session;
    this.creatingusersession = creatingusersession;
    //this.creatingusersession.subsinks.add(session, this);
    this.remotesink = remotesink;
    this.modulename = remotesink.modulename;
    if(!this.modulename) {
      console.error('no modulename on remotesink');
      process.exit(-15);
      return;
    }
    this.remoteSinkDestroyedListener = remotesink.destroyed.attach(this.remoteSinkDown.bind(this));
    this.creatingSessionDestroyedListener = creatingusersession.destroyed.attach(this.destroy.bind(this));
    remotesink.consumeOOB(this);
    this.__methodDescriptors = creatingusersession.__methodDescriptors;
  }
  lib.inherit(Session2RemoteSink, UserSession); //just the methods, with all the risk
  Session2RemoteSink.prototype.destroy = function () {
    this.log('dying');
    if (this.creatingSessionDestroyedListener) {
      this.creatingSessionDestroyedListener.destroy();
    }
    this.creatingSessionDestroyedListener = null;
    if (this.remoteSinkDestroyedListener) {
      this.remoteSinkDestroyedListener.destroy();
    }
    this.remoteSinkDestroyedListener = null;
    if (this.creatingusersession){
      this.send(['oob', [this.session, '-', true]]);
      if (this.creatingusersession.gate) {
        this.creatingusersession.gate.sessions.remove(this.session);
      }
    }
    this.modulename = null;
    if (this.remotesink) {
      this.remotesink.destroy();
    }
    this.remotesink = null;
    this.creatingusersession = null; //has .user.__service ... or is dying ...
    this.session = null;
    this.user = null;
    Callable.prototype.destroy.call(this);
  };
  Session2RemoteSink.prototype.remoteSinkDown = function () {
    if (!this.modulename) {
      console.trace();
      console.log('Session2RemoteSink should never get here');
    }
    this.log('Remote sink', this.modulename, 'is down!', this.creatingusersession ? 'will send the die signal' : 'will NOT send the die signal');
    this.remotesink = null;
    this.destroy();
  };
  Session2RemoteSink.prototype.introduceUser = function () {
    //console.log('introduceUser?');
    return {
      createSession: this.thisReturner.bind(this)
    };
  };
  Session2RemoteSink.prototype.subConnect = function (subservicename, userspec, defer) {
    if (subservicename !== '.') {
      //console.log(process.pid, 'Where will subConnect to',subservicename,'go?');
    } else {
      //console.log(process.pid, 'Session2RemoteSink subConnect to self');
    }

    if (!this.creatingusersession && this.creatingusersession.canSubConnect()) {
      ///in my time of dying ... 
      defer.reject(new lib.Error('SERVICE_GOING_DOWN'));
      return;
    }
    this.remotesink.subConnect(subservicename, this.creatingusersession.user.__service.preProcessSubconnectIdentity(subservicename, userspec), {nochannels:true}).done(
      this.onSubConnected.bind(this, defer),
      defer.reject.bind(defer)
    );
  };

  Session2RemoteSink.prototype.onSubConnected = function (defer, sink) {
    if (!(this.creatingusersession && this.creatingusersession.canSubConnect())) {
      sink.destroy();
      defer.reject(new lib.Error('SERVICE_GOING_DOWN'));
      return;
    }
    this.creatingusersession.onSubConnected(false, defer, {}, '', sink);
  };
  Session2RemoteSink.prototype.send = function () {
    if (!this.creatingusersession) {
      return;
    }
    this.creatingusersession.send.apply(this.creatingusersession,arguments);
  };
  Session2RemoteSink.prototype.handleCallableSpec = function(cs){
    //console.log('callablespec',cs,Date.now());
    var clblname = cs[0], clbl, methodname = cs[1][0];
    if(clblname === '.'){
      return this.remotesink.call.apply(this.remotesink, [methodname].concat(cs[1][1]));
    }else if(clblname ==='!'){
      if (this.__methodDescriptors[methodname] && lib.isFunction(this[methodname])) {
        return this.exec(cs[1]);
      } else {
        if (this.remotesink) {
          return this.remotesink.sessionCall.apply(this.remotesink, [methodname].concat(cs[1][1]));
        } else {
          return q.reject(new lib.Error('SERVICE_GOING_DOWN'));
        }
      }
    }else{
      //this.user.__service.subservices.dumpToConsole();
      console.log('==========+>', this.user.__service, process.pid);
      console.log(cs, 'no callable named', clblname);
      return q.reject(new lib.Error('No callable named '+clblname));
    }
  };
  Session2RemoteSink.prototype.handleIncomingUnit = function(incomingunit){
    var il = incomingunit.length;
    if (il === 2) {
      this.onResult(incomingunit[0], {session:this.session,role:this.remotesink.role,modulename:this.remotesink.modulename}); 
    }
    if (il === 3) {
      this.handleProcess(incomingunit);
    }
  };
  Session2RemoteSink.prototype.onOOBData = function (item) {
    //console.log('Session2RemoteSink', this.session, 'oob item', item);
    /*
    if (item && item[1] === '-' && item[2] === true) {
      console.log('should I die or should I no?');
    }
    */
    if (!this.session) {
      return;
    }
    item[0] = this.session;
    this.send(['oob', item]);
  };
  Session2RemoteSink.prototype.__methodDescriptors = {
    confirmReservation: true,
    die: true
  };

  Session2RemoteSink.prototype.log = function () {
    return;
    /*
    var args = Array.prototype.slice.call(arguments, 0);
    if (this.creatingusersession) {
      if (this.creatingusersession.user && this.creatingusersession.user.state) {
        args.unshift('username' , this.creatingusersession.user.state.get('name'));
        args.unshift('modulename', this.creatingusersession.user.modulename);
      } else {
        args.unshift('no user');
      }
    } else {
      args.unshift('no creatingsession');
    }
    console.log.apply(console, args);
    */
  };

  return Session2RemoteSink;
}

module.exports = createSession2RemoteSink;
