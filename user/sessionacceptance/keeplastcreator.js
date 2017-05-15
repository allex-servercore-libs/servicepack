function createKeepLastAcceptor (lib, BaseSessionAcceptor) {
  'use strict';

  var q = lib.q;

  function KeepLastAcceptor (user, prophash) {
    BaseSessionAcceptor.call(this, user);
  }
  lib.inherit(KeepLastAcceptor, BaseSessionAcceptor);

  KeepLastAcceptor.prototype.resolveNewSession = function (session) {
    var f, d, ret;
    if (this.hasExistingSessions()) {
      f = this.user.sessions.peek();
      if (!f) {
        return session;
      }
      f = f.content;
      if (!f) {
        return session;
      }
      if (!f.destroyed) {
        return session;
      }
      d = q.defer();
      ret = d.promise;
      f.sendOOB('x', ['SESSION_ALREADY_EXISTS', 'You cannot be accepted because there is already an existing Session on the User']);
      f.destroyed.attach(function () {
        d.resolve(session);
        d = null;
        session = null;
      });
      f.destroy();
      return ret;
    }
    return session;
  };

  return KeepLastAcceptor;
}

module.exports = createKeepLastAcceptor;

