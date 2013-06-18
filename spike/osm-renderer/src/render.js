// --- Actual rendering ---

// Adjust this based on current zoom level.
var LINE_WIDTH_ROOT = 1.5;

function drawShape(ctx, shape, fillShape) {
  ctx.beginPath();

  for (var i = 0; i < shape.length; i += 2) {
    var x = shape[i];
    var y = shape[i + 1];

    if (i == 0) {
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
    name: 'landuse', color: 'green', fill: true,
  },
  {
    name: 'natural', fill: true, color: '#68B300'
  },
  {
    // Riverbanks
    name: 'waterA', color: '#00899E', fill: true
  },
  {
    // Rivers
    name: 'waterB', color: '#00899E', lineWidth: LINE_WIDTH_ROOT * 5
  },
  {
    name: 'building', color: 'burlywood', fill: true
  },
  {
    name: 'highwayD', color: 'white', lineWidth: LINE_WIDTH_ROOT * 3
  },
  {
    name: 'highwayC', color: 'white', lineWidth: LINE_WIDTH_ROOT * 7
  },
  {
    name: 'highwayB', color: '#F7EF0D', lineWidth: LINE_WIDTH_ROOT * 10, outline: true
  },
  {
    name: 'highwayA', color: '#FFA200', lineWidth: LINE_WIDTH_ROOT * 10, outline: true
  }
];

var features = wayRenderingStyle.map(function(style) { return style.name });

function renderTile(x, y, zoomLevel, ctx, mapData, callback) {
  ctx.save();

  // Figure out the boundary box of the tile to render.
  var tileBB = getTileBoundingBoxInMeter(x, y, zoomLevel);
  var pixelPerMeter = getPixelPerMeter(zoomLevel);

  ctx.scale(pixelPerMeter, pixelPerMeter);
  ctx.translate(-tileBB.minX, -tileBB.minY);

  var tileName = zoomLevel + '/' + x + '/' + y;
  console.log('Render tile:', tileName);
  // console.log(tileBB);

  // Clip to the boundingBox of the tile on the canvas to prevent drawing outside
  // of the current tile.
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
  });
}

function renderTileData(ctx, tileData) {
  console.time('render-start');

  // Rounded lines look cute :)
  ctx.lineCap = 'round';

  // Draw all the way rendering stayles.
  for (var i = 0; i < wayRenderingStyle.length; i++) {
    var style = wayRenderingStyle[i];
    var ways = tileData[style.name];

    assert(ways);

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
    for (var n = 0; n < ways.length; n++) {
      drawShape(ctx, ways[n], fill);
    }
  }

  console.timeEnd('render-start');
}

function renderMapData(mapData) {
  if (USE_LEAFLET_MAP) {
    var b = mapData.bounds;
    var latLon = [(b.minlat + b.maxlat)/2, (b.minlon + b.maxlon)/2];

    console.log(latLon);

    map.setView(latLon, MAP_DEFAULT_ZOOM);
    mapLayer.mapData = mapData;
    mapLayer.redraw();

    return;
  }

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  // --- Translate the canvas context to make drawing go at the right spot ---
  var tileBounds = mapData.getTileBounds(MAP_DEFAULT_ZOOM);

  var tileMin = tileBounds.min;
  var tileMax = tileBounds.max;

  var tileXCount = tileMax[0] - tileMin[0] + 1;
  var tileYCount = tileMax[1] - tileMin[1] + 1;

  // --- Add margin around the map and color background ---
  var mapMargin = 10;

  var canvasWidth = tileXCount * TILE_SIZE;
  var canvasHeight = tileYCount * TILE_SIZE;

  canvas.width = canvasWidth + 2 * mapMargin;
  canvas.height = canvasHeight + 2 * mapMargin;

  ctx.translate(mapMargin, mapMargin);

  // Draw the background of the map.
  ctx.fillStyle = 'rgb(237, 230, 220)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // --- Draw the individual tiles of the map ---

  var x = 0;
  var y = 0;
  function renderNextTile() {
    if (x == tileXCount) {
      return;
    }

    ctx.save();
    ctx.translate(x * TILE_SIZE, y * TILE_SIZE);

    renderTile(
      x + tileMin[0], y + tileMin[1], MAP_DEFAULT_ZOOM, ctx, mapData,
      function callback() {
        ctx.restore();

        y ++;
        if (y == tileYCount) {
          x ++;
          y = 0;
        }

        // setTimeout(renderNextTile, 0);
        renderNextTile();
      }
    );
  }

  renderNextTile();
}
