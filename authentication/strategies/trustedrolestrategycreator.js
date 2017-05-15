function createTrustedRoleStrategy(lib){
  'use strict';
  /*
  prophash: {
    roles: {
      'observer': {
        properties: {
          'role': 'user',
          'allow': true,
          'block': false
        },
        inject: {
          'username': null, //or '%role%'
          'account': '%role%_account'
        }
      }
    }
  }
  so that someone logging in as {role: 'observer', allow: false, block: true, username: 'Robert', account: 12223}
  will be resolved as {role: 'user', name: 'observer', allow: true, block: false, username: 'observer', account: 'observer_account'}
  (name will be injected by default as the trusted role value because no rules were given for it)
  */
  function TrustedRoleStrategy(prophash){
    this.roles = prophash.roles;
  }
  TrustedRoleStrategy.prototype.destroy = function () {
    this.roles = null;
  };
  TrustedRoleStrategy.prototype.resolveUser = function(credentials,defer){
    var role;
    if (!credentials) {
      defer.resolve(null);
      return;
    }
    if (!credentials.hasOwnProperty('role')) {
      defer.resolve(null);
      return;
    }
    role = credentials.role;
    if (!lib.isString(role)) {
      defer.resolve(null);
      return;
    }
    var roleobj = this.roles[role];
    if (!roleobj) {
      defer.resolve(null);
      return;
    }
    var ret = lib.extend({role: role, name: role}, roleobj.properties);
    lib.traverseShallow(roleobj.inject, injector.bind(null, role, ret));
    defer.resolve(ret);
    role = null;
    ret = null;
  };
  var replaceregexp = new RegExp('%role%', 'g');
  function injector(role, obj, propstring, propname) {
    var subobj;
    if (propstring === null) {
      obj[propname] = role;
      return;
    }
    if (!lib.isString(propstring)) {
      subobj = {};
      obj[propname] = subobj;
      lib.traverseShallow(propstring, injector.bind(null, role, subobj));
      return;
    }
    obj[propname] = propstring.replace(replaceregexp, role);
  }
  return TrustedRoleStrategy;
}

module.exports = createTrustedRoleStrategy;
