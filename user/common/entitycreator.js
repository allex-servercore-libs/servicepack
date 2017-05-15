function createUserEntity(hers,Callable){
  'use strict';
  function UserEntity(){
    hers.ComplexDestroyable.call(this);
    Callable.call(this);
  }
  hers.inherit(UserEntity,Callable);
  hers.inheritMethods(UserEntity,hers.ComplexDestroyable,'destroy','extendTo','shouldDie','onAboutToDie','maybeDie','startTheDyingProcedure','dyingCondition','revive');
  UserEntity.prototype.__cleanUp = function(){
    Callable.prototype.destroy.call(this);
    hers.ComplexDestroyable.prototype.__cleanUp.call(this);
  };
  UserEntity.inherit = Callable.inherit;
  return UserEntity;
}

module.exports = createUserEntity;
