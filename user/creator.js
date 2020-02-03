function createUserSuite(lib, UserEntity, UserSession, Collection){
  'use strict';
  var q = lib.q, qlib=lib.qlib, _uid = 0, sessionAcceptorFactory = require('./sessionacceptance')(lib);
  function setProp(u,prophash,propname){
    u.set(propname,prophash[propname]);
  }

  function User(propertyhash){
    //console.log('User',propertyhash);
    //this._id = ++_uid;
    UserEntity.call(this);
    this.state = this.extendTo(new Collection());
    this.__service = propertyhash.__service||null;
    this.sessionAcceptor = new this.sessionAcceptorPolicy(this, this.createSessionAcceptorPropertyHash(propertyhash));
    this.sessions = new lib.Fifo();
    if(!(this.__service && this.__service.state)){
      console.trace();
      throw "User needs a __service with state";
    }
    this.set('name',propertyhash.name);
    if(this.__exportableProperties){
      this.__exportableProperties.forEach(setProp.bind(null,this,propertyhash));
    }
  }
  lib.inherit(User,UserEntity);
  //User.inherit = UserEntity.inherit;
  function distinctElements(a1,a2){
    var ret = a1.slice(), _r = ret;
    a2.forEach(function(a2item){
      if(_r.indexOf(a2item)<0){
        _r.push(a2item);
      }
    });
    _r = null;
    return ret;
  }
  function combineStateFilters(sf1,sf2){
    if(lib.isArray(sf1) && lib.isArray(sf2)){
      return distinctElements(sf1,sf2);
    }
    return sf2 || sf1;
  }
  User.inherit = function(userChildCtor,methodDescriptors,stateFilterCtor){
    UserEntity.inherit.call(this,userChildCtor,methodDescriptors);
    userChildCtor.stateFilter = combineStateFilters(this.stateFilter,stateFilterCtor);//stateFilterCtor || this.stateFilter;
  };
  function dyingStarter(sess){
    sess.destroy();
  }
  User.prototype.__cleanUp = function(){
    this.sessions.destroy();
    this.sessions = null;
    this.sessionAcceptor.destroy();
    this.sessionAcceptor = null;
    this.__service = null;
    //this.state.destroy(); //extendedTo
    this.state = null;
    //console.log('User dying on', this.modulename);
    UserEntity.prototype.__cleanUp.call(this);
  };
  User.prototype.startTheDyingProcedure = function(){
    //lib.containerDestroyAll(this.sessions);
    if (!this.sessions) {
      return;
    }
    if (this.sessions.length) {
      this.sessions.traverse(dyingStarter);
    }
  };
  User.prototype.dyingCondition = function(){
    //console.log(this.get('name'), 'has', this.sessions.length, 'now on', this.modulename);
    if (!this.sessions) {
      return true;
    }
    return this.sessions.length<1;
  };
  User.prototype.set = function(name,val){
    return this.state.set(name,val);
  };
  User.prototype.get = function(name,val){
    return this.state.get(name);
  };
  User.prototype.remove = function(name){
    return this.state.remove(name);
  };
  User.prototype.createSession = function(gate,session,arg1){
    var ctor, ret;
    if (!this.state) {
      return;
    }
    if (!this.aboutToDie) {
      return;
    }
    ctor = this.getSessionCtor(gate.communicationType);
    if (ctor) {
      ret = this.sessionAcceptor.resolveNewSession(new ctor(this,session,gate,arg1));
      if(ret) {
        qlib.thenAny(ret, this.attachSession.bind(this));
      } else {
        console.error('no resolved session', ret);
        ret = null;
      }
    }
    return ret;
  };
  User.prototype.onSessionDown = function(sessitem){
    //console.log(this.get('name'), this.__service.modulename, 'removing session', sessitem.content.session);
    //console.log('before remove', this.sessions.length);
    this.sessions.remove(sessitem);
    //console.log('after remove', this.sessions.length);
    //console.log(this.sessions.length, 'sessions left');
    if(this.sessions.length<1){
      //console.log(this.get('name'),this.__service.modulename,this.role,'out of sessions, should die now');
      this.onAllSessionsDown();
    }
    sessitem = null;
  };
  //this method is not needed at all, but keeping it - just in case...
  //the method was intented to be overriden by allex_userservice Users 
  //of all roles to allow for 10 secs of delay before player apartment
  //goes down, which was proven to be a misconception
  User.prototype.onAllSessionsDown = function(){
    this.destroy();
  };
  User.prototype.attachSession = function(session){
    var c, sessitem;
    if (!(session && session.aboutToDie)) {
      return;
    }
    if(!(this.state && this.aboutToDie)){
      session.destroy();
      return;
    }
    if(!(this.__service && this.__service.roleFilters)) {
      session.destroy();
      return;
    }
    if(!this.sessionAcceptor) {
      session.destroy();
      return;
    }
    sessitem = this.sessions.push(session);
    session.destroyed.attachForSingleShot(this.onSessionDown.bind(this,sessitem));
    c = session.channels.get('s');
    //console.log(this.get('name'),'got',this.sessionCount,'sessions');
    var f = this.__service.roleFilters.get(this.role);
    if(f){
      f.setSink(c);
    }
    /*return*/ this.state.setSink(c);
  };
  User.prototype.role = 'genericuser';
  User.prototype.__methodDescriptors = {
  };
  User.prototype.createSessionAcceptorPropertyHash = function (prophash) {
    return null;
  };
  User.prototype.sessionAcceptorFactory = sessionAcceptorFactory;
  User.prototype.sessionAcceptorPolicy = sessionAcceptorFactory.get('letany');
  return User;
}

module.exports = createUserSuite;
