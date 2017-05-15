function createUserRoleFilter(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Collection = execSuite.Collection; 

  function sinkSetter(target, source) {
    source.setSink(target);
  }

  function isRegExp (thingy) {
    return (thingy instanceof RegExp);
  }

  function produceCombiner(urf, sf) {
    var strings = [], _s = strings,
      complexs = [], _c = complexs,
      _isString = lib.isString,
      _isArray = lib.isArray,
      _Spl = execSuite.StatePathListener,
      _isre = isRegExp;

    sf.forEach(function (f) {
      if (_isString(f)) {
        _s.push(f);
      }
      if (_isArray(f)) {
        _c.push(f);
      }
      if (_isre(f)) {
        _c.push([f]);
      }
    });
    _s = null;
    _c = null;
    _isString = null;
    _isArray = null;
    _isre = null;
    urf.filters.push(new execSuite.StatePathListener(strings.length>1 ? [strings] : strings));
    complexs.forEach(function (cf) {
      urf.filters.push(new _Spl(cf));
    });
    _Spl = null;
    urf = null;
  }

  function UserRoleFilter(userctor) {
    lib.Destroyable.call(this);
    this.filters = [];
    this.buffer = new Collection();
    var sf = userctor.stateFilter, b = this.buffer;
    if(sf){
      if(lib.isArray(sf)){
        if (sf.some(lib.isArray)) {
          produceCombiner(this, sf);
        } else {
          this.filters.push(new execSuite.StatePathListener(sf.length>1 ? [sf] : sf));
        }
      }else if(lib.isString(sf)){
        this.filters.push(new execSuite.StatePathListener([sf]));
      }else{
        this.filters.push(new sf());
      }
      this.filters.forEach(sinkSetter.bind(null, b));
      b = null;
      //this.filters.setSink(this.buffer);
    }else{
      if (userctor.modulename) {
        console.log('no stateFilter on',userctor.modulename, '=>', userctor.role);
      } else {
        //no point in nagging...
      }
    }
  }
  lib.inherit(UserRoleFilter, lib.Destroyable);
  UserRoleFilter.prototype.__cleanUp = function () {
    if (this.filters) {
      lib.arryDestroyAll(this.filters);
    }
    this.filters = null;
    if (this.buffer) {
      this.buffer.destroy();
    }
    this.buffer = null;
  };
  UserRoleFilter.prototype.onStream = function (item) {
    var fl, i;
    if (!this.filters) {
      return;
    }
    if (!this.filters.length ) {
      return;
    }
    fl = this.filters.length;
    for (i=0; i<fl; i++) {
      this.filters[i].onStream(item);
    }
  };
  UserRoleFilter.prototype.setSink = function (sink) {
    this.buffer.setSink(sink);
  };

  return UserRoleFilter;
};

module.exports = createUserRoleFilter;
