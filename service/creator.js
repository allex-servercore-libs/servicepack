var fs = require('fs');

function createService(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    jsonschema = lib.jsonschema,
    validator = new (jsonschema.Validator)(),
    functionCopy = lib.functionCopy,
    execSuite = execlib.execSuite,
    Collection = execSuite.Collection,
    UserRoleFilter = require('./userrolefiltercreator')(execlib);

  function Service(propertyhash){
    this.checkPropertyHashDescriptor(propertyhash);
    lib.ComplexDestroyable.call(this);
    this.users = new lib.DIContainer();
    this.roleFilters = new lib.Map();
    this.state = this.extendTo(new Collection());
    this.subservices = new lib.DIContainer();
    this.readyToAcceptUsersDefer = null;
    if (this.isInitiallyReady(propertyhash)) {
      propertyhash.__readyToAcceptUsers.resolve(true);
    } else {
      this.readyToAcceptUsersDefer = propertyhash.__readyToAcceptUsers;
    }
  }
  lib.inherit(Service, lib.ComplexDestroyable);
  Service.prototype.__cleanUp = function(){
    //console.log('Service', this.modulename, 'dying');
    //this.state.destroy(); //extendedTo
    if (this.readyToAcceptUsersDefer) {
      this.readyToAcceptUsersDefer.resolve(false);
    }
    this.readyToAcceptUsersDefer = null;
    this.state = null;
    this.subservices.destroy();
    this.subservices = null;
    if (this.roleFilters) {
      lib.containerDestroyAll(this.roleFilters);
      this.roleFilters.destroy();
    }
    this.roleFilters = null;
    if (this.users) {
      this.users.destroy();
    }
    this.users = null;
    lib.ComplexDestroyable.prototype.__cleanUp.call(this);
  };
  Service.prototype.startTheDyingProcedure = function () {
    this.set('closed',true);
    //console.log(process.pid,'Service',this.modulename,'closed',this.state.get('closed'));
    this.subservices.destroyDestroyables();
    this.killAllUsers();
  };
  Service.prototype.dyingCondition = function () {
    if (!this.subservices) {
      return true;
    }
    if (!this.users) {
      return true;
    }
    return this.subservices.empty() && this.users.empty();
  };

  Service.prototype.preProcessSubconnectIdentity = function (subservicename, userspec) {
    return userspec;
  };

  Service.prototype.preProcessUserHash = function (userhash) {
    return userhash;
  };
  Service.prototype.isInitiallyReady = function (propertyhash) {
    return true;
  };
  Service.prototype.onSuperSink = function(supersink){
  };
  Service.prototype.set = function (name, val) {
    if (this.state) {
      this.state.set(name, val);
    }
  };
  /*
  Service.prototype.listenForState = function (substatename, cb, onlywhennotnull, singleshot) {
    return this.state.listenFor(substatename, cb, onlywhennotnull, singleshot);
  };
  Service.prototype.listenForSubService = function (subservicename, cb, onlywhennotnull, singleshot) {
    return this.subservices.listenFor(subservicename, cb, onlywhennotnull, singleshot);
  };
  */
  Service.prototype.userFactory = new lib.Map();
  Service.prototype.killAllUsers = function(){
    if (this.users) {
      this.users.destroyDestroyables();
    }
  };
  Service.prototype.close = function(){
    this.destroy();
  };
  Service.prototype._onStaticallyStartedSubServiceDown = function(localname){
    if (!this.state) { //I'm dead too
      return;
    }
    this.set('have'+localname,false);
    this.state.remove('have'+localname);
    this.subservices.unregister(localname);
    this.maybeDie();
  };
  Service.prototype._onStaticallyStartedSubService = function(localname,sink){
    if (!this.subservices) {
      if (sink && sink.destroyed) {
        sink.destroy();
      }
      return;
    }
    var ss = this.subservices.get(localname); //perhaps somebody got here before?
    if (ss) {
      sink.destroy();
      return q(ss);
    }
    return this._activateStaticSubService(localname, sink);
  };
  Service.prototype._activateStaticSubService = function (name, sink) {
    this.set('have'+name,true);
    this.subservices.registerDestroyable(name, sink, this._onStaticallyStartedSubServiceDown.bind(this,name));
    return q(sink);
  };
  Service.prototype.startSubServiceStatically = function(modulename,localname,propertyhash,roleremapping){
    return execSuite.start({
      service: {
        modulename: modulename,
        propertyhash: propertyhash,
        roleremapping: roleremapping||{}
      }
    }).then(
      this._onStaticallyStartedSubService.bind(this,localname)
    );
  };
  Service.prototype.startSubServiceStaticallyWithUserSink = function (modulename,localname,propertyhash) {
    return this.startSubServiceStatically(modulename,localname,propertyhash).then(
      (ssink) => {
        return ssink.subConnect('.', {name: 'user', role: 'user'});
      }
    ).then(
      this._activateStaticSubService.bind(this, localname+'_usersink')
    );
  };
  Service.prototype.findUserCtor = function(role,defer){
    if(!this.userFactory){
      throw "Function prototype has no user factory. It does not inherit from Service";
    }
    return this.userFactory.get(role);
  };

  Service.prototype.propertyHashChecker = function (propertypath, prophash, descitem, descname) {
    var result, target = prophash[descname];
    if (lib.isUndef(target)){
      throw lib.Error('SERVICE_PROPERTYHASH_ELEMENT_UNDEFINED', descname+' in propertyhash of '+this.modulename+' is not defined');
    }
    if (descitem.type) {
      result = validator.validate(target, descitem);
      if (result.errors.length) {
        throw lib.Error('SERVICE_PROPERTYHASH_ELEMENT_ERROR', descname+' in propertyhash of '+this.modulename+' produced an error '+result.errors[0].message);
      }
    }
  };

  Service.prototype.checkPropertyHashDescriptor = function (prophash) {
    if (!this.propertyHashDescriptor) {
      return;
    }
    if (!prophash) {
      throw new lib.Error('NO_PROPERTY_HASH', this.modulename+' lacks the property hash');
    }
    var ph = prophash;
    lib.traverseShallow(this.propertyHashDescriptor, this.propertyHashChecker.bind(this, '', ph));
    ph = null;
  };
  Service.prototype.createNewRoleStateFilter = function(userctor){
    var urf = new UserRoleFilter(userctor);
    if(urf){
      this.roleFilters.add(userctor.prototype.role,urf);
      this.state.setSink(urf);
    }
    return urf;
  };

  Service.prototype.introduceUser = function(userhash){
    var username, user, userctor;
    if (!this.users) {
      return null;
    }
    this.preProcessUserHash(userhash);
    /*
    console.trace();
    console.log('introduceUser',userhash);
    */
    if('object' !== typeof(userhash) || userhash === null){
      return null;
    }
    if (!this.checkForServiceMismatch(userhash)) {
      return null;
    }
    if (!this.checkForUsername(userhash)) {
      return null;
    }
    username = userhash.name;
    user = this.users.get(username);
    if(user){
      if (!this.checkForRoleMismatch(userhash, user)) {
        return null;
      }
      return user;
    }
    var userctor = this.findUserCtor(userhash.role);
    if (!this.checkForUserCtor(userctor, userhash)) {
      return null;
    }
    user = new userctor(userhash);
    this.users.registerComplexDestroyable(username, user, this.onUserDestroyed.bind(this,username));
    //console.log(userhash.role,'=>',userctor.prototype.role);
    var filter = this.roleFilters.get(userctor.prototype.role);
    if(!filter){
      filter = this.createNewRoleStateFilter(userctor);
    }
    /*
    if(filter){
      filter.attach(user.state);
    }
    */
    return user;
  };
  Service.prototype.onUserDestroyed = function(username){
    if (this.users.empty()) {
      lib.runNext(this.destroy.bind(this));
    }
  };

/* sanity checkers */
  Service.prototype.checkForServiceMismatch = function (userhash) {
    if(userhash.__service && userhash.__service!==this){
      console.trace();
      console.log('__service mismatch!',userhash.__service,'!==',this);
      process.exit(0); //brutal
      return false;
    }
    userhash.__service = this;
    return true;
  };

  Service.prototype.checkForRoleMismatch = function (userhash, user) {
    var ret = userhash.role === user.role;
    if(!ret){
      console.log(process.pid, 'Name', userhash.name, 'already taken for a different role, taken',user.role,'!== requesting',userhash.role, 'in', this.modulename);
      //console.log(user);
    }
    return ret;
  };

  Service.prototype.checkForUsername = function (userhash) {
    if (!userhash.name) {
      console.trace();
      console.error('No name in userhash', userhash);
      return false;
    }
    return true;
  };

  Service.prototype.checkForUserCtor = function (userctor, userhash) {
    if(!userctor){
      console.trace();
      this.userFactory.dumpToConsole();
      console.log(process.pid,'could not find a constructor for User role',userhash.role,'on',this,'for',userhash);
      return false;
    }
    if(userhash.role!==userctor.prototype.role){
      console.error('Role mismatch on User ctor, user prophash asked for', userhash.role, 'ctor has', userctor.prototype.role, 'in its prototype');
      return false;
    }
    return true;
  };

  function rolecounter (rolecntobj, user, username) {
    if (user.role === rolecntobj.role) {
      rolecntobj.count++;
    }
  };

  Service.prototype.userCountForRole = function (role) {
    var rolecntobj = {
        role: role,
        count: 0
      },
      ret;
    this.users.traverse(rolecounter.bind(null, rolecntobj));
    ret = rolecntobj.count;
    rolecntobj = null;
    return ret;
  };


  function registerFactoryFunction(map,factoryfunction,factoryname){
    if (!factoryname) throw Error('No factoryname');
    if (!factoryfunction) throw Error('No factoryfunction');
    var f = functionCopy(factoryfunction);
    f.prototype.role = factoryname;
    map.add(factoryname,f);
  };
  function createGetter(map){
    return {
      get:map.get.bind(map),
      destroy: function () {
        map = null;
      }
    };
  }
  Service.inherit = function(serviceChildCtor, factoryProducer, additionalParentServices){
    lib.inherit(serviceChildCtor,this);
    serviceChildCtor.inherit = this.inherit;
    serviceChildCtor.prototype.userFactory = new lib.Map();
    var getters = [createGetter(this.prototype.userFactory)], cuf = serviceChildCtor.prototype.userFactory;
    if (lib.isArray(additionalParentServices)){
      additionalParentServices.forEach(function (addparnt){
        getters.push(createGetter(addparnt));
      });
    }
    /*
    for(var i = 2; i<arguments.length; i++){
      getters.push(createGetter(arguments[i].userFactory));
    }
    */
    if(factoryProducer){
      lib.traverse(factoryProducer.apply(null,getters),registerFactoryFunction.bind(null,cuf));
      cuf = null;
    }
    lib.arryDestroyAll(getters);
    getters = null;
    serviceChildCtor.prototype.propertyHashDescriptor = lib.extend( lib.extend({}, this.prototype.propertyHashDescriptor || {}), serviceChildCtor.prototype.propertyHashDescriptor || {});
  };

  execSuite.dependentServiceMethod = function (subservicenames, statenames, func) {
    return execSuite.dependentMethod([{mapname: 'subservices._instanceMap', names: subservicenames}, {mapname: 'state.data', names: statenames}], func);
  };

  return Service;
}

module.exports = createService;
