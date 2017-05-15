function sinkMapCreator(ServiceSink,execlib){
  'use strict';
  var sinkmap = new (execlib.lib.Map);

  sinkmap.add('service',require('./sinks/servicesinkcreator')(ServiceSink,execlib));
  sinkmap.add('user',require('./sinks/usersinkcreator')(ServiceSink,execlib));
  
  return sinkmap;
}

module.exports = sinkMapCreator;
