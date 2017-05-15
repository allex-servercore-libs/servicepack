function createAllPassStrategy(){
  'use strict';
  function AllPassStrategy(options){
    this.json = options.json;
  }
  AllPassStrategy.prototype.destroy = function(){
    this.json = null;
  };
  AllPassStrategy.prototype.resolveUser = function(credentials,defer){
    if (this.json) {
      this.json.forEach (this._parse.bind(this, credentials));
    }
    defer.resolve(credentials);
  };

  AllPassStrategy.prototype._parse = function (credentials, field) {
    try {
      if (!(field in credentials)) return;
      credentials[field] = JSON.parse(credentials[field]);
    }catch (e) {
      console.log(e, e.stack);
    }
  };
  return AllPassStrategy;
}

module.exports = createAllPassStrategy;
