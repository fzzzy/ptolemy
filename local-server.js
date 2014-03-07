/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var port = 8888;

var fs = require('fs');
var spawn = require('child_process').spawn;
var connect = require('connect');
var fetchOsmData = require('./fetch_osm_data');

function errRes (res, msg) {
  res.statusCode = 404;
  res.end();
};

var app = connect()
          .use(connect.static(__dirname))
          .use(connect.query())
          .use(function (req, res) {
  console.log('got a request: ' + req.url);
  var query = req.query;
  var s = query.s;
  var w = query.w;
  var n = query.n;
  var e = query.e;
  if (![s, w, n, e].every(isFinite)) {
    return errRes("expected numeric querystring parameters s, w, n, & e");
  }
  var osmFile = fs.createWriteStream('temp.osm');
  osmFile.on('finish', function () {
    var osmosis = spawn('osmosis-0.40.1/bin/osmosis', [
      '--read-xml', 'file=temp.osm', '--mapfile-writer', 'file=mymap.map',
      'bbox=' + s + ',' + w + ',' + n + ',' + e
    ]);

    osmosis.stdout.on('data', function (d) { console.log(d); });
    osmosis.stderr.on('data', function (e) { console.error(e.toString()); });
    osmosis.on('close', function (exitCode) {
      if (exitCode !== 0) return errRes("osmosis exited with code: " + exitCode);
      fs.createReadStream('mymap.map').pipe(res);
    });
  });
  fetchOsmData(s, w, n, e).pipe(osmFile);
});

require('http').createServer(app).listen(port);
console.log('Running server at localhost:' + port);
