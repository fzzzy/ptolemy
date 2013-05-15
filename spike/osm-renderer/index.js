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

xmlreader.read(fileContent, function(err, res) {
  if (err) throw err;

  var xmlMain = res.osm;

  var i;
  var attr;
  var nodes = {};
  var xmlNodes = xmlMain.node;
  for (i = 0; i < xmlNodes.count(); i++) {
    attr = xmlNodes.at(i).attributes();
    nodes[attr.id] = [parseFloat(attr.lon), parseFloat(attr.lat)];
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

  var obj = {
    bounds: {
      minlat: parseFloat(bounds.minlat),
      minlon: parseFloat(bounds.minlon),
      maxlat: parseFloat(bounds.maxlat),
      maxlon: parseFloat(bounds.maxlon)
    },
    cache: wayCache,
    nodes: nodes,
    ways: ways
  };

  fs.writeFileSync(fileName + '.json', JSON.stringify(obj, null, 2));
  fs.writeFileSync(fileName + '.js', 'var MAP_DATA = ' + JSON.stringify(obj, null, 2));
});

