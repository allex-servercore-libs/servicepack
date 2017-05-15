function createServicePacksLib (execlib, SessionIntroductor, ServiceBase) {
  'use strict';

  var userlib = require('./user') (execlib.lib, execlib.execSuite.Callable, SessionIntroductor, execlib.execSuite.Collection),
    ServiceSink = require('./servicesink')(execlib);

  return {
    userSessionFactoryCreator: userlib.userSessionFactoryCreator,
    base: require('./base')(ServiceBase, userlib.User, ServiceSink, SessionIntroductor),
    authentication: require('./authentication')(execlib)
  }
}
module.exports = createServicePacksLib;
