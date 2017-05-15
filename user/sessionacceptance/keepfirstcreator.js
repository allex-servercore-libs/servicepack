function createKeepFirstAcceptor (lib, BaseSessionAcceptor) {
  'use strict';

  function KeepFirstAcceptor (user, prophash) {
    BaseSessionAcceptor.call(this, user);
  }
  lib.inherit(KeepFirstAcceptor, BaseSessionAcceptor);

  KeepFirstAcceptor.prototype.resolveNewSession = function (session) {
    //console.log('oli KeepFirstAcceptor resolveNewSession?', this.existingSessionCount(), session.gate.constructor.name, session.session);
    if (this.hasExistingSessions()) {
      session.sendOOB('x', ['SESSION_ALREADY_EXISTS', 'You cannot be accepted because there is already an existing Session on the User']);
      console.log('will destroy session bc already an existing Session');
      session.destroy();
      return null;
    }
    //console.log('no existing sessions, will let session in');
    return session;
  };

  return KeepFirstAcceptor;
}

module.exports = createKeepFirstAcceptor;

