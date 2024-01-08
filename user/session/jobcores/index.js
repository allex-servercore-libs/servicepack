function createSessionJobCores (lib, SessionIntroductor, Callable) {
  'use strict';

  var mylib = {};

  require('./onsessioncreator')(lib, mylib);
  require('./subconnectcreator')(lib, SessionIntroductor, Callable, mylib);

  return mylib;
}
module.exports = createSessionJobCores;