/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

// Reads a binary tileFile.

var WATERA_TYPE = 1;
var WATERB_TYPE = 2;
var HIGHWAYA_TYPE = 3;
var HIGHWAYB_TYPE = 4;
var HIGHWAYC_TYPE = 5;
var HIGHWAYD_TYPE = 6;
var NATURAL_TYPE = 7;
var BUILDING_TYPE = 8;
var LANDUSE_TYPE = 9;

var featureMap = {
  waterA: WATERA_TYPE,
  waterB: WATERB_TYPE,
  highwayA: HIGHWAYA_TYPE,
  highwayB: HIGHWAYB_TYPE,
  highwayC: HIGHWAYC_TYPE,
  highwayD: HIGHWAYD_TYPE,
  natural: NATURAL_TYPE,
  building: BUILDING_TYPE,
  landuse: LANDUSE_TYPE
};

function getFeatureTypeFromID(id) {
  var features = Object.keys(featureMap);
  for (var i = 0; i < features.length; i++) {
    if (featureMap[features[i]] === id) {
      return features[i];
    }
  }
  // Should always find the feature from the ID.
  throw new Error('Should not get here');
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