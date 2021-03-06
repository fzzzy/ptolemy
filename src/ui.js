/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals MapData, mapStore, renderMapData */

'use strict';

function onMapsLoad() {
  // For now, just use a dummy map name.
  var name = 'DEFAULT_MAP';
  MapData.load('map.binary', name, function(error) {
    if (error) {
      alert('Failed to load map "map.binary": ' + error);
    } else {
      onRenderMap();
    }
  });
}

function onRenderMap() {
  mapStore.getAll(function(maps) {
    if (maps.length === 0) {
      // Load the map if it is not available yet.
      onMapsLoad();
    } else {
      // Hide the loading indicator.
      document.getElementById('loading').style.display = 'none';

      var mapID = maps[0].id;
      var mapData = new MapData(mapID, function(error) {
        if (error) {
          console.error(error);
          return;
        }

        renderMapData(mapData);
      });
    }
  });
}