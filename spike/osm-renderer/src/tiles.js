// --- Constants & helpers to do meter -> pixel conversion ---

// The 20037508.342789241555641 corresponds roughly to 1/2 of the equator
// extend. As calculated from the radius of the earth: 2 * PI * 6378137 / 2.
var equatorExtendHalf = 20037508.342789241555641;
var equatorExtend = equatorExtendHalf * 2;
var TILE_SIZE = 256; // 256 x 256 is the default tile size.

function calcPixelPerMeter(zoomLevel) {
  var numberOfTiles = Math.pow(2, zoomLevel);
  return TILE_SIZE * numberOfTiles / equatorExtend;
}