function createMaterializeStateTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      SinkTask = execSuite.SinkTask,
      Collection = execSuite.Collection;
  function MaterializeStateTask(prophash){
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    if (prophash.data) {
      if (prophash.data instanceof lib.Map) {
        this.data = this.extendTo(new execSuite.State2Map(prophash.data));
      } else {
        throw new lib.Error('MATERIALIZE_STATE_DATA_MUST_BE_A_MAP','If you provide data in propertyhash it must be instanceof lib.Map');
      }
    }
  }
  lib.inherit(MaterializeStateTask,SinkTask);
  MaterializeStateTask.prototype.__cleanUp = function(){
    this.data = null; //this.data will be autodestroyed
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  MaterializeStateTask.prototype.go = function(){
    if (!this.sink.state) {
      this.sink.state = new Collection();
      this.sink.consumeChannel('s',this.sink.state); //this.state will be autodestroyed
    } else {
      if (this.sink.state.push) {
        console.trace();
        console.error('Cannot materializeState on a Sink that is in "external oobsink" mode');
        process.exit(0);
      }
    }
    if (this.data) {
      this.setSink(this.data);
    }
  };
  MaterializeStateTask.prototype.get = function (name) {
    return this.sink.state.data.get(name);
  };
  MaterializeStateTask.prototype.setSink = function (sink) {
    this.sink.state.setSink(sink);
  };
  MaterializeStateTask.prototype.compulsoryConstructionProperties = ['sink'];
  return MaterializeStateTask;
}

module.exports = createMaterializeStateTask;
