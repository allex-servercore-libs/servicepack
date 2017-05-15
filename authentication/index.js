function createServicePack(){
  'use strict';
  return {
    sinkmap: {
      dependencies: ['.']
    },
    service: {
      dependencies: ['.']
    },
    dirname: __dirname
  };
}

module.exports = createServicePack;
