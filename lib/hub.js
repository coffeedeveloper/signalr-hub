import debug from 'debug';
debug.enable('*');

var _debug = debug('Hub');

var instance = null;

class Hub {
  constructor (opts) {
    this.opts = opts || {};
    this.hubName = this.opts.hubName;
    if (!this.hubName) {
      _debug('hubName 必须要设置!');
    }

    this.readyStatus = false;
    this.queue = [];
    this.interval = null;
    this.delay = this.opts.delay || 500;
    this.cache = {};

    this.hub = $.connection[this.hubName];

    var self = this;
    var makeClientFunc = (taskName) => {
      return function () {
        _debug('in task callback', taskName, arguments);
        if (typeof self.cache[taskName] === 'function') {
          self.cache[taskName].apply(null, arguments);
        }
      };
    };
    for (var t in this.hub.server) {
      this.hub.client[t] = makeClientFunc(t);
    }
    this.start();
  }
  start () {
    $.connection.hub.start().done(() => {
      _debug('hub server started');
      this.readyStatus = true;
    }.bind(this));
    this.check();
  }
  check () {
    if (this.readyStatus) {
      clearTimeout(this.readyStatus);
      this.interval = null;
      this.queue.map((t) => {
        this.task(t.taskName, t.params, t.callback);
      }.bind(this));
    } else {
      this.interval = setTimeout(() => {
        this.check();
      }.bind(this), this.delay);
    }
  }
  register (taskName, callback) {
    if (typeof callback === 'function') {
      this.cache[taskName] = callback;
    }
  }
  task (taskName, params, callback) {
    if (this.readyStatus) {
      this.register(taskName, callback);
      if (taskName in this.hub.server) {
        _debug('send task', taskName);
        this.hub.server[taskName].apply(null, params);
      } else {
        _debug(`${this.hubName} 中并没有 ${taskName}这个方法。`);
      }
    } else {
      this.queue.push({
        taskName: taskName,
        params: params,
        callback
      });
    }
  }
}

Hub.getInstance = (opts) => {
  if (instance === null) {
    _debug('create hub server instance');
    instance = new Hub(opts);

    //debug
    if (window !== undefined) {
      window.HUB = instance;
    }
  }
  return instance;
};

export default Hub;
