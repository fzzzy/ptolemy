/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals getTileBoundingBoxInMeter, getPixelPerMeter, assert, map,
    MAP_DEFAULT_ZOOM, mapLayer, mapData, TILE_SIZE, WATERA_TYPE,
    WATERB_TYPE, HIGHWAYA_TYPE, HIGHWAYB_TYPE, HIGHWAYC_TYPE,
    HIGHWAYD_TYPE, NATURAL_TYPE, BUILDING_TYPE, LANDUSE_TYPE */
'use strict';

// --- Actual rendering ---

// Adjust this based on current zoom level.
var LINE_WIDTH_ROOT = 1.5;

function drawShape(ctx, shape, fillShape) {
  ctx.beginPath();

  for (var i = 0; i < shape.length; i += 2) {
    var x = shape[i];
    var y = shape[i + 1];

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  if (fillShape) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

var wayRenderingStyle = [
  {
    id: LANDUSE_TYPE, color: 'green', fill: true,
  },
  {
    id: NATURAL_TYPE, fill: true, color: '#68B300'
  },
  {
    // Riverbanks
    id: WATERA_TYPE, color: '#00899E', fill: true
  },
  {
    // Rivers
    id: WATERB_TYPE, color: '#00899E', lineWidth: LINE_WIDTH_ROOT * 5
  },
  {
    id: BUILDING_TYPE, color: 'burlywood', fill: true
  },
  {
    id: HIGHWAYD_TYPE, color: 'white', lineWidth: LINE_WIDTH_ROOT * 3
  },
  {
    id: HIGHWAYC_TYPE, color: 'white', lineWidth: LINE_WIDTH_ROOT * 7
  },
  {
    id: HIGHWAYB_TYPE,
    color: '#F7EF0D',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: true
  },
  {
    id: HIGHWAYA_TYPE,
    color: '#FFA200',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: true
  }
];

var features = wayRenderingStyle.map(function(style) {
  return style.id;
});

function renderTile(x, y, zoomLevel, ctx, mapData, callback) {
  console.time('overall-render-start');

  ctx.save();

  // Figure out the boundary box of the tile to render.
  var tileBB = getTileBoundingBoxInMeter(x, y, zoomLevel);
  var pixelPerMeter = getPixelPerMeter(zoomLevel);

  ctx.scale(pixelPerMeter, pixelPerMeter);
  ctx.translate(-tileBB.minX, -tileBB.minY);

  var tileName = zoomLevel + '/' + x + '/' + y;

  // Clip to the boundingBox of the tile on the canvas to prevent
  // drawing outside of the current tile.
  ctx.rect(tileBB.minX, tileBB.minY, tileBB.width, tileBB.height);
  ctx.clip();

  // Lookup the wayMapping from the mapData.
  mapData.collectTileData(x, y, zoomLevel, function(error, tileData) {
    if (error) {
      ctx.restore();
      callback(error);
      return;
    }

    renderTileData(ctx, tileData);
    ctx.restore();

    callback(null);

    console.timeEnd('overall-render-start');
  });
}

function renderTileData(ctx, tileData) {
  console.time('render-start');

  // Rounded lines look cute :)
  ctx.lineCap = 'round';

  // Draw all the way rendering stayles.
  for (var i = 0; i < wayRenderingStyle.length; i++) {
    var style = wayRenderingStyle[i];
    var ways = tileData[style.id];

    if (style.outline) {
      for (var n = 0; n < ways.length; n++) {
        ctx.lineWidth = style.lineWidth * 1.1;
        ctx.strokeStyle = '#686523';

        drawShape(ctx, ways[n], false);
      }
    }

    ctx.lineWidth = style.lineWidth;
    if (style.fill) {
      ctx.fillStyle = style.color;
    } else {
      ctx.strokeStyle = style.color;
    }

    var fill = style.fill;
    for (var j = 0; j < ways.length; j++) {
      drawShape(ctx, ways[j], fill);
    }
  }

  console.timeEnd('render-start');
}

function renderMapData(mapData) {
  var b = mapData.bounds;
  var latLon = [(b.minlat + b.maxlat)/2, (b.minlon + b.maxlon)/2];

  map.setView(latLon, MAP_DEFAULT_ZOOM);
  mapLayer.mapData = mapData;
  mapLayer.redraw();
}
