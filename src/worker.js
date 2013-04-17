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
/* globals error, globalScope, InvalidPDFException, log,
           MissingPDFException, PasswordException, PDFDocument, PDFJS, Promise,
           Stream, UnknownErrorException, warn */

'use strict';

function MessageHandler(name, comObj) {
  this.name = name;
  this.comObj = comObj;
  this.callbackIndex = 1;
  var callbacks = this.callbacks = {};
  var ah = this.actionHandler = {};

  ah['console_log'] = [function ahConsoleLog(data) {
    log.apply(null, data);
  }];
  // If there's no console available, console_error in the
  // action handler will do nothing.
  if ('console' in globalScope) {
    ah['console_error'] = [function ahConsoleError(data) {
      globalScope['console'].error.apply(null, data);
    }];
  } else {
    ah['console_error'] = [function ahConsoleError(data) {
      log.apply(null, data);
    }];
  }
  ah['_warn'] = [function ah_Warn(data) {
    warn(data);
  }];

  comObj.onmessage = function messageHandlerComObjOnMessage(event) {
    var data = event.data;
    if (data.isReply) {
      var callbackId = data.callbackId;
      if (data.callbackId in callbacks) {
        var callback = callbacks[callbackId];
        delete callbacks[callbackId];
        callback(data.data);
      } else {
        error('Cannot resolve callback ' + callbackId);
      }
    } else if (data.action in ah) {
      var action = ah[data.action];
      if (data.callbackId) {
        var promise = new Promise();
        promise.then(function(resolvedData) {
          comObj.postMessage({
            isReply: true,
            callbackId: data.callbackId,
            data: resolvedData
          });
        });
        action[0].call(action[1], data.data, promise);
      } else {
        action[0].call(action[1], data.data);
      }
    } else {
      error('Unkown action from worker: ' + data.action);
    }
  };
}

MessageHandler.prototype = {
  on: function messageHandlerOn(actionName, handler, scope) {
    var ah = this.actionHandler;
    if (ah[actionName]) {
      error('There is already an actionName called "' + actionName + '"');
    }
    ah[actionName] = [handler, scope];
  },
  /**
   * Sends a message to the comObj to invoke the action with the supplied data.
   * @param {String} actionName Action to call.
   * @param {JSON} data JSON data to send.
   * @param {function} [callback] Optional callback that will handle a reply.
   */
  send: function messageHandlerSend(actionName, data, callback) {
    var message = {
      action: actionName,
      data: data
    };
    if (callback) {
      var callbackId = this.callbackIndex++;
      this.callbacks[callbackId] = callback;
      message.callbackId = callbackId;
    }
    this.comObj.postMessage(message);
  }
};

var consoleTimer = {};

var workerConsole = {
  log: function log() {
    var args = Array.prototype.slice.call(arguments);
    globalScope.postMessage({
      action: 'console_log',
      data: args
    });
  },

  error: function error() {
    var args = Array.prototype.slice.call(arguments);
    globalScope.postMessage({
      action: 'console_error',
      data: args
    });
    throw 'pdf.js execution error';
  },

  time: function time(name) {
    consoleTimer[name] = Date.now();
  },

  timeEnd: function timeEnd(name) {
    var time = consoleTimer[name];
    if (!time) {
      error('Unkown timer name ' + name);
    }
    this.log('Timer:', name, Date.now() - time);
  }
};


