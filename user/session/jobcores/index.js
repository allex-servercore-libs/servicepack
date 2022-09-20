function createSessionJobCores (lib, SessionIntroductor) {
  'use strict';

  var mylib = {};

  require('./onsessioncreator')(lib, mylib);
  require('./subconnectcreator')(lib, SessionIntroductor, mylib);

  return mylib;
}
module.exports = createSessionJobCores;