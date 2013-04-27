/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals workerConsole, MessageHandler, workerSrc */

'use strict';

var globalScope = (typeof window === 'undefined') ? this : window;

var isWorker = (typeof window == 'undefined');

// The global PTOLEMY object exposes the API
// In production, it will be declared outside a global wrapper
// In development, it will be declared here
if (!globalScope.PTOLEMY) {
  globalScope.PTOLEMY = {};
}

globalScope.PTOLEMY.enableWorker = true;
globalScope.PTOLEMY.started = false;

function setupMainThreadMessageHandler() {
  var worker;
  if (globalScope.PTOLEMY.enableWorker) {
    worker = new Worker(globalScope.PTOLEMY.workerSrc);
  } else {
    worker = {
      postMessage: function WorkerTransport_postMessage(obj) {
        worker.onmessage({data: obj});
      },
      terminate: function WorkerTransport_terminate() {}
    };
  }
  var handler = new MessageHandler('main', worker);

  if (!globalScope.PTOLEMY.enableWorker) {
    setupWorkerMessageHandler(handler);
  }

  return handler;
}

function setupWorkerMessageHandler(handler) {
  handler.on('ping', function(data, promise) {
    promise.resolve('pong');
  });
  handler.on('start', function(data, promise) {
    if (!globalScope.PTOLEMY.started) {
      globalScope.PTOLEMY.started = true;
      importScripts(data+'?'+new Date());
      promise.resolve(true);
    }
  });
  return handler;
}

globalScope.PTOLEMY.boot = function boot() {
  // Worker thread?
  if (isWorker) {
    globalScope.console = workerConsole;

    var handler = new MessageHandler('worker', globalScope);
    globalScope.PTOLEMY.handler = handler;
    setupWorkerMessageHandler(handler);
  } else {
    globalScope.PTOLEMY.handler = setupMainThreadMessageHandler();
    globalScope.PTOLEMY.started = true;
  }
};
