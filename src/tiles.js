/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// --- Constants & helpers to do meter -> pixel conversion ---

// The 20037508.342789241555641 corresponds roughly to 1/2 of the equator
// extend. As calculated from the radius of the earth: 2 * PI * 6378137 / 2.
var equatorExtendHalf = 20037508.342789241555641;
var equatorExtend = equatorExtendHalf * 2;
var degreeToMeter = equatorExtendHalf / 180;

var TILE_SIZE = 256; // 256 x 256 is the default tile size.

'use strict';

function getNumberOfTiles(zoomLevel) {
  return Math.pow(2, zoomLevel);
}

/**
 * Converts from WGS84 longitute and latitute coordiantes into mercator
 * projected meter system.
 *
 * Input:
 *
 *   +-----------------------+
 *   |          ^            |
 *   |      lat |            |  lat: [-90 to 90] degrees
 *   |          +--->        |  lon: [-180 to 180] degrees
 *   |           lon         |
 *   |                       |
 *   +-----------------------+
 *
 * Output:
 *
 *   +-----------------------+
 *   | +---> x               |
 *   | |                     |  x: [0 to 2 * equatorExtendHalf] meter
 *   | . y                   |  y: [0 to 2 * equatorExtendHalf] meter
 *   |                       |
 *   |                       |
 *   +-----------------------+
 */
function getMeterFromLonLat(lon, lat) {
  // Project the y coordinate using mercator projection.
  var latProj;
  latProj = Math.log(Math.tan((Math.PI/360) * (90 + lat))) / (Math.PI / 180);

  // Convert degrees to meters.
  var meterX = lon * degreeToMeter;
  var meterY = latProj * degreeToMeter;

  // Till this point, the origin of meterX and meterY is centered on the origin
  // relative to the Lon/Lat coordiante system. However, for rendering purpose
  // it's more suiteable to use a coordinate system with origin in the top-left
  // corner. This maps well with the HTML Canvas API as well as with the 
  // GoogleTile x/y format.

  meterX = meterX + equatorExtendHalf;
  meterY = equatorExtendHalf - meterY;

  return [meterX, meterY];
}

function getPixelPerMeter(zoomLevel) {
  var numberOfTiles = getNumberOfTiles(zoomLevel);
  return TILE_SIZE * numberOfTiles / equatorExtend;
}

function getTileFromMeter(x, y, zoomLevel) {
  var numberOfTiles = getNumberOfTiles(zoomLevel);

  var tileX = Math.floor((x/equatorExtend) * numberOfTiles);
  var tileY = Math.floor((y/equatorExtend) * numberOfTiles);
  return [tileX, tileY];
}

function getTileBoundingBoxInMeter(tileX, tileY, zoomLevel) {
  var numberOfTiles = getNumberOfTiles(zoomLevel);

  var minX = tileX * equatorExtend / numberOfTiles;
  var minY = tileY * equatorExtend / numberOfTiles;
  var width = equatorExtend / numberOfTiles;
  var height = width;

  return {
    minX: minX, 
    minY: minY,
    maxX: minX + width,
    maxY: minY + height,
    width: width, 
    height: height
  };
}

function intersect(a, b) {
  if(a.minX > b.maxX || b.minX > a.maxX || a.minY > b.maxY || b.minY > a.maxY) {
    return false;
  }
  return true;
}

if (typeof exports !== 'undefined') {
  exports.equatorExtend = equatorExtend;
  exports.getMeterFromLonLat = getMeterFromLonLat;
  exports.getNumberOfTiles = getNumberOfTiles;
  exports.getPixelPerMeter = getPixelPerMeter;
  exports.getTileFromMeter = getTileFromMeter;
  exports.getTileBoundingBoxInMeter = getTileBoundingBoxInMeter;
  exports.intersect = intersect;
}
