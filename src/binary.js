/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

// Reads a binary tileFile.

function readXRef(iarr) {
  var offset = iarr[1] / 4;

  var tileCount = iarr[offset];
  offset += 1;

  var tiles = [];
  for (var i = 0; i < tileCount; i++) {
    var z = iarr[offset];
    var x = iarr[offset + 1];
    var y = iarr[offset + 2];
    var p = iarr[offset + 3];

    offset += 4;
    tiles.push({
      name: z + '/' + x + '/' + y,
      offset: p
    });
  }

  return tiles;
}

function readTileFile(response) {
  var farr = new Float32Array(response);
  var iarr = new Uint32Array(response);

  var version = iarr[0];

  var tileInfos = readXRef(iarr);
  var bounds = {
    minlat: farr[2],
    maxlat: farr[3],
    minlon: farr[4],
    maxlon: farr[5]
  };

  return {
    bounds: bounds,
    tileInfos: tileInfos,
    response: response
  };
}

function getBinaryTileFile(fileName, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', fileName, true);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function(e) {
    var mapData = readTileFile(this.response);
    callback(null, mapData);
  };

  xhr.onerror = function(e) {
    callback(e);
  };

  xhr.onabort = function(e) {
    callback(e);
  };

  xhr.send();
}