function createUserJobCores (lib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    mylib = {};

  require('./onusercreator')(lib, mylib);
  require('./onusableusercreator')(lib, mylib);
  require('./createsessioncreator')(lib, mylib);
  
  return mylib;
}
module.exports = createUserJobCores;