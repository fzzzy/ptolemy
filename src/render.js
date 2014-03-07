/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals getTileBoundingBoxInMeter, getPixelPerMeter, assert, map,
    MAP_DEFAULT_ZOOM, mapLayer, mapData, TILE_SIZE */
'use strict';

// --- Actual rendering ---

// Adjust this based on current zoom level.
var LINE_WIDTH_ROOT = 1.5;

var offScreenCanvas;

var wayRenderingStyle = {
  1: {
    // Riverbanks
    color: '#00899E', fill: true
  },
  2: {
    // Rivers
    color: '#00899E', lineWidth: LINE_WIDTH_ROOT * 5
  },
  3: {
    color: '#FFA200',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: '#FE9A2E'
  },
  4: {
    color: '#F7EF0D',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: '#FE9A2E'
  },
  5: {
    color: 'white', lineWidth: LINE_WIDTH_ROOT * 7
  },
  6: {
    color: 'white', lineWidth: LINE_WIDTH_ROOT * 3
  },
  7: {
    fill: true, color: '#68B300'
  },
  8: {
    color: 'burlywood', fill: true
  },
  9: {
    color: 'lightgray', fill: true,
  },
};

function renderTile(canvas, x, y, zoomLevel, mapData, callback) {
  // Lookup the wayMapping from the mapData.
  mapData.collectTileData(x, y, zoomLevel, function(error, tileData) {
    if (error) {
      return;
    }

    var ctx;

    if (!offScreenCanvas) {
      offScreenCanvas = document.createElement('canvas');
      offScreenCanvas.width = canvas.width;
      offScreenCanvas.height = canvas.height;
      ctx = offScreenCanvas.getContext('2d');
    } else {
      ctx = offScreenCanvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();

    var tileName = zoomLevel + '/' + x + '/' + y;
    ctx.fillText(tileName, 20, 20);

    // Figure out the boundary box of the tile to render.
    var tileBB = getTileBoundingBoxInMeter(x, y, zoomLevel);
    var pixelPerMeter = getPixelPerMeter(zoomLevel);

    ctx.scale(pixelPerMeter, pixelPerMeter);
    ctx.translate(-tileBB.minX, -tileBB.minY);

    //console.log('Render tile: ', tileName);

    // Clip to the boundingBox of the tile on the canvas to prevent
    // drawing outside of the current tile.
    ctx.strokeStyle = 'black';
    ctx.rect(tileBB.minX, tileBB.minY, tileBB.width, tileBB.height);
    ctx.clip();
    ctx.moveTo(
      tileBB.minX,
      tileBB.minY);
    ctx.lineTo(
      tileBB.minX + tileBB.width,
      tileBB.minY + tileBB.height);
    ctx.stroke();

    renderTileData(ctx, tileData, tileName);

    ctx.restore();

    var onScreenContext = canvas.getContext('2d');
    onScreenContext.drawImage(offScreenCanvas, 0, 0);

    callback(offScreenCanvas);
  });
}

function renderData(ctx, data) {
  var farr = new Float32Array(data);
  var iarr = new Uint32Array(data);

  var offset = 0;
  var featureCount = iarr[offset];
  offset += 1;

  for (var i = 0; i < featureCount; i++) {
    var featureID = iarr[offset];

    var style = wayRenderingStyle[featureID];

    var entryCount = iarr[offset + 1];
    offset += 2;

    for (var n = 0; n < entryCount; n++) {
      var nodeSize = iarr[offset];
      offset += 1;

      if (nodeSize > 0) {
        ctx.beginPath();

        ctx.moveTo(farr[offset], farr[offset+1]);
        offset += 2;

        for (var k = 2; k < nodeSize; k += 2) {
          ctx.lineTo(farr[offset], farr[offset+1]);
          offset += 2;
        }

        ctx.lineWidth = style.lineWidth;
        if (style.fill) {
          ctx.fillStyle = style.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = style.color;
          ctx.stroke();
        }
      }
    }
  }
}

function renderTileData(ctx, tileData, tileName) {
  console.time('render ' + tileName);

  // Rounded lines look cute :)
  ctx.lineCap = 'round';

  for (var i = 0; i < tileData.length; i++) {
    renderData(ctx, tileData[i]);
  }

  console.timeEnd('render ' + tileName);
}

function renderMapData(mapData) {
  var b = mapData.bounds;
  var latLon = [(b.minlat + b.maxlat)/2, (b.minlon + b.maxlon)/2];

  map.setView(latLon, MAP_DEFAULT_ZOOM);
  mapLayer.mapData = mapData;
  mapLayer.redraw();
}
