function createSessionAcceptanceFactory (lib) {
  'use strict';

  var _factory = new lib.Map(),
    BaseSessionAcceptor = require('./basecreator')(lib);

  _factory.add('.', BaseSessionAcceptor);
  _factory.add('letany', require('./letanycreator')(lib, BaseSessionAcceptor));
  _factory.add('keepfirst', require('./keepfirstcreator')(lib, BaseSessionAcceptor));
  _factory.add('keeplast', require('./keeplastcreator')(lib, BaseSessionAcceptor));

  return _factory;
}

module.exports = createSessionAcceptanceFactory;


