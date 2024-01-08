function createUserSession(lib,UserEntity,SessionIntroductor,Callable){
  'use strict';
  var q = lib.q,
    qlib = lib.qlib,
    jobcores = require('./jobcores') (lib, SessionIntroductor, Callable);

  function isloggable (sess) {
    return sess && sess.user && sess.user.__service && sess.user.__service.constructor.name.indexOf('Remote')== 0;
  }
  function maybelog(sess) {
    if (!isloggable(sess)) return;
    console.log.apply(console, Array.prototype.slice.call(arguments, 1).concat([sess.session, sess.user.role, sess.user.modulename, sess.user.state.get('name')]));
  }

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

  //var __UserSessionCount = 0, __id=0;
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
    this.reportToGate('destroyed');
    if (this.session) {
      SessionIntroductor.forget(this.session);
    }
    if (this.user) {
      this.user.onSessionDown(this);
    }
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
      this.reportToGate('destroy_1');
      this.deathReported = true;
      this.sendOOB('-',true);
      lib.runNext(this.destroy.bind(this));
      return false;
    }
    this.reportToGate('destroy_2');
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
    this.reportToGate('resolved', {id: id, value: result});
    this.send(['r', id, result]);
  };
  UserSession.prototype.onError = function(id,reason){
    var eobj = {code: reason.code, message: reason.message};
    //console.log(process.pid+'', 'sending error', reason);
    //this.send(['e', id, reason]);
    this.reportToGate('rejected', {id: id, value: eobj});
    this.send(['e', id, eobj]);
  };
  UserSession.prototype.onProgress = function(id,progress){
    this.reportToGate('progress', {id: id, value: progress});
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
        //console.log(this.constructor.name, 'about to exec', cs[1], 'on', cs[0]);
        return clbl.exec(cs[1]);
      }
    }
  };
  UserSession.prototype.extraCreationArg = lib.dummyFunc;
  UserSession.prototype.handleProcess = function(processunit){
    //console.log('exec-ing',processunit.exec);
    var id = processunit[0];
    this.reportToGate('exec', processunit[2]);
    this.handleCallableSpec(processunit[2]).then(
      this.onResult.bind(this,id),
      this.onError.bind(this,id),
      this.onProgress.bind(this,id)
    );
    id = null;
  };
  UserSession.prototype.handleIncomingUnit = function(incomingunit){
    if ( !(this.user && this.user.__service) ) {
      throw new lib.Error('ALREADY_DESTROYED', 'This instance of '+this.constructor.name+' is already destroyed');
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
    return qlib.newSteppedJobOnSteppedInstance(
      new jobcores.SubConnect(this, subservicename, userspec),
      defer
    ).go();
  };
  UserSession.prototype.confirmReservation = function(defer){
    //console.log(this.session,this.user.role,this.user.modulename,'confirmReservation');
    SessionIntroductor.forget(this.session);
    defer.resolve('ok');
  };

  UserSession.prototype.reportToGate = function (type, args) {
    if (!this.gate) {
      return;
    }
    this.gate.handleSessionEvent(args
      ?
      {
      type: type,
      session: this,
      args: args
      }
      :
      {
        type: type,
        session: this
        }
    );
  };
  UserSession.prototype.readyToGo = function () {
    this.reportToGate('created');
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
