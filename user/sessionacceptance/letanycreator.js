function createLetAnyAcceptor (lib, BaseSessionAcceptor) {
  'use strict';

  function LetAnyAcceptor (user, prophash) {
    BaseSessionAcceptor.call(this, user);
  }
  lib.inherit(LetAnyAcceptor, BaseSessionAcceptor);

  LetAnyAcceptor.prototype.resolveNewSession = function (session) {
    return session;
  };

  return LetAnyAcceptor;
}

module.exports = createLetAnyAcceptor;


