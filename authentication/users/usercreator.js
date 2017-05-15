function createUser(execlib,ParentUser){
  'use strict';
  var lib = execlib.lib,
      q = lib.q;

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  function User(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'));
  User.prototype.resolve = function(credentials,d){
    var promises,cd;
    if(credentials){
      promises = [];
      for (var i in credentials) {
        var s = this.__service.strategies.get(i),
          creds = credentials[i];
        if (!s) continue;
        cd = q.defer();
        s.resolveUser(creds, cd);
        promises.push(cd.promise);
      }
      q.allSettled(promises).
        done(this._authenticationSettled.bind(this, d));
    }else{
      d.resolve(null);
    }
    d = null;
  };
  function checkAuthResult(resultobj,result){
    if ('fulfilled' === result.state && result.value && result.value.name) {
      //console.log('authentication ok',result.value,resultarry);
      resultobj.result = result.value;
      return true;
    }
    return false;
  }
  User.prototype._authenticationSettled = function (defer, results) {
    var resultobj = {result:null};
    results.some(checkAuthResult.bind(null,resultobj));
    defer.resolve(resultobj.result);
    /*
    for (var i in results) {
      if ('fulfilled' === results[i].state && results[i].value.name) {
        //console.log('authentication ok',results[i].value,credentialarry);
        defer.resolve(results[i].value);
        return;
      }
    }
    defer.resolve(null);
    */
    resultobj = null;
    defer = null;
  };
  return User;
}

module.exports = createUser;
