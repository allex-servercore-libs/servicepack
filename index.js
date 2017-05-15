function createServicePacksLib (execlib, SessionIntroductor) {
  'use strict';

  var ServiceBase = require('./service/creator')(execlib),
    RemoteServiceListenerServiceMixin = require('./service/remoteservicelistenermixincreator')(execlib, ServiceBase),
    userlib = require('./user') (execlib.lib, execlib.execSuite.Callable, SessionIntroductor, execlib.execSuite.Collection),
    ServiceSink = require('./servicesink')(execlib);

  return {
    userSessionFactoryCreator: userlib.userSessionFactoryCreator,
    RemoteServiceListenerServiceMixin: RemoteServiceListenerServiceMixin,
    base: require('./base')(ServiceBase, userlib.User, ServiceSink, SessionIntroductor),
    authentication: require('./authentication')(execlib)
  }
}
module.exports = createServicePacksLib;
