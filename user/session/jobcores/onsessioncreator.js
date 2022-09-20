function createOnSessionJobCore (lib, mylib) {
  'use strict';

  function OnSessionJobCore (session) {
    this.session = session;
  }
  OnSessionJobCore.prototype.destroy = function () {
    this.session = null;
  };
  OnSessionJobCore.prototype.shouldContinue = function () {
    if (!this.session) {
      return new lib.Error('NO_SESSION_FOR_SESSIONJOBCORE', 'This instance of '+this.constructor.name+' has no "session"');
    }
    if (!this.session.destroyed) {
      return new lib.Error('SESSION_ALREADY_DESTROYED_FOR_SESSIONJOBCORE', 'Session is already destroyed for this instance of '+this.constructor.name);
    }
  };

  mylib.OnSession = OnSessionJobCore;
}
module.exports = createOnSessionJobCore;