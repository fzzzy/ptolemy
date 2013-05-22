var fs = require('fs');
var xmlreader = require('xmlreader');

var tiles = require('./src/tiles');
var getMeterFromLonLat = tiles.getMeterFromLonLat;
var equatorExtend = tiles.equatorExtend;
var getTileFromMeter = tiles.getTileFromMeter;
var getTileBoundingBoxInMeter = tiles.getTileBoundingBoxInMeter;
var intersect = tiles.intersect;

var fileName = process.argv[2];
if (!fileName) {
  console.log('Usage `node index.js <file.osm>`');
  return;
}

var fileContent = fs.readFileSync(fileName, 'utf8');

function getBoundingBoxFromNodes(nodes) {
  var minX = equatorExtend, minY = equatorExtend, maxX = 0, maxY = 0;

  for (var i = 0; i < nodes.length; i++) {
    var x = nodes[i][0];
    var y = nodes[i][1];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    return {
      minX: minX, 
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }
}

function Way(xml, osmNodes) {
  var i;
  var xmlNodes = xml.nd;
  var nodes = this.nodes = [];
  for (i = 0; i < xmlNodes.count(); i++) {
    var nodeId = parseInt(xmlNodes.at(i).attributes().ref, 10);
    nodes.push(osmNodes[nodeId]);
  }

  this.boundingBox = getBoundingBoxFromNodes(nodes);

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

xmlreader.read(fileContent, function(err, res) {
  if (err) throw err;

  var xmlMain = res.osm;

  var i;
  var attr;
  var nodes = {};
  var xmlNodes = xmlMain.node;
  for (i = 0; i < xmlNodes.count(); i++) {
    attr = xmlNodes.at(i).attributes();
    nodes[attr.id] = getMeterFromLonLat(parseFloat(attr.lon), parseFloat(attr.lat));
  }

  var ways = {};
  var wayList = [];


  var xmlWays = xmlMain.way;
  for (i = 0; i < xmlWays.count(); i++) {
    var xmlNode = xmlWays.at(i);
    attr = xmlNode.attributes();

    var way = new Way(xmlNode, nodes);

    ways[attr.id] = way;
    wayList.push(way);
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

  // TODO: Handle relations here as well.

  var bounds = xmlMain.bounds.at(0).attributes();

  var min = getMeterFromLonLat(parseFloat(bounds.minlon), parseFloat(bounds.maxlat));
  var max = getMeterFromLonLat(parseFloat(bounds.maxlon), parseFloat(bounds.minlat));

  var tiles = {};

  // For now only create data within these zoom levels.
  for (var zoom = 14; zoom <= 17; zoom++) {
    var tileMin = getTileFromMeter(min[0], min[1], zoom);
    var tileMax = getTileFromMeter(max[0], max[1], zoom);

    for (var x = tileMin[0]; x <= tileMax[0]; x++) {
      for (var y = tileMin[1]; y <= tileMax[1]; y++) {
        var tileBoundingBox = getTileBoundingBoxInMeter(x, y, zoom);

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

        console.log('Look at xyz=(%d, %d, %d)', x, y, zoom);
        console.log(tileBoundingBox);

        var wayCacheKeys = Object.keys(wayCache);

        for (var i = 0; i < wayList.length; i++) {
          var way = wayList[i];
          if (!intersect(way.boundingBox, tileBoundingBox)) {
            continue;
          }

          for (var n = 0; n < wayCacheKeys.length; n++) {
            var key = wayCacheKeys[n];
            if (way.tags[key]) {
              wayCache[key].push(way);
            }
          }

          // Sort the highways to render "big" streets first.
          wayCache.highway = wayCache.highway.sort(function(a, b) {
            function getOrderIndex(wayObj) {
              var idx = highwayOrder.indexOf(wayObj.tags.highway);
              if (idx === -1) {
                return 999; // Make it the last item.
              } else {
                return idx;
              }
            }

            return getOrderIndex(b) - getOrderIndex(a);
          });
        }

        tiles[zoom + '/' + x + '/' + y] = wayCache;
      }
    }
  }

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
    tiles: tiles
  };

  fs.writeFileSync(fileName + '.json', JSON.stringify(obj, null, 2));
  fs.writeFileSync(fileName + '.js', 'var MAP_DATA = ' + JSON.stringify(obj, null, 2));
});

