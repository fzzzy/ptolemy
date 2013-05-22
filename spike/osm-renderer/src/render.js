// --- Actual rendering ---

// Adjust this based on current zoom level.
var LINE_WIDTH_ROOT = 1.5; 
var bigRoadWidth = LINE_WIDTH_ROOT * 10;

var ways = MAP_DATA.ways;
var nodes = MAP_DATA.nodes;

function drawArea(shape, fillShape) {
  ctx.beginPath();

  for (var i = 0; i < shape.length; i++) {
    var node = shape[i];

    // var x = node[0] - minlon;
    // var y = maxlat - node[1];
    var x = node[0];
    var y = node[1];

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

var wayMapping = [
  {
    name: 'landuse',
    fill: true,
    fillStyle: 'green'
  },
  {
    name: 'waterway',
    fill: true,
    strokeStyle: '#00899E',
    fillStyle: '#00899E',
    lineWidth: LINE_WIDTH_ROOT * 5,
  },
  {
    name: 'amenity',
    fill: true,
    fillStyle: 'rgb(244, 208, 207)'
  },
  {
    name: 'natural',
    fill: true,
    fillStyle: '#68B300'
  },
  {
    name: 'leisure',
    fill: true,
    fillStyle: '#68B300'
  },
  {
    name: 'surface',
    fill: false,
    strokeStyle: 'brown',
    lineWidth: LINE_WIDTH_ROOT * 1
  },
  {
    name: 'place',
    fill: true,
    fillStyle: 'burlywood'
  },
  {
    name: 'building',
    fill: true,
    fillStyle: 'burlywood'
  },
  {
    name: 'barrier',
    fill: true,
    fillStyle: 'burlywood'
  },
  {
    name: 'highway',
    fill: false,
    strokeStyle: 'orange',
    lineWidth: LINE_WIDTH_ROOT * 3
  },
];

function renderTile(x, y, zoomLevel, ctx) {
  ctx.save();

  // Figure out the boundary box of the tile to render.
  var tileBB = getTileBoundingBoxInMeter(x, y, zoomLevel);
  var pixelPerMeter = getPixelPerMeter(zoomLevel);

  ctx.scale(pixelPerMeter, pixelPerMeter);
  ctx.translate(-tileBB.minX, -tileBB.minY);

  console.log(tileBB);

  // Clip to the boundingBox of the tile on the canvas to prevent drawing outside
  // of the current tile.

  ctx.rect(tileBB.minX, tileBB.minY, tileBB.width, tileBB.height);
  ctx.clip();

  // Lookup the wayMapping from the mapData.
  var ways = MAP_DATA.tiles[zoomLevel + '/' + x + '/' + y];
  render(ways);  

  ctx.restore();
}

function render(ways) {
  console.time('render-start');

  // Rounded lines look cute :)
  ctx.lineCap = 'round';

  // Draw all the ways.
  for (var i = 0; i < wayMapping.length; i++) {
    var wayMap = wayMapping[i];
    var wayCache = ways[wayMap.name];
    var fillWay = wayMap.fill;

    assert(wayCache);

    ctx.lineWidth = wayMap.lineWidth;
    ctx.strokeStyle = wayMap.strokeStyle;
    ctx.fillStyle = wayMap.fillStyle;
    if (wayMap.name === 'waterway') {
      for (var n = 0; n < wayCache.length; n++) {
        var way = wayCache[n];
        drawArea(way.nodes, way.tags['waterway'] == 'riverbank');
      }  
    } else if (wayMap.name === 'highway') {

      var outlines = [
          'tertiary', 'tertiary_link', 'secondary', 'secondary_link', 
          'living_street', 'residential'
        ];

      ctx.strokeStyle = '#686523';
      ctx.lineWidth = bigRoadWidth * 1.1;

      // First loop is about painting all the outlines.
      for (var n = 0; n < wayCache.length; n++) {
        var way = wayCache[n];
        var type = way.tags.highway;

        if (outlines.indexOf(type) !== -1) {
          drawArea(way.nodes, false);  
        }
      }

      for (var n = 0; n < wayCache.length; n++) {
        var way = wayCache[n];
        var type = way.tags.highway;

        if (!setHighwayStyle(ctx, type)) {
          continue;
        }
        drawArea(way.nodes, false);
      }  
    } else {
      for (var n = 0; n < wayCache.length; n++) {
        var way = wayCache[n];
        drawArea(way.nodes, fillWay);
      }    
    }  
  }

  console.timeEnd('render-start');
}

function setHighwayStyle(ctx, type) {
  switch (type) {
    case 'unclassified':
    case 'cycleway':
    case 'elevator':
    case 'crossing':
      // Ignore these for now.
      return false;
      break;

    case 'motorway':
    case 'motorway_link':
    case 'trunk':
    case 'trunk_link':
      ctx.strokeStyle = '#FFA200';
      ctx.lineWidth =  bigRoadWidth;
      break;

    case 'tertiary':
    case 'tertiary_link':
    case 'secondary':
    case 'secondary_link':
      ctx.strokeStyle = '#F7EF0D';
      ctx.lineWidth =  bigRoadWidth;
      break;

    case 'living_street':
    case 'residential':
      ctx.strokeStyle = 'white';
      ctx.lineWidth = bigRoadWidth;
      break;

    case 'construction':
    case 'steps':
    case 'footway':
    case 'pedestrian':
    case 'path':
    case 'service':
      ctx.strokeStyle = 'white';
      ctx.lineWidth = bigRoadWidth * 0.3;
      break;

    case 'track':
      ctx.strokeStyle = 'white';
      ctx.lineWidth = bigRoadWidth * 0.3;
      break;

    default:
      console.log('unsupportd highway type:', type);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = bigRoadWidth;
      break;
  }
  return true;
}