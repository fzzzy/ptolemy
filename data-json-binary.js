// Converts an .osm.json file into a .osm.json.binary format.
// The output file has the ending map.binary

var fs = require('fs');

var fileName = process.argv[2];
if (!fileName) {
  console.log('Usage `node binary.js <file.osm.json>`');
  return;
}

var data = JSON.parse(fs.readFileSync(fileName, 'utf8'));

var bounds = data.bounds;
var tiles = data.tiles;
var tileNames = Object.keys(tiles);

var featureMap = {
  waterA: 1,
  waterB: 2,
  highwayA: 3,
  highwayB: 4,
  highwayC: 5,
  highwayD: 6,
  natural: 7,
  building: 8,
  landuse: 9
}

function getBinaryFromFeature(feature, featureData) {
  var size = 0; // FeatureType + FeatureDataCount

  featureData.forEach(function(data) {
    size += (data.length + 1) * 4;
  });

  var buf = new Buffer(size + 8);
  buf.writeUInt32LE(featureMap[feature], 0);
  buf.writeUInt32LE(featureData.length, 4);

  var offset = 8;
  featureData.forEach(function(data) {
    buf.writeUInt32LE(data.length, offset);
    offset += 4;

    data.forEach(function(entry) {
      buf.writeFloatLE(entry, offset);
      offset += 4;
    });
  });

  return buf;
}

function getBinaryFromTileData(tileData) {
  var features = Object.keys(tileData);

  var featureBuffers = features.map(function(featureName) {
    return getBinaryFromFeature(featureName, tileData[featureName]);
  });

  var bufHead = new Buffer(4);
  bufHead.writeUInt32LE(features.length, 0);
  featureBuffers.splice(0, 0, bufHead);

  return Buffer.concat(featureBuffers);
}

function getXRefBuffer() {
  var buf = new Buffer(tileNames.length * 4 * 4 + 4);
  buf.writeUInt32LE(tileNames.length, 0);

  var offset = 4;
  tileNames.forEach(function(name) {
    var splits = name.split('/').map(function(num) {
      return parseInt(num, 10);
    });

    var z = splits[0];
    var x = splits[1];
    var y = splits[2];

    buf.writeUInt32LE(z, offset);
    buf.writeUInt32LE(x, offset + 4);
    buf.writeUInt32LE(y, offset + 8);
    buf.writeUInt32LE(tileOffsets[name], offset + 12);
    offset += 16;
  });

  return buf;
}

var HEADER_OFFSET = 4 * 6;
var offset = HEADER_OFFSET;

var tileOffsets = {};

// Map all the tiles.
var tileBuffers = tileNames.map(function(tileName) {
  tileOffsets[tileName] = offset;
  var tileData = tiles[tileName];

  var buf = getBinaryFromTileData(tileData);;
  offset += buf.length;
  return buf;
});

// Build the header.
var headBuffer = new Buffer(HEADER_OFFSET);
headBuffer.writeUInt32LE(1, 0); // VERSION
headBuffer.writeUInt32LE(offset, 4); // Offset to XRef

headBuffer.writeFloatLE(bounds.minlat, 8);
headBuffer.writeFloatLE(bounds.maxlat, 12);
headBuffer.writeFloatLE(bounds.minlon, 16);
headBuffer.writeFloatLE(bounds.maxlon, 20);

// Build the xRef.
var xRefBuffer = getXRefBuffer();

// Assemble all small buffers into one big buffer.
tileBuffers.splice(0, 0, headBuffer);
tileBuffers.push(xRefBuffer);

var totalBuffer = Buffer.concat(tileBuffers);

fs.writeFileSync('map.binary', totalBuffer, 'binary');

