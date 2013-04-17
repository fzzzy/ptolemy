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
/* jshint node:true */
/* globals cat, cd, cp, echo, env, exec, exit, find, ls, mkdir, mv, process, rm,
           sed, target, test */

'use strict';

require('./external/shelljs/make');
var crlfchecker = require('./external/crlfchecker/crlfchecker.js');
var path = require('path');
var staticServer = require('node-static');


var ROOT_DIR = __dirname + '/'; // absolute path to project's root

//
// make all
//
target.all = function() {
  // Don't do anything by default
  echo('Please specify a target. Available targets:');
  for (var t in target)
    if (t !== 'all') echo('  ' + t);
};

//
// make lint
//
target.lint = function() {
  cd(ROOT_DIR);
  echo();
  echo('### Linting JS files');

  var LINT_FILES = ['make.js',
                    'external/crlfchecker/',
                    'src/'
                    ];

  var jshintPath = path.normalize('./node_modules/.bin/jshint');
  if (!test('-f', jshintPath)) {
    echo('jshint is not installed -- installing...');
    exec('npm install jshint');
  }

  exit(exec('"' + jshintPath + '" --reporter test/reporter.js ' +
            LINT_FILES.join(' ')).code);

  crlfchecker.checkIfCrlfIsPresent(LINT_FILES);
};

target.server = function() {
  var file = new staticServer.Server();

  require('http').createServer(function (request, response) {
      request.addListener('end', function () {
          //
          // Serve files!
          //
          file.serve(request, response);
      });
  }).listen(8888);

  echo('### Running local server')
  echo('');
  echo('Running server at localhost:8888')
};

//
// make makefile
//
target.makefile = function() {
  var makefileContent = 'help:\n\tnode make\n\n';
  var targetsNames = [];
  for (var i in target) {
    makefileContent += i + ':\n\tnode make ' + i + '\n\n';
    targetsNames.push(i);
  }
  makefileContent += '.PHONY: ' + targetsNames.join(' ') + '\n';
  makefileContent.to('Makefile');
};
