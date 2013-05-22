// --- Constants & helpers to do meter -> pixel conversion ---

// The 20037508.342789241555641 corresponds roughly to 1/2 of the equator
// extend. As calculated from the radius of the earth: 2 * PI * 6378137 / 2.
var equatorExtendHalf = 20037508.342789241555641;
var equatorExtend = equatorExtendHalf * 2;
var TILE_SIZE = 256; // 256 x 256 is the default tile size.

'use strict';

function getNumberOfTiles(zoomLevel) {
  return Math.pow(2, zoomLevel);
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
    width: width, 
    height: height
  };
}

