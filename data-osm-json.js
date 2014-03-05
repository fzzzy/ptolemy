/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Converts an .osm file into a .json format.

var fs = require('fs');
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

// --- "Configuration" --------------------------------------------------------

// Specify here from which zoom level onwards a feature should be included.
var zoomFeatures = {
  waterA: 0,
  waterB: 0,
  highwayA: 0,
  highwayB: 13,
  highwayC: 14,
  highwayD: 14,
  landuse: 0,
  natural: 0,
  building: 15
};

// Adjust this function to include more/less ways for later rendering.
function includeWay(way) {
  var wayTagsToInclude = [
    'highway',
    'landuse',
    'natural',
    'leisure',
    'waterway',
    'amenity',
    'place',
    'barrier',
    'surface',
    'building'
  ];

  if ('highway' in way.tags) {
    var excludeWays = ['unclassified', 'cycleway', 'elevator', 'crossing'];
    return excludeWays.indexOf(way.tags.highway) == -1;
  }

  for (var i = 0; i < wayTagsToInclude.length; i++) {
    if (wayTagsToInclude[i] in way.tags) {
      return true;
    }
  }

  return false;
}

// -----------------------------------------------------------------------------

function getBoundingBoxFromNodes(nodes) {
  var minX = equatorExtend, minY = equatorExtend, maxX = 0, maxY = 0;

  for (var i = 0; i < nodes.length; i += 2) {
    var x = nodes[i];
    var y = nodes[i + 1];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY
  };
}

function appendArray(a, b) {
  a.push.apply(a, b);
}



function packageMapData(wayCache, currentZoom, minZoom) {
  var resData = {
    waterA: [],
    waterB: [],
    highwayA: [],
    highwayB: [],
    highwayC: [],
    highwayD: []
  };

  var natural = [];
  appendArray(natural, wayCache.leisure);
  appendArray(natural, wayCache.natural);

  var building = [];
  appendArray(building, wayCache.building);
  appendArray(building, wayCache.place);
  appendArray(building, wayCache.barrier);

  wayCache.highway.forEach(function(highway) {
    var type = highway.tags.highway;

    switch (type) {
      case 'motorway':
      case 'motorway_link':
      case 'trunk':
      case 'trunk_link':
        resData.highwayA.push(highway.nodes);
        break;

      case 'tertiary':
      case 'tertiary_link':
      case 'secondary':
      case 'secondary_link':
        resData.highwayB.push(highway.nodes);
        break;

      case 'living_street':
      case 'residential':
        resData.highwayC.push(highway.nodes);
        break;

      case 'construction':
      case 'steps':
      case 'footway':
      case 'pedestrian':
      case 'path':
      case 'service':
      case 'track':
        resData.highwayD.push(highway.nodes);
        break;
    }
  });

  wayCache.waterway.forEach(function(waterway) {
    var type = waterway.tags.waterway;
    if (type === 'riverbank') {
      resData.waterA.push(waterway.nodes);
    } else {
      resData.waterB.push(waterway.nodes);
    }
  });

  function getNodes(way) {
    return way.nodes;
  }

  resData.landuse = wayCache.landuse.map(getNodes);
  resData.natural = natural.map(getNodes);
  resData.building = building.map(getNodes);

  // Figure out which parts of the map to include in this zoom.
  var features = Object.keys(zoomFeatures);
  features.forEach(function(feature) {
    var startZoom = zoomFeatures[feature];

    var includeFeature = (startZoom <= minZoom && currentZoom === minZoom) ||
                          (startZoom === currentZoom);

    // Remove the feature again if should not be included.
    if (!includeFeature) {
      // TODO: Ugly to store the features on the object first and remove them
      //       later again.
      delete resData[feature];
    }
  });

  return resData;
}

console.log('Reading and parsing xml file...')

var nodes = {};
var ways = {};
var wayList = [];
var bounds = {};

// osm-read requires the file extension be xml or pbf
var renamed = false;
var newName;
if (/\.\S+$/.test(fileName)) {
  renamed = true;
  newName = fileName + ".xml";
  fs.renameSync(fileName, newName);
  fileName = newName;
}

require('osm-read').parse({
  filePath: fileName,
  error: console.log.bind(console),
  endDocument: function () {
    console.log('finished reading');

    if ("minlat" in bounds) {
      writeTileData();
    } else {
      console.error('Cound not find <bounds .../> entry in file. If you have downloaded the .osm file using Overpass, please add it manually.');
    }
  },
  bounds: function (_bounds) {
    bounds = _bounds;
  },
  node: function (node) {
    nodes[node.id] = getMeterFromLonLat(node.lon, node.lat);
  },
  way: function (way) {
    var tempWay = tempWay = {
      id: parseFloat(way.id, 10),
      nodes: [],
      tags: way.tags,
    };
    way.nodeRefs.forEach(function (nodeRef) {
      nodes[nodeRef].forEach(function (coord) {
        tempWay.nodes.push(coord);
      });
    });
    if (includeWay(tempWay)) {
      tempWay.boundingBox = getBoundingBoxFromNodes(tempWay.nodes);
      tempWay.wasPackaged = false;
      ways[tempWay.id] = tempWay;
      wayList.push(tempWay);
    }
  },
});

if (renamed) {
  fs.renameSync(fileName, fileName.replace(/\.xml$/, ""));
}

function writeTileData() {
  var highwayOrder = [
    'motorway',
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

  var min = getMeterFromLonLat(bounds.minlon, bounds.maxlat);
  var max = getMeterFromLonLat(bounds.maxlon, bounds.minlat);

  var tiles = {};

  var minZoom = 13;
  var maxZoom = 18;

  console.log('writeTileData: ' + JSON.stringify(bounds));

  // For now only create data within these zoom levels.
  for (var zoom = minZoom; zoom <= maxZoom; zoom++) {
    var tileMin = getTileFromMeter(min[0], min[1], zoom);
    var tileMax = getTileFromMeter(max[0], max[1], zoom);

    for (var x = tileMin[0]; x <= tileMax[0]  ; x++) {
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

        console.log('Look at zxy=(%d, %d, %d)', zoom, x, y);
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

        tiles[zoom + '/' + x + '/' + y] = packageMapData(wayCache, zoom, minZoom);
      }
    }
  }

  var obj = {
    bounds: {
      minlat: bounds.minlat,
      minlon: bounds.minlon,
      maxlat: bounds.maxlat,
      maxlon: bounds.maxlon,
      minX: min[0],
      minY: min[1],
      maxX: max[0],
      maxY: max[1]
    },
    tiles: tiles
  };

  fs.writeFileSync(fileName + '.json', JSON.stringify(obj, null, 2));
  fs.writeFileSync(fileName + '.js', 'var MAP_DATA = ' + JSON.stringify(obj, null, 2));
}
