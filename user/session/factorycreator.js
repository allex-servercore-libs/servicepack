function createFactoryCreator(lib){
  'use strict';
  return function createFactory(UserSessionCtor){
    'use strict';

    function ParentProcessUserSession(user,session,gate){
      UserSessionCtor.call(this,user,session,gate);
    }
    lib.inherit(ParentProcessUserSession,UserSessionCtor);
    var _parentProcessSessionSet=false;
    ParentProcessUserSession.prototype.obtainSession = function(){
      if(!_parentProcessSessionSet){
        _parentProcessSessionSet = true;
        return process.env.parentProcessID;
      }else{
        return UserSessionCtor.prototype.obtainSession.call(this);
      }
    }
    ParentProcessUserSession.prototype.send = function(data){
      /*
      console.trace();
      console.log('sending',data,Date.now());
      */
      process.send(data);
    };
    ParentProcessUserSession.prototype.terminate = function (data) {
      process.exit(1);
    };

    function InProcUserSession(user,session,gate,inprocrequester){
      UserSessionCtor.call(this,user,session,gate);
      this.requester = inprocrequester;
    }
    lib.inherit(InProcUserSession,UserSessionCtor);
    InProcUserSession.prototype.__cleanUp = function(){
      this.requester = null;
      UserSessionCtor.prototype.__cleanUp.call(this);
    };
    InProcUserSession.prototype.send = function(data){
      if(!this.requester){
        return;
      }
      this.requester.onIncoming(data);
    };

    function SocketUserSession(user,session,gate,talker){
      UserSessionCtor.call(this,user,session,gate);
      this.talker = null;
      this.talkerDestroyedListener = null;
      if (!(talker && talker.destroyed)) {
        this.destroy();
      } else {
        this.talker = talker;
        this.talkerDestroyedListener = this.talker.destroyed.attach(this.onTalkerDead.bind(this));
        //console.log('Server attached to Talker', this.talker.id, this.talker.destroyed.collection.length);
      }
    }
    lib.inherit(SocketUserSession,UserSessionCtor);
    SocketUserSession.prototype.__cleanUp = function(){
      if (this.talkerDestroyedListener) {
        this.talkerDestroyedListener.destroy();
      }
      this.talkerDestroyedListener = null;
      this.talker = null;
      UserSessionCtor.prototype.__cleanUp.call(this);
    };
    SocketUserSession.prototype.onTalkerDead = function(){
      //console.log(process.pid,this.session,'talker is dead');
      this.destroy();
    };
    SocketUserSession.prototype.send = function(data){
      if(!this.talker){
        /*
        console.trace();
        console.log('No talker?',data,this);
        */
        return;
      }
      this.talker.send(data);
    };
    SocketUserSession.prototype.extraCreationArg = function(){
      return this.talker;
    };
    SocketUserSession.prototype.terminate = function () {
      if (this.talker) {
        if (this.talker.socket) {
          this.talker.socket.end();
        }
        this.talker.destroy();
      }
    };

    function WSUserSession(user,session,gate,wswrapper){
      UserSessionCtor.call(this,user,session,gate);
      this.wswrapper = wswrapper;
      this.wsDestroyedListener = null;
      if(!this.wswrapper){
        this.destroy();
      } else if(!this.wswrapper.destroyed){
        this.destroy();
      } else {
        //console.log(process.pid,'new WSUserSession', this.wswrapper.localPort(), this.session);
        //TODO: this seems to double-connect WSUserSession to its destroy()
        this.wsDestroyedListener = this.wswrapper.destroyed.attach(this.destroy.bind(this));
      }
    }
    lib.inherit(WSUserSession,UserSessionCtor);
    WSUserSession.prototype.__cleanUp = function(){
      if (this.wsDestroyedListener) {
        this.wsDestroyedListener.destroy();
      }
      this.wsDestroyedListener = null;
      this.wswrapper = null;
      UserSessionCtor.prototype.__cleanUp.call(this);
    };
    WSUserSession.prototype.send = function(data){
      if(!this.wswrapper){
        /*
        console.trace();
        console.log('No wsock?',data,this);
        */
        return;
      }
      this.wswrapper.send(data);
    };
    WSUserSession.prototype.extraCreationArg = function(){
      return this.wswrapper;
    };
    WSUserSession.prototype.terminate = function () {
      if (this.wswrapper) {
        this.wswrapper.terminate();
      }
    };

    function HttpUserSession(user,session,gate,srchannel){
      UserSessionCtor.call(this,user,session,gate);
      this.signalRchannel = srchannel;
      this.srDestroyedListener = null;
      if (this.signalRchannel && this.signalRchannel.destroyed) {
        this.srDestroyedListener = this.signalRchannel.destroyed.attach(this.destroy.bind(this));
      } else {
        this.destroy();
      }
    }
    lib.inherit(HttpUserSession,UserSessionCtor);
    HttpUserSession.prototype.__cleanUp = function(){
      if (this.srDestroyedListener) {
        this.srDestroyedListener.destroy();
      }
      this.srDestroyedListener = null;
      this.signalRchannel = null; //don't destroy it, let it be destroyed only because of socket close
      UserSessionCtor.prototype.__cleanUp.call(this);
    };
    HttpUserSession.prototype.send = function(data){
      if (this.signalRchannel) {
        this.signalRchannel.invokeOnClient('_', data);
      }
    };
    HttpUserSession.prototype.terminate = function () {
      var src = this.signalRchannel;
      this.signalRchannel = null;
      if (src) {
        src.destroy();
      }
    };

    return function getSessionCtor(communicationtype){
      switch(communicationtype){
        case '.':
          return UserSessionCtor;
        case 'http':
          return HttpUserSession;
        case 'parent_process':
          return ParentProcessUserSession;
        case 'socket':
          return SocketUserSession;
        case 'ws':
          return WSUserSession;
        case 'inproc':
          return InProcUserSession;
      }
    };
  };
}

module.exports = createFactoryCreator;
