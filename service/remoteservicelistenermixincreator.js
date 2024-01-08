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
  RemoteServiceListenerServiceMixin.checkForImplementation = function (instance) {
    if (!instance.constructor) {
      throw new lib.Error('REMOTE_SERVICE_LISTENER_MIXIN_NOT_CHECKED_WITH_CONSTRUCTOR', '"this" has no constructor');
    }
    if (!instance.constructor.name) {
      throw new lib.Error('REMOTE_SERVICE_LISTENER_MIXIN_NOT_CHECKED_WITH_CONSTRUCTOR_NAME', '"this" has no constructor name');
    }
    if (!lib.isFunction(instance.findRemote)) {
      throw new lib.Error('REMOTE_SERVICE_LISTENER_MIXIN_NOT_IMPLEMENTED', instance.constructor.name+' does not implement the RemoteServiceListenerServiceMixin');
    }
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
  RemoteServiceListenerServiceMixin.prototype.findRemoteOnHotel = function (servicename, ipaddress, port, identity, servicenamealias) {
    this.huntRemote('getIn', sn, {
      ipaddress: ipaddress,
      port: port,
      identity: identity,
      cb: this.onFindOnRemoteHotel.bind(this, servicename, ipaddress, port, identity, servicenamealias, sn),
      propertyhash: {nochannels: true}
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
    if (!this.state) {
      return;
    }
    if (sink) {
      this.state.set(nameofservice, sink);
    } else {
      this.state.remove(nameofservice);
    }
  };

  return RemoteServiceListenerServiceMixin;
}

module.exports = createRemoteServiceListenerMixin;
