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

function setupMainThreadMessageHandler() {
    var worker = new Worker(globalScope.PTOLEMY.workerSrc);
    var handler = new MessageHandler('main', worker);

    return handler;
}

function setupWorkerMessageHandler() {
    var handler = new MessageHandler('worker', globalScope);

    handler.on('ping', function(data, promise) {
        console.log('Hello World from WebWorker');
        console.warn('Hello World from WebWorker');
        setTimeout(function() {
            promise.resolve(data + ' World');
            console.error('Hello World from WebWorker');
        }, 250);
    });
}

globalScope.PTOLEMY.boot = function boot() {
  // Worker thread?
  if (isWorker) {
    globalScope.console = workerConsole;

    setupWorkerMessageHandler();
  } else {
    globalScope.PTOLEMY.handler = setupMainThreadMessageHandler();
  }
};
