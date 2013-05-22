var fs = require('fs');
var xmlreader = require('xmlreader');

var fileName = process.argv[2];
if (!fileName) {
  console.log('Usage `node index.js <file.osm>`');
  return;
}

var fileContent = fs.readFileSync(fileName, 'utf8');

function Way(xml) {
  var i;
  var xmlNodes = xml.nd;
  var nodes = this.nodes = [];
  for (i = 0; i < xmlNodes.count(); i++) {
    nodes.push(parseInt(xmlNodes.at(i).attributes().ref, 10));
  }

  var tags = this.tags = {};
  var xmlTags = xml.tag;
  // Some ways that are used in relations only have sometimes no tags.
  if (xmlTags) {
    for (i = 0; i < xmlTags.count(); i++) {
      var tagAttr = xmlTags.at(i).attributes();
      tags[tagAttr.k] = tagAttr.v;
    }
  }
}

// The algorithms are based on the code found at:
//   http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/
var tileSize = 256;
var zoomZeroResolution = 40075016.685578483111282 / tileSize;

// The 20037508.342789241555641 corresponds roughly to 1/2 of the equator extend.
// As calculated from the radius of the earth: 2 * PI * 6378137 / 2
var equatorExtendHalf = 20037508.342789241555641;
var degreeToMeter = equatorExtendHalf / 180;


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
function convertLonLat2Meter(lon, lat) {
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

xmlreader.read(fileContent, function(err, res) {
  if (err) throw err;

  var xmlMain = res.osm;

  var i;
  var attr;
  var nodes = {};
  var xmlNodes = xmlMain.node;
  for (i = 0; i < xmlNodes.count(); i++) {
    attr = xmlNodes.at(i).attributes();
    nodes[attr.id] = convertLonLat2Meter(parseFloat(attr.lon), parseFloat(attr.lat));
  }

  var ways = {};

  var wayCache = {
    highway: [],
    landuse: [],
    natural: [],
    leisure: [],
    waterway: [],
    amenity: [],
    place: [],
    barrier: [],
    surface: [],
    building: []
  };

  var wayCacheKeys = Object.keys(wayCache);

  var xmlWays = xmlMain.way;
  for (i = 0; i < xmlWays.count(); i++) {
    var xmlNode = xmlWays.at(i);
    attr = xmlNode.attributes();

    var way = new Way(xmlNode);
    ways[attr.id] = way;

    for (var n = 0; n < wayCacheKeys.length; n++) {
      var key = wayCacheKeys[n];
      if (way.tags[key]) {
        wayCache[key].push(parseInt(attr.id, 10));
      }
    }
  }

  var highwayOrder = ['motorway',
    'motorway_link',
    'trunk',
    'trunk_link',
    'primary',
    'primary_link',
    'secondary',
    'secondary_link',
    'tertiary',
    'tertiary_link',
    'living_street',
    'pedestrian',
    'residential',
    'unclassified',
    'service',
    'track',
    'bus_guideway',
    'raceway',
    'road',
    'path',
    'footway',
    'cycleway',
    'bridleway',
    'steps',
    'proposed',
    'construction',
    'unclassified'
  ];

  // Sort the highways to render "big" streets first.

  wayCache.highway = wayCache.highway.sort(function(a, b) {
    function getOrderIndex(wayId) {
      var idx = highwayOrder.indexOf(ways[wayId].tags.highway);
      if (idx === -1) {
        return 999; // Make it the last item.
      } else {
        return idx;
      }
    }

    return getOrderIndex(b) - getOrderIndex(a);
  });

  // TODO: Handle relations here as well.

  var bounds = xmlMain.bounds.at(0).attributes();

  var min = convertLonLat2Meter(parseFloat(bounds.minlon), parseFloat(bounds.maxlat));
  var max = convertLonLat2Meter(parseFloat(bounds.maxlon), parseFloat(bounds.minlat));

  var obj = {
    bounds: {
      minlat: parseFloat(bounds.minlat),
      minlon: parseFloat(bounds.minlon),
      maxlat: parseFloat(bounds.maxlat),
      maxlon: parseFloat(bounds.maxlon),
      minX: min[0],
      minY: min[1],
      maxX: max[0],
      maxY: max[1]
    },
    cache: wayCache,
    nodes: nodes,
    ways: ways
  };

  fs.writeFileSync(fileName + '.json', JSON.stringify(obj, null, 2));
  fs.writeFileSync(fileName + '.js', 'var MAP_DATA = ' + JSON.stringify(obj, null, 2));
});

