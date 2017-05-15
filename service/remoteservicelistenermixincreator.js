function createRemoteServiceListenerMixin(execlib, ServiceBase) {
  'use strict';

  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;
  
  function RemoteServiceListenerServiceMixin() {
    this.remoteHunters = new lib.Map();
  };
  RemoteServiceListenerServiceMixin.prototype.destroy = function () {
    if (this.remoteHunters) {
      lib.containerDestroyAll(this.remoteHunters);
      this.remoteHunters.destroy();
    }
    this.remoteHunters = null;
  };
  RemoteServiceListenerServiceMixin.addMethods = function (ctor) {
    ctor.prototype.huntRemote = RemoteServiceListenerServiceMixin.prototype.huntRemote;
    ctor.prototype.findRemote = RemoteServiceListenerServiceMixin.prototype.findRemote;
    ctor.prototype.findRemoteWithAddress = RemoteServiceListenerServiceMixin.prototype.findRemoteWithAddress;
    ctor.prototype.onRemoteHunted = RemoteServiceListenerServiceMixin.prototype.onRemoteHunted;
    ctor.prototype.onFindRemoteWithAddress = RemoteServiceListenerServiceMixin.prototype.onFindRemoteWithAddress;
  };
  function nameOfServiceName (servicename) {
    if (lib.isArray(servicename)) {
      return servicename[servicename.length-1];
    }
    return servicename;
  }
  RemoteServiceListenerServiceMixin.prototype.huntRemote = function (taskname, servicename, taskprophash) {
    var sn = nameOfServiceName(servicename);
    if (this.remoteHunters.get(sn)) {
      return;
    };
    this.remoteHunters.add(sn, taskRegistry.run(taskname, taskprophash));
  };
  RemoteServiceListenerServiceMixin.prototype.findRemote = function (servicename, identity, servicenamealias) {
    identity = identity || {name: 'user', role: 'user'};
    var sn = servicenamealias || nameOfServiceName(servicename);
    this.huntRemote('findSink', sn, {
      sinkname: servicename,
      identity: identity,
      onSink: this.onRemoteHunted.bind(this, sn)
    });
  };
  RemoteServiceListenerServiceMixin.prototype.findRemoteWithAddress = function (servicename, identity, servicenamealias) {
    var sn = servicenamealias || nameOfServiceName(servicename);
    identity = identity || {name: 'user', role: 'user'};
    this.huntRemote('findAndRun', sn, {
      program: {
        sinkname: servicename,
        identity: identity,
        task: {
          name: this.onFindRemoteWithAddress.bind(this, servicename, identity, servicenamealias, sn),
          propertyhash: {
            ipaddress: 'fill yourself'
          }
        }
      }
    });
  };
  RemoteServiceListenerServiceMixin.prototype.onFindRemoteWithAddress = function (servicename, identity, servicenamealias, nameofservice, taskobj) {
    var hunter;
    this.onRemoteHunted(nameofservice, taskobj.sink);
    if (taskobj.sink) {
      this.state.set(nameofservice+'_address', taskobj.ipaddress);
    } else {
      this.state.remove(nameofservice+'_address');
      hunter = this.remoteHunters.remove(nameofservice);
      if (hunter) {
        hunter.destroy();
      }
      this.findRemoteWithAddress(servicename, identity, servicenamealias);
    }
  };
  RemoteServiceListenerServiceMixin.prototype.onRemoteHunted = function (nameofservice, sink) {
    if (sink) {
      this.state.set(nameofservice, sink);
    } else {
      this.state.remove(nameofservice);
    }
  };

  return RemoteServiceListenerServiceMixin;
}

module.exports = createRemoteServiceListenerMixin;
