/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals PTOLEMY */

'use strict';

// A notice for devs that will not trigger the fallback UI.  These are good
// for things that are helpful to devs, such as warning that Workers were
// disabled, which is important to devs but not end users.
function info(msg) {
  console.log(msg);
}

// Non-fatal warnings that should trigger the fallback UI.
function warn(msg) {
  console.warn(warn);
}

// Fatal errors that should trigger the fallback UI and halt execution by
// throwing an exception.
function error(msg) {
  console.error(msg);
  throw new Error(msg);
}

// Missing features that should trigger the fallback UI.
function TODO(what) {
  console.log('TODO: ' + what);
}

function backtrace() {
  try {
    throw new Error();
  } catch (e) {
    return e.stack ? e.stack.split('\n').slice(2).join('\n') : '';
  }
}

function assert(cond, msg) {
  if (!cond)
    error(msg);
}

var LogManager = PTOLEMY.LogManager = (function LogManagerClosure() {
  var loggers = [];
  return {
    addLogger: function logManager_addLogger(logger) {
      loggers.push(logger);
    },
    notify: function(type, message) {
      for (var i = 0, ii = loggers.length; i < ii; i++) {
        var logger = loggers[i];
        if (logger[type])
          logger[type](message);
      }
    }
  };
})();

/**
 * 'Promise' object.
 * Each object that is stored in PDFObjects is based on a Promise object that
 * contains the status of the object and the data. There might be situations
 * where a function wants to use the value of an object, but it isn't ready at
 * that time. To get a notification, once the object is ready to be used, s.o.
 * can add a callback using the `then` method on the promise that then calls
 * the callback once the object gets resolved.
 * A promise can get resolved only once and only once the data of the promise
 * can be set. If any of these happens twice or the data is required before
 * it was set, an exception is throw.
 */
var Promise = PTOLEMY.Promise = (function PromiseClosure() {
  var EMPTY_PROMISE = {};

  /**
   * If `data` is passed in this constructor, the promise is created resolved.
   * If there isn't data, it isn't resolved at the beginning.
   */
  function Promise(name, data) {
    this.name = name;
    this.isRejected = false;
    this.error = null;
    this.exception = null;
    // If you build a promise and pass in some data it's already resolved.
    if (data !== null && data !== undefined) {
      this.isResolved = true;
      this._data = data;
      this.hasData = true;
    } else {
      this.isResolved = false;
      this._data = EMPTY_PROMISE;
    }
    this.callbacks = [];
    this.errbacks = [];
    this.progressbacks = [];
  }
  /**
   * Builds a promise that is resolved when all the passed in promises are
   * resolved.
   * @param {Promise[]} promises Array of promises to wait for.
   * @return {Promise} New dependant promise.
   */
  Promise.all = function Promise_all(promises) {
    var deferred = new Promise();
    var unresolved = promises.length;
    var results = [];
    if (unresolved === 0) {
      deferred.resolve(results);
      return deferred;
    }
    for (var i = 0, ii = promises.length; i < ii; ++i) {
      var promise = promises[i];
      promise.then((function(i) {
        return function(value) {
          results[i] = value;
          unresolved--;
          if (unresolved === 0)
            deferred.resolve(results);
        };
      })(i));
    }
    return deferred;
  };
  Promise.prototype = {
    hasData: false,

    set data(value) {
      if (value === undefined) {
        return;
      }
      if (this._data !== EMPTY_PROMISE) {
        error('Promise ' + this.name +
              ': Cannot set the data of a promise twice');
      }
      this._data = value;
      this.hasData = true;

      if (this.onDataCallback) {
        this.onDataCallback(value);
      }
    },

    get data() {
      if (this._data === EMPTY_PROMISE) {
        error('Promise ' + this.name + ': Cannot get data that isn\'t set');
      }
      return this._data;
    },

    onData: function Promise_onData(callback) {
      if (this._data !== EMPTY_PROMISE) {
        callback(this._data);
      } else {
        this.onDataCallback = callback;
      }
    },

    resolve: function Promise_resolve(data) {
      if (this.isResolved) {
        error('A Promise can be resolved only once ' + this.name);
      }
      if (this.isRejected) {
        error('The Promise was already rejected ' + this.name);
      }

      this.isResolved = true;
      this.data = (typeof data !== 'undefined') ? data : null;
      var callbacks = this.callbacks;

      for (var i = 0, ii = callbacks.length; i < ii; i++) {
        callbacks[i].call(null, data);
      }
    },

    progress: function Promise_progress(data) {
      var callbacks = this.progressbacks;
      for (var i = 0, ii = callbacks.length; i < ii; i++) {
        callbacks[i].call(null, data);
      }
    },

    reject: function Promise_reject(reason, exception) {
      if (this.isRejected) {
        error('A Promise can be rejected only once ' + this.name);
      }
      if (this.isResolved) {
        error('The Promise was already resolved ' + this.name);
      }

      this.isRejected = true;
      this.error = reason || null;
      this.exception = exception || null;
      var errbacks = this.errbacks;

      for (var i = 0, ii = errbacks.length; i < ii; i++) {
        errbacks[i].call(null, reason, exception);
      }
    },

    then: function Promise_then(callback, errback, progressback) {
      if (!callback) {
        error('Requiring callback' + this.name);
      }

      // If the promise is already resolved, call the callback directly.
      if (this.isResolved) {
        var data = this.data;
        callback.call(null, data);
      } else if (this.isRejected && errback) {
        var error = this.error;
        var exception = this.exception;
        errback.call(null, error, exception);
      } else {
        this.callbacks.push(callback);
        if (errback)
          this.errbacks.push(errback);
      }

      if (progressback)
        this.progressbacks.push(progressback);
    }
  };

  return Promise;
})();
