function createOnUserJobCore (lib, mylib) {
  'use strict';

  function OnUserJobCore (user) {
    this.user = user;
  }
  OnUserJobCore.prototype.destroy = function () {
    this.user = null;
  };
  OnUserJobCore.prototype.shouldContinue = function () {
    if (!this.user) {
      return new lib.Error('NO_USER_FOR_USERJOBCORE', 'This instance of '+this.constructor.name+' has no "user"');
    }
    if (!this.user.state) {
      return new lib.Error('USER_ALREADY_DESTROYED_FOR_USERJOBCORE', 'User is already destroyed for this instance of '+this.constructor.name);
    }
  };

  mylib.OnUser = OnUserJobCore;
}
module.exports = createOnUserJobCore;