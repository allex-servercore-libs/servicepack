function createSubConnectJobCore (lib, SessionIntroductor, Callable, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;
  var OnSessionJobCore = mylib.OnSession;
  var Session2RemoteSink;

  function SubConnectBaseJobCore (session) {
    OnSessionJobCore.call(this, session);
  }
  lib.inherit(SubConnectBaseJobCore, OnSessionJobCore);
  SubConnectBaseJobCore.prototype.shouldContinue = function () {
    var ret = OnSessionJobCore.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;      
    }
    if (!this.session.canSubConnect()) {
      return new lib.Error('SESSION_NOT_SUBCONNECTABLE_FOR_SESSIONJOBCORE', 'Session is not subconnectable for this instance of '+this.constructor.name);
    }
  };

  function IntroduceUserToSelf (session, userspec) {
    SubConnectBaseJobCore.call(this, session);
    this.userspec = userspec;
  }
  lib.inherit(IntroduceUserToSelf, SubConnectBaseJobCore);
  IntroduceUserToSelf.prototype.destroy = function () {
    this.userspec = null;
    SubConnectBaseJobCore.prototype.destroy.call(this);
  };
  IntroduceUserToSelf.prototype.introduceUser = function () {
    return this.session.user.__service.introduceUser(this.userspec);
  };
  IntroduceUserToSelf.prototype.finalize = function (intusr) {
    if (!this.userspec.__service) {
      console.error(this.session.user.__service.modulename, 'does not introduce __service to userspec');
      if (intusr) {
        intusr.destroy();
      }
      return null;
    }
    return {
      destroy: false,
      introduceduser: intusr
    };
  };

  IntroduceUserToSelf.prototype.steps = [
    'introduceUser',
    'finalize'
  ];


  function IntroduceUserToSubService (session, subservicename, userspec) {
    SubConnectBaseJobCore.call(this, session);
    this.subservicename = subservicename;
    this.userspec = userspec;
    this.mastersink = null;
  }
  lib.inherit(IntroduceUserToSubService, SubConnectBaseJobCore);
  IntroduceUserToSubService.prototype.destroy = function () {
    this.mastersink = null;
    this.userspec = null;
    this.subservicename = null;
    SubConnectBaseJobCore.prototype.destroy.call(this);
  };

  IntroduceUserToSubService.prototype.findSubservice = function () {
    return this.session.user.__service.subservices.waitFor(this.subservicename);
  };
  IntroduceUserToSubService.prototype.onSubServiceMasterSink = function (sink) {
    if (!sink) {
      throw new lib.Error('NO_SUBSERVICE', 'No subservice registered by name '+this.subservicename);
    }
    this.mastersink = sink;
  };
  IntroduceUserToSubService.prototype.useMasterSink = function () {
    if (lib.isFunction(this.mastersink.introduceUser)) {
      return this.mastersink.introduceUser(this.session.user.__service.preProcessSubconnectIdentity(this.subservicename, this.userspec));
    }
    return this.mastersink.subConnect('.', this.session.user.__service.preProcessSubconnectIdentity(this.subservicename, this.userspec),{nochannels:true});
  };
  IntroduceUserToSubService.prototype.onSlaveSink = function (intusr) {
    return {
      destroy: true,
      introduceduser: intusr
    };
  };

  IntroduceUserToSubService.prototype.steps = [
    'findSubservice',
    'onSubServiceMasterSink',
    'useMasterSink',
    'onSlaveSink'
  ];


  function SubConnectJobCore (session, subservicename, userspec) {
    SubConnectBaseJobCore.call(this, session);
    this.subservicename = subservicename;
    this.userspec = userspec;
  }
  lib.inherit(SubConnectJobCore, SubConnectBaseJobCore);
  SubConnectJobCore.prototype.destroy = function () {
    this.userspec = null;
    this.subservicename = null;
    SubConnectBaseJobCore.prototype.destroy.call(this);
  };

  SubConnectJobCore.prototype.makeUpUserspec = function () {
    this.userspec = this.userspec || {};
    if(!('role' in this.userspec)){
      this.userspec.role = this.session.user.role;
    }
    if(!('name' in this.userspec)){
      this.userspec.name = this.session.user.get('name');
    }
  };
  SubConnectJobCore.prototype.introduceUserToTarget = function () {
    return qlib.newSteppedJobOnSteppedInstance(
      this.subservicename == '.'
      ?
      new IntroduceUserToSelf(this.session, this.userspec)
      :
      new IntroduceUserToSubService(this.session, this.subservicename, this.userspec)
    ).go();
  };
  SubConnectJobCore.prototype.onIntroducedUser = function (intusrobj) {
    var dodestroy, intusr, ret;
    if (!intusrobj) {
      throw new lib.Error('INTRODUCEUSER_INVALID_RESULT', 'Result of introduce user cannot be null');
    }
    dodestroy = intusrobj.destroy;
    intusr = intusrobj.introduceduser;
    if (!intusr) {
      return null;
    }
    if (!intusr.destroyed) { //too late
      return null;
    }
    ret = {
      introduce:{
        session:SessionIntroductor.introduce(this.userspec),
        modulename:intusr.modulename,
        role:intusr.role
      }
    };
    if (this.userspec.__service) {
      if (dodestroy) {
        intusr.destroy();
      }
      return ret;
    }
    if (!Session2RemoteSink) {
      Session2RemoteSink = require('../session2remotesinkcreator')(lib, q, this.session.constructor, Callable);
    }
    if (this.session.gate && this.session.gate.sessions) {
      new Session2RemoteSink(this.session, ret.introduce.session, intusr);
    }
    return ret;
    //throw new lib.Error('REMOTESINKSUBCONNECT_NOT_YET_IMPLEMENTED');
  };

  SubConnectJobCore.prototype.steps = [
    'makeUpUserspec',
    'introduceUserToTarget',
    'onIntroducedUser'
  ];

  mylib.SubConnect = SubConnectJobCore;
}
module.exports = createSubConnectJobCore;