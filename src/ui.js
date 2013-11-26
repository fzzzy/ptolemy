function onMapsLoad() {
  // For now, just use a dummy map name.
  var name = 'DEFAULT_MAP';
  MapData.load('map.binary', name, function(error) {
    if (error) {
      alert('Failed to load map "map.binary": ' + error);
    } else {
      alert('Map loaded and available offline.');
      renderAvailableMaps();
    }
  })
}

function onRenderMap() {
  mapStore.getAll(function(maps) {
    if (maps.length == 0) {
      alert('No map loaded yet.');
    } else {
      var mapID = maps[0].id;
      var mapData = new MapData(mapID, function(error) {
        if (error) {
          console.error(error);
          return;
        }

        renderMapData(mapData)
      });
    }
  });
}