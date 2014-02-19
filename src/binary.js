/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Reads a binary tileFile.

var featureMap = {
  waterA: 1,
  waterB: 2,
  highwayA: 3,
  highwayB: 4,
  highwayC: 5,
  highwayD: 6,
  natural: 7,
  building: 8,
  landuse: 9
}

function getFeatureTypeFromID(id) {
  var features = Object.keys(featureMap);
  for (var i = 0; i < features.length; i++) {
    if (featureMap[features[i]] === id) {
      return features[i];
    }
  }
  // Should always find the feature from the ID.
  assert(false);
}

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

function readTileFeatures(binaryArray) {
  var farr = new Float32Array(binaryArray);
  var iarr = new Uint32Array(binaryArray);

  var offset = 0;
  var featureCount = iarr[offset];
  offset += 1;

  var features = {};

  for (var i = 0; i < featureCount; i++) {
    var featureID = iarr[offset];
    var entryCount = iarr[offset + 1];
    offset += 2;

    var type = getFeatureTypeFromID(featureID);

    var entries = [];
    for (var n = 0; n < entryCount; n++) {
      var nodeSize = iarr[offset];
      offset += 1;

      var nodes = [];
      for (var k = 0; k < nodeSize; k++) {
        nodes.push(farr[offset]);
        offset += 1;
      }
      entries.push(nodes);
    }

    features[type] = entries;
  }

  return features;
}

function readTileFile(response, callback) {
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

  callback(null, {
    bounds: bounds,
    tileInfos: tileInfos,
    response: response
  });
}

function getBinaryTileFile(fileName, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', fileName, true);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function(e) {
    readTileFile(this.response, callback);
  };

  xhr.onerror = function(e) {
    callback(e);
  }

  xhr.onabort = function(e) {
    callback(e);
  }

  xhr.send();
}