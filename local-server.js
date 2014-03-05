/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var port = 8888;

var connect = require('connect');
var fetchOsmData = require('./fetch_osm_data');
var app = connect()
          .use(connect.static(__dirname))
          .use(connect.query())
          .use(function (req, res) {
  var query = req.query;
  var s = query.s;
  var w = query.w;
  var n = query.n;
  var e = query.e;
  if ([s, w, n, e].every(isFinite)) {
    fetchOsmData(s, w, n, e).pipe(res);
  } else {
    res.statusCode = 404;
    res.end("expected numeric querystring parameters s, w, n, & e");
  }
});

require('http').createServer(app).listen(port);
console.log('Running server at localhost:' + port);
