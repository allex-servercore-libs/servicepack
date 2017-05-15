function createServicePack (ServiceBase,User,ServiceSink,SessionIntroductor){
  'use strict';
  function sinkmap(execlib) {
    return require('./sinkmapcreator')(ServiceSink, execlib);
  }
  function service(execlib) {
    return require('./servicecreator')(ServiceBase, User, SessionIntroductor, execlib);
  }
  function tasks(execlib) {
    return require('./taskcreator')(execlib);
  }
  return {
    sinkmap: sinkmap,
    service: service,
    tasks: tasks
  };
}

module.exports = createServicePack;
