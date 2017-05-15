function createBehaviorMap(execlib){
  'use strict';
  var InvokerTask = require('./tasks/invokerTaskBase')(execlib);
  return [{
    name: 'acquireSink',
    klass: require('./tasks/acquireSink')(execlib)
  },{
    name: 'invokeMethod',
    klass: require('./tasks/invokeMethod')(execlib,InvokerTask)
  },{
    name: 'invokeSessionMethod',
    klass: require('./tasks/invokeSessionMethod')(execlib,InvokerTask)
  },{
    name: 'materializeState',
    klass: require('./tasks/materializeState')(execlib)
  },{
    name: 'readState',
    klass: require('./tasks/readState')(execlib)
  },{
    name: 'acquireSubSinks',
    klass: require('./tasks/acquireSubSinks')(execlib)
  },{
    name: 'transmitTcp',
    klass: require('./tasks/transmitTcp')(execlib)
  },{
    name: 'realizeTcpTransmission',
    klass: require('./tasks/realizeTcpTransmission')(execlib)
  }];
}

module.exports = createBehaviorMap;
