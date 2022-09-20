var net = require('net'),
    randomBytes = require('crypto').randomBytes;

function createUser(execlib,ParentUser){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      _User = execSuite.User;

  function UserTcpConnectionHandler(userserver, server, connection) {
    this.userserver = userserver;
    this.server = server;
    this.connection = connection;
    this.otherSideAuthenticated = null;
    this.fingerprintReceived = '';
    connection.on('data',this.onData.bind(this));
    connection.on('end',this.destroy.bind(this));
    connection.on('timeout',this.onTimeout.bind(this));
    this.userserver.setTimeout();
  }
  UserTcpConnectionHandler.prototype.destroy = function () {
    if (this.otherSideAuthenticated) {
      this.server.close();
    }
    this.fingerprintReceived = null;
    this.otherSideAuthenticated = null;
    this.connection = null;
    this.server = null;
    this.userserver = null;
  };
  UserTcpConnectionHandler.prototype.onData = function(data){
    if(!this.userserver.fingerprint){
      console.error('server got no fingerprint, ignoring data', data);
      console.log('actually, my server is', this.userserver);
      return;
    }
    var offset = this.authenticate(data);
    if(this.otherSideAuthenticated===false){
      console.error('other side is not authenticated, closing connection');
      this.connection.end();
      this.destroy();
      return;
    }
    this.userserver.setTimeout();
    if(this.otherSideAuthenticated===null){
      console.error('other side is not authenticated, closing connection');
      return;
    }
    //console.log('processing incoming data', offset ? 'with offset' : 'without offset');
    if(offset){
      this.onPacketForProcess(data.slice(offset));
    }else{
      this.onPacketForProcess(data);
    }
  };
  UserTcpConnectionHandler.prototype.onPacketForProcess = function (buffer) {
    this.userserver.processTransmissionPacket(this.server,this.connection,buffer);
  };
  UserTcpConnectionHandler.prototype.onTimeout = function () {
    this.connection.end();
    this.destroy();
  };
  UserTcpConnectionHandler.prototype.authenticate = function(inbuffer){
    var offset = 0,
        fptr = this.userserver.fingerprint.length - this.fingerprintReceived.length;
    if(fptr>0){
      offset = Math.min(inbuffer.length,fptr);
      this.fingerprintReceived += inbuffer.toString('utf8',0,offset);
      if(this.fingerprintReceived.length===this.userserver.fingerprint.length){
        this.otherSideAuthenticated = this.userserver.fingerprint===this.fingerprintReceived;
        if (this.otherSideAuthenticated) {
          this.userserver.onAuthenticatedConnection(this.server, this.connection);
        }
      }
    }
    return offset;
  };

  function UserTcpServer(user,options){
    this.user = user;
    this.options = options;
    this.userDestroyedListener = user.destroyed.attach(this.destroy.bind(this));
    this.fingerprint = randomBytes(16).toString('hex');
    this.timeout = null;
    this.setTimeout();
  }
  UserTcpServer.prototype.destroy = function(){
    if(this.timeout){
      lib.clearTimeout(this.timeout);
    }
    this.timeout = null;
    this.fingerprint = null;
    if(!this.userDestroyedListener){
      return;
    }
    this.userDestroyedListener.destroy();
    this.userDestroyedListener = null;
    this.options = null;
    this.user = null;
  };
  UserTcpServer.prototype.setTimeout = function(){
    if(this.timeout){
      lib.clearTimeout(this.timeout);
    }
    this.timeout = lib.runNext(this.destroy.bind(this),(this.timeOutInSeconds || 60)*1000);
  };
  UserTcpServer.prototype.start = function(defer){
    defer = defer || q.defer();
    if(!this.user){
      defer.reject(new lib.Error('HAD_TO_CLOSE'));
      return;
    }
    execSuite.firstFreePortStartingWith(execSuite.tcpTransmissionStartingPort).done(
      this.onPortFound.bind(this,defer),
      defer.reject.bind(defer)
    );
    return defer.promise;
  };
  UserTcpServer.prototype.onPortFound = function(defer,port){
    if(!this.fingerprint){
      return;
    }
    this.setTimeout();
    var s = net.createServer();
    s.on('connection',this.onConnection.bind(this,s));
    s.on('error', defer.reject.bind(defer));
    s.listen(port, this.onListeningStarted.bind(this, s, defer, port));
  };
  UserTcpServer.prototype.onListeningStarted = function (server, defer, port, err) {
    if (err) {
      server.on('close', this.onServerClosedForError.bind(this, server, defer));
      server.close();
    } else {
      server.on('close', this.destroy.bind(this));
      defer.resolve({port:port,fingerprint:this.fingerprint});
    }
    server = null;
    defer = null;
    port = null;
  };
  UserTcpServer.prototype.onServerClosedForError = function (server, defer) {
    server.removeAllListeners();
    this.start(defer);
  };
  UserTcpServer.prototype.onConnection = function(server,connection){
    new (this.ConnectionHandler)(this, server, connection);
  };
  UserTcpServer.prototype.onAuthenticatedConnection = function () {
  };
  UserTcpServer.prototype.processTransmissionPacket = function(server,connection,buffer){
    //console.log('incoming tcp packet',buffer,'with options',this.options);
  };
  UserTcpServer.prototype.closeBoth = function (server, connection) {
    server.close();
    connection.end();
  };
  UserTcpServer.prototype.ConnectionHandler = UserTcpConnectionHandler;

  ParentUser = ParentUser||_User;
  function User(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'));
  User.prototype.requestTcpTransmission = function(options,defer){
    var serverctor = options ? options.serverCtor : null, server, serverdefer;
    if('function' !== typeof serverctor){
      serverctor = this.TcpTransmissionServer;
    }
    server = new serverctor(this,options);
    if(!(server instanceof this.TcpTransmissionServer)){
      if('function' === server.destroy){
        server.destroy();
      }
    }else{
      serverdefer = q.defer();
      serverdefer.promise.done(
        defer.resolve.bind(defer),
        server.start.bind(server, defer)
      );
      server.start(serverdefer);
    }
  };
  User.prototype.TcpTransmissionServer = UserTcpServer;

  return User;
}

module.exports = createUser;
