import debug from 'debug';
debug.enable('*');

var _debug = debug('Hub');

var instance = null;

function extend (t, ...objs) {
  for (var o of objs )
    for (var p in o)
      t[p] = o[p];
  return t;
}

class Hub {
  constructor (opts = {}) {
    const noop = function () {};
    const defaults = {
      starting: noop,
      received: noop,
      connectionSlow: noop,
      reconnecting: noop,
      reconnected: noop,
      stateChanged: noop,
      disconnected: noop,
      error: noop,
      connected: noop,
      delay: 500,
      log: false
    };
    this.opts = extend({}, defaults, opts);
    this.hubName = this.opts.hubName;
    if (!this.hubName) {
      _debug('hubName 必须要设置!');
    }

    this.readyStatus = false;
    this.queue = [];
    this.interval = null;
    this.delay = this.opts.delay;
    this.cache = {};

    this.hub = $.connection[this.hubName];

    if (this.opts.log) $.connection.hub.logging = true;

    for (var e of ['starting', 'received', 'connectionSlow', 'reconnecting',
      'reconnected', 'stateChanged', 'disconnected', 'error']) {
      $.connection.hub[e](this.opts[e]);
    }

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
      this.opts.connected();
    });
    this.check();
  }
  check () {
    if (this.readyStatus) {
      clearTimeout(this.interval);
      this.interval = null;
      this.queue.map((t) => {
        this.task(t.taskName, t.params, t.callback);
      });
    } else {
      this.interval = setTimeout(() => {
        this.check();
      }, this.delay);
    }
  }
  on (taskName, callback) {
    if (typeof callback === 'function') {
      this.cache[taskName] = callback;
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
      this.queue.push({ taskName, params, callback });
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
