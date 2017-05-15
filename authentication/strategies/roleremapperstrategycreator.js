function createRoleRemapperStrategy(){
  'use strict';
  function RoleRemapperStrategy(options){
    this.remap = options || {};
  }
  RoleRemapperStrategy.prototype.destroy = function(){
    this.remap = null;
  };
  RoleRemapperStrategy.prototype.resolveUser = function(credentials,defer){
    var ret = {};
    for(var i in credentials){
      if(i==='role'){
        if(credentials[i] in this.remap){
          ret[i] = this.remap[credentials[i]];
        }else{
          ret[i] = credentials[i];
        }
      }else{
        ret[i] = credentials[i];
      }
    }
    defer.resolve(ret);
  };
  return RoleRemapperStrategy;
}

module.exports = createRoleRemapperStrategy;
