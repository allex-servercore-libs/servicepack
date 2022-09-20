function createCreateSessionJobCore (lib, mylib) {
  'use strict';

  var OnUsableUserJobCore = mylib.OnUsableUser;

  function CreateSessionJobCore (user, gate, sessionid, arg1) {
    OnUsableUserJobCore.call(this, user);
    this.gate = gate;
    this.sessionid = sessionid;
    this.arg1 = arg1;
    this.sessionCtor = null;
    this.sessionInstance = null;
  }
  lib.inherit(CreateSessionJobCore, OnUsableUserJobCore);
  CreateSessionJobCore.prototype.destroy = function () {
    this.sessionInstance = null;
    this.sessionCtor = null;
    this.arg1 = null;
    this.sessionid = null;
    this.gate = null;
    OnUsableUserJobCore.prototype.destroy.call(this);
  };

  CreateSessionJobCore.prototype.acquireCtor = function () {
    return this.user.getSessionCtor(this.gate.communicationType);
  };
  CreateSessionJobCore.prototype.useCtor = function (ctor) {
    if (!ctor) {
      throw new lib.Error('NO_CTOR_FOR_COMMUNICATION_TYPE', 'No Session constructor was found for gate communication type '+this.gate.communicationType);
    }
    this.sessionCtor = ctor;
    return new ctor(this.user, this.sessionid, this.gate, this.arg1);
  };
  CreateSessionJobCore.prototype.getCreatedSession = function (sessioninstance) {
    if (!sessioninstance) {
      throw new lib.Error('NO_SESSION_INSTANCE_FROM_CTOR', 'No session was obtained from constructor', this.sessionCtor.name);
    }
    if (!sessioninstance.destroyed) {
      throw new lib.Error('SESSION_INSTANCE_ALREADY_DESTROYED', 'A session was obtained without a "destroyed" event');
    }
    sessioninstance.reportToGate('created');
    this.sessionInstance = sessioninstance;
  }
  CreateSessionJobCore.prototype.resolveSession = function () {
    return this.user.sessionAcceptor.resolveNewSession(
      this.sessionInstance
    );
  };
  CreateSessionJobCore.prototype.onResolvedSession = function (rslvd) {
    if (!rslvd) {
      this.sessionInstance.destroy();
      throw new lib.Error('SESSION_ACCEPTOR_DID_NOT_RESOLVE_SESSION', this.sessionInstance.ctor.name+' was not resolved by sessionAcceptor on '+this.user.constructor.name);
    }
    this.user.attachSession(this.sessionInstance);
    return this.sessionInstance;
  };

  CreateSessionJobCore.prototype.steps = [
    'acquireCtor',
    'useCtor',
    'getCreatedSession',
    'resolveSession',
    'onResolvedSession'
  ];

  mylib.CreateSession = CreateSessionJobCore;
}
module.exports = createCreateSessionJobCore;