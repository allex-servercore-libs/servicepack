function createUserLib (lib, Callable, SessionIntroductor, Collection) {
  'use strict';

  var userSessionFactoryCreator = require('./session/factorycreator')(lib),
      UserEntity = require('./common/entitycreator')(lib,Callable),
      UserSession = require('./session/creator')(lib,UserEntity,SessionIntroductor,Callable),
      userSessionFactory = userSessionFactoryCreator(UserSession),
      User = require('./creator')(lib,UserEntity,UserSession,Collection);
  User.prototype.getSessionCtor = userSessionFactory;

  var ret = {
    userSessionFactoryCreator: userSessionFactoryCreator,
    User: User
  };

  return ret;
}

module.exports = createUserLib;
