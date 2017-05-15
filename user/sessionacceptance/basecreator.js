function createSessionAcceptorBase (lib) {
  'use strict';

  function BaseSessionAcceptor(user, prophash) {
    this.user = user;
  }

  BaseSessionAcceptor.prototype.destroy = function () {
    this.user = null;
  };

  BaseSessionAcceptor.prototype.resolveNewSession = function (session) {
    throw new lib.Error('NOT_IMPLEMENTED', 'BaseSessionAcceptor does not implement resolveNewSession');
  };

  BaseSessionAcceptor.prototype.existingSessionCount = function () {
    if (!this.user && this.user.sessions) {
      return 0;
    }
    return this.user.sessions.length;
  };

  BaseSessionAcceptor.prototype.hasExistingSessions = function () {
    return this.existingSessionCount() > 0;
  };


  return BaseSessionAcceptor;
}

module.exports = createSessionAcceptorBase;


