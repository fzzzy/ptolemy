/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
var port = 8888;

var connect = require('connect');
connect.createServer(
    connect.static(__dirname)
).listen(port);

console.log('### Running local server');
console.log('');
console.log('Running server at localhost:' + port);
