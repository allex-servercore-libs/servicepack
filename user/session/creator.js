function createUserSession(lib,UserEntity,SessionIntroductor,Callable){
  'use strict';
  var q = lib.q,
    Session2RemoteSink;

  function OOBChannel(usersession,name){
    lib.Destroyable.call(this);
    this.usersession = usersession;
    this.message = [this.usersession.session,this.name,null];//{'.': this.usersession.session};
    //this.message[this.name] = null;
  }
  lib.inherit(OOBChannel,lib.Destroyable);
  OOBChannel.prototype.__cleanUp = function(){
    this.message = null;
    this.usersession = null;
    lib.Destroyable.prototype.__cleanUp.call(this);
  };
  OOBChannel.prototype.onStream = function(item){
    if(!(this.usersession && this.usersession.destroyed && this.name)){
      console.log('OOBChannel NOT sending', item);
      return;
    }
    //this.message[this.name] = item;
    this.message[2] = item;
    this.usersession.oobMessage[1] = this.message;
    this.usersession.send(this.usersession.oobMessage);
    //this.usersession.sendOOB(this.name,item);
  };
  OOBChannel.prototype.name = 's';

  function ExclusivityChannel(usersession,name) {
    OOBChannel.call(this, usersession, name);
  }
  lib.inherit(ExclusivityChannel, OOBChannel);
  ExclusivityChannel.prototype.name = 'x';

  var __UserSessionCount = 0, __id=0;
  function UserSession(user,session,gate){
    //this.id = ++__id;
    //console.log(process.pid, 'new UserSession', this.id, ++__UserSessionCount);
    UserEntity.call(this);
    this.deathReported = false;
    this.user = user;
    this.gate = gate;
    this.session = session || this.obtainSession();
    this.channels = new lib.Map;
    this.oobMessage = ['oob', null];
    this.addChannel();
    this.addChannel(ExclusivityChannel);
  }
  lib.inherit(UserSession,UserEntity);
  UserSession.prototype.__cleanUp = function(){
    /*
    if (this.user && this.user.state) {
      console.log('UserSession dying on', this.user.get('name'), this.user.modulename);
    }
    */
    this.oobMessage = null;
    lib.containerDestroyAll(this.channels);
    this.channels.destroy();
    this.channels = null;
    this.session = null;
    this.gate = null;
    this.user = null;
    this.deathReported = null;
    UserEntity.prototype.__cleanUp.call(this);
    //console.log(process.pid, 'UserSession', this.id, 'down', --__UserSessionCount);
  };
  UserSession.prototype.dyingCondition = function(){
    if (!this.deathReported) {
      this.deathReported = true;
      this.sendOOB('-',true);
    }
    return true;
  };
  UserSession.prototype.addChannel = function(channelctor){
    var ctor = channelctor||OOBChannel,
      channelname = ctor.prototype.name,
      c = this.channels.get[channelname];
    if(c){
      throw "OOB channel named "+channelname+" already exists";
    }
    c = new (ctor)(this,channelname);
    this.channels.add(channelname,c);
    return c;
  };
  UserSession.prototype.removeChannel = function(channelname){
    var c = this.channels.remove(channelname);
    if(!c){
      throw "OOB channel named "+channelname+" could not be removed because it does not exist";
    }
    c.destroy();
  };
  UserSession.prototype.sendOOB = function(channelname,item){
    if (!this.oobMessage) {
      return;
    }
    this.oobMessage[1] = [this.session, channelname, item];
    this.send(this.oobMessage);
  };
  UserSession.prototype.die = function(defer){
    //console.log(process.pid,'UserSession',this.session,'should die at',Date.now());
    defer.resolve('dead');
    lib.runNext(this.destroy.bind(this));
  };
  UserSession.prototype.obtainSession = function(){
    return lib.uid();
  };
  UserSession.prototype.connectionData = function(){
    console.trace();
    throw "Generic UserSession does not implement connectionData";
  };
  UserSession.prototype.output = function(id,data){
    data.id = id;
    data.session = this.session;
    this.send(data);
  };
  UserSession.prototype.onResult = function(id,result){
    this.send(['r', id, result]);
  };
  UserSession.prototype.onError = function(id,reason){
    //console.log(process.pid+'', 'sending error', reason);
    //this.send(['e', id, reason]);
    this.send(['e', id, {code: reason.code, message: reason.message}]);
  };
  UserSession.prototype.onProgress = function(id,progress){
    this.send(['n', id, progress]);
  };
  UserSession.prototype.handleCallableSpec = function(cs){
    //console.log('callablespec',cs,Date.now());
    /*
    if('-' in cs){
      lib.runNext(this.destroy.bind(this));
      d.resolve({session: this.session, dead:true});
      return d.promise;
    }
    */
    var clblname = cs[0], clbl;
    if(clblname === '.'){
      clbl = this.user;
    }else if(clblname ==='!'){
      clbl = this;
    }else{
      clbl = (this.user&&this.user.__service.subservices) ? this.user.__service.subservices.get(clblname) : null;
    }
    //console.log('clbl is',clbl,'on name',clblname,this.user&&this.user.__service.subservices ? 'has': 'has no','subservices');
    if('undefined' === typeof clbl){
      this.user.__service.subservices.dumpToConsole();
      console.log('==========+>', this.user.__service.subservices._cntr, process.pid);
      console.log(cs, 'no callable named', clblname);
      return q.reject(new lib.Error('No callable named '+clblname));
    }else{
      if(!clbl.exec){
        console.log('session',this.session);
        console.log('execing',cs,'on',clblname,'=>',clbl,Date.now());
        process.exit(0);
      }else{
        //console.log('UserSession about to exec', cs[1], 'on', cs[0]);
        return clbl.exec(cs[1]);
      }
    }
  };
  UserSession.prototype.extraCreationArg = lib.dummyFunc;
  UserSession.prototype.handleProcess = function(processunit){
    //console.log('exec-ing',processunit.exec);
    var id = processunit[0];
    this.handleCallableSpec(processunit[2]).then(
      this.onResult.bind(this,id),
      this.onError.bind(this,id),
      this.onProgress.bind(this,id)
    );
  };
  UserSession.prototype.handleIncomingUnit = function(incomingunit){
    if ( !(this.user && this.user.__service) ) {
      return;
    }
    var il = incomingunit.length;
    if (il === 2) {
      this.onResult(incomingunit[0], {session:this.session,role:this.user.role,modulename:this.user.__service.modulename}); 
    }
    if (il === 3) {
      this.handleProcess(incomingunit);
    }
  };
  UserSession.prototype.handleIncoming = function(incoming){
    if(!lib.isArray(incoming)) {
      return {err:'Not a callable format'};
    }
    return this.handleIncomingUnit(incoming);
  };
  UserSession.prototype.onUserIntroduced = function(defer,userprophash,modulename){
    defer.resolve({
      introduce:{session:SessionIntroductor.introduce(userprophash),role:userprophash.role,modulename:modulename}
    });
    defer = null;
    userprophash = null;
    modulename = null;
  };
  UserSession.prototype.startTheDyingProcedure = function(){
    if(this.gate && this.gate.sessions) {
      this.gate.sessions.remove(this.session);
    }
  };
  UserSession.prototype.onSubConnected = function(issubsink,defer,userspec,subservicename,userrepresentation){
    var sess;
    if (!this.gate) {
      defer.reject(new lib.Error('ALREADY_DESTROYED', 'why did you call me if i\'m gonna die ...'));
      issubsink = null;
      defer = null;
      userspec = null;
      subservicename = null;
      userrepresentation = null;
      return;
    }
    if (!userrepresentation) {
      defer.resolve(null);
      issubsink = null;
      defer = null;
      userspec = null;
      subservicename = null;
      return;
    }
    if (userspec.__service) {
      if(issubsink){
        //console.log('SubSink up', sess);
        if (!userrepresentation.destroyed) {
          defer.resolve(null);
          issubsink = null;
          defer = null;
          userspec = null;
          subservicename = null;
          return;
        }
        userrepresentation.destroy();
      }//else leave the user to its own UserSessions that will destroy him
      sess = SessionIntroductor.introduce(userspec);
      defer.resolve({
        introduce:{
          session:sess,
          modulename:userrepresentation.modulename,
          role:userrepresentation.role
        }
      });
    } else {
      try {
      if(!Session2RemoteSink) {
        //late require needed because of UserSession that need to be formed completely
        Session2RemoteSink = require('./session2remotesinkcreator')(lib, q, UserSession, Callable);
      }
      sess = lib.uid();
      this.gate.sessions.add(sess, new Session2RemoteSink(this,sess,userrepresentation));
      defer.resolve({
        introduce:{
          session:sess,
          modulename:userrepresentation.modulename,
          role:userrepresentation.role
        }
      });
      } catch (e) {
      console.error(e.stack);
      console.error(e);
      }
    }
    issubsink = null;
    defer = null;
    userspec = null;
    subservicename = null;
  };
  UserSession.prototype.canSubConnect = function () {
    return (!this.__dying && this.user && this.user.__service && this.user.__service.state && !this.user.__service.state.get('closed'))
  };
  UserSession.prototype.onSubConnectedToSelf = function (subservicename, userspec, defer, introduceduser) {
    if (lib.isUndef(userspec.__service)){
      console.error(this.user.__service.modulename, 'does not introduce __service to userspec', userspec);
      defer.reject(new lib.Error('NO_SERVICE_IN_USERSPEC'));
      return;
    }
    this.onSubConnected(false,defer,userspec,subservicename,introduceduser);
  };
  UserSession.prototype.subConnect = function(subservicename, userspec ,defer){
    //console.log(process.pid, 'UserSession', this.id, 'subConnect', subservicename);
    if(!this.canSubConnect()){
      console.trace();
      console.log('SERVICE_GOING_DOWN',this);
      defer.reject(new lib.Error('SERVICE_GOING_DOWN'));
      return;
    }
    var introduceduser;
    userspec = userspec || {};
    if(!('role' in userspec)){
      userspec.role = this.user.role;
    }
    if(!('name' in userspec)){
      userspec.name = this.user.get('name');
    }
    if(subservicename==='.'){
      //userspec.__service = this.user.__service;
      introduceduser = this.user.__service.introduceUser(userspec);
      if (q.isPromise(introduceduser)) {
        introduceduser.then(this.onSubConnectedToSelf.bind(this, subservicename, userspec, defer));
      } else {
        this.onSubConnectedToSelf(subservicename, userspec, defer, introduceduser);
      }
      //console.log(process.pid, this.user.__service.modulename, 'Standard subConnect to self', introduceduser ? introduceduser.modulename : 'no_modulename?');
    }else{
      var sink = this.user.__service.subservices.get(subservicename);
      if(sink){
        if(lib.isFunction(sink.introduceUser)){ //service-role sink
          sink.introduceUser(this.user.__service.preProcessSubconnectIdentity(subservicename, userspec)).done(
            this.onSubConnected.bind(this,true,defer,userspec,subservicename),
            defer.reject.bind(defer)
          );
        } else {
          //console.log(process.pid, 'Session2RemoteSink', subservicename, sink.modulename, 'connecting to self');
          if (sink instanceof lib.Fifo) {
            var d = q.defer();
            d.promise.done(
              this.subConnect.bind(this, subservicename, userspec, defer),
              defer.reject.bind(defer)
            );
            sink.push(d);
          } else {
            sink.subConnect('.',this.user.__service.preProcessSubconnectIdentity(subservicename, userspec),{nochannels:true}).done(
              this.onSubConnected.bind(this,true,defer,userspec,subservicename),
              defer.reject.bind(defer)
            );
          }
        }
      }else{
        //console.log(process.pid, this.user.__service.modulename, 'has no', subservicename);
        //this.user.__service.subservices.dumpToConsole();
        defer.reject(new lib.Error('NO_SUBSERVICE', 'No subservice registered by name '+subservicename));
      }
    }
  };
  UserSession.prototype.confirmReservation = function(defer){
    //console.log(this.session,this.user.role,this.user.modulename,'confirmReservation');
    defer.resolve('ok');
  };
  UserSession.prototype.__methodDescriptors = {
    subConnect: [{
      title: 'SubService name',
      type: 'string'
    },{
      title: 'Identity',
      type: 'object'
    }],
    confirmReservation: true,
    die: true
  };
  UserSession.inherit = UserEntity.inherit;
  UserSession.Channel = OOBChannel;
  return UserSession;
}

module.exports = createUserSession;
