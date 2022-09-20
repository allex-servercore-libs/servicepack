function createOnUsableUserJobCore (lib, mylib) {
  'use strict';

  var OnUserJobCore = mylib.OnUser;

  function OnUsableUserJobCore (user) {
    OnUserJobCore.call(this, user);
  }
  lib.inherit(OnUsableUserJobCore, OnUserJobCore);
  OnUsableUserJobCore.prototype.shouldContinue = function () {
    var ret = OnUserJobCore.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;
    }
    if (!this.user.aboutToDie) {
      return new lib.Error('USER_ALREADY_IN_DESTRUCTION_CYCLE_FOR_JOBCORE', 'User is already in destruction sequence for this instance of '+this.constructor.name)
    }
  };

  mylib.OnUsableUser = OnUsableUserJobCore;
}
module.exports = createOnUsableUserJobCore;