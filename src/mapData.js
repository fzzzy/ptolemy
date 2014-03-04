/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals IDBStore, getMeterFromLonLat, getTileFromMeter, readTileFeatures,
    features, getBinaryTileFile, tiles:true */

'use strict';

var mapStore = null;

function initMapStore(callback) {
  mapStore = new IDBStore({
    storeName: 'maps',
    keyPath: 'id',
    autoIncrement: true,
    onStoreReady: callback
  });
}

function clearMapStore(callback) {
  if (mapStore) {
    mapStore.getAll(function(maps) {
      if (maps.length !== 0) {
        var mapID = maps[0].id;

        var tileStore = new IDBStore({
          storeName: 'tiles-' + mapID,
          keyPath: 'id',
          onStoreReady: function () {
            tileStore.clear();
            mapStore.clear();
            callback();
          }
        });
      }
    });
  }
}

function MapData(id, callback) {
  this.id = id;
  this.tileCache = {};

  var self = this;
  mapStore.get(id, function(res) {
    if (res === null) {
      callback('Map with given ID not found: ' + id);
      return;
    }

    self.bounds = res.bounds;
    self.tileStore = new IDBStore({
      storeName: 'tiles-' + id,
      keyPath: 'id',
      onStoreReady: onTileStoreReady,
      onError: callback
    });

    function onTileStoreReady() {
      callback();
    }
  }, function(error) {
    callback(error);
  });
}

MapData.prototype.getTileBounds = function(zoomLevel) {
  var min = getMeterFromLonLat(this.bounds.minlon, this.bounds.maxlat);
  var max = getMeterFromLonLat(this.bounds.maxlon, this.bounds.minlat);

  return {
    min: getTileFromMeter(min[0], min[1], zoomLevel),
    max: getTileFromMeter(max[0], max[1], zoomLevel)
  };
};

MapData.prototype.getTile = function(name, callback) {
  if (this.tileCache[name]) {
    callback(null, this.tileCache[name]);
    return;
  }

  var self = this;
  this.tileStore.get(name, function(entry) {
    var tileFeatures;

    if (entry) {
      tileFeatures = readTileFeatures(entry.data);
    } else {
      tileFeatures = null;
    }

    self.tileCache[name] = tileFeatures;

    callback(null, tileFeatures);
  }, callback);
};

MapData.prototype.collectTileData = function(x, y, zoomLevel, callback) {
  var tileData = {};
  features.forEach(function(feature) {
    tileData[feature] = [];
  });

  var self = this;
  function processNextZoomLevel() {
    if (zoomLevel === -1) {
      callback(null, tileData);
      return;
    }

    var tileName = zoomLevel + '/' + x + '/' + y;
    self.getTile(tileName, function(error, data) {
      if (error) {
        callback(error);
        return;
      }

      if (!data) {
        // Make the processing stop if there is no
        zoomLevel = -1;
      } else {
        features.forEach(function(feature) {
          var arr = tileData[feature];
          arr.push.apply(arr, data[feature]);
        });

        zoomLevel -= 1;
        x = Math.floor(x / 2);
        y = Math.floor(y / 2);
      }

      processNextZoomLevel();
    });
  }

  processNextZoomLevel();
};

MapData.load = function(url, mapName, callback) {
  // Load the actual map file and parse the xRef as well as the bounds.
  getBinaryTileFile(url, function(error, mapData) {
    if (error) {
      return callback(error);
    }
    mapStore.put({
      name: mapName,
      url:  url,
      bounds: mapData.bounds
    }, function(newMapID) {
      console.log('Created new map entry:', newMapID);

      // Create a new store that will hold the tiles of the map.
      tiles = new IDBStore({
        storeName: 'tiles-' + newMapID,
        keyPath: 'id',
        onStoreReady: onTileStoreReady,
        onError: callback
      });

      function onTileStoreReady() {
        // Prepare all tiles to be inserted here before adding them to the
        // store using one batch command.
        var newTiles = [];

        var tileInfos = mapData.tileInfos;
        for (var i = 0; i < tileInfos.length; i++) {
          var tile = tileInfos[i];
          var offsetStart = tile.offset;
          var offsetEnd;

          if (i !== tileInfos.length - 1) {
            offsetEnd = tileInfos[i + 1].offset;
          }

          var tileData = mapData.response.slice(offsetStart, offsetEnd);

          newTiles.push({
            type: 'put',
            value: {
              id: tile.name,
              data: tileData
            }
          });
        }

        tiles.batch(newTiles, function() {
          callback();
        }, function(error) {
          callback(error);
        });
      }
    }, function(error) {
      callback(error);
    });
  });
};
