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
  console.log(tileBB);

  // Clip to the boundingBox of the tile on the canvas to prevent drawing outside
  // of the current tile.

  ctx.rect(tileBB.minX, tileBB.minY, tileBB.width, tileBB.height);
  ctx.clip();

  // Lookup the wayMapping from the mapData.
  mapData.collectTileData(x, y, zoomLevel, function(error, tileData) {
    if (error) {
      callback(error);
      ctx.restore();
      return;
    }

    render(ctx, tileData);
    ctx.restore();

    callback(null);
  });
}

function render(ctx, tileData) {
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
