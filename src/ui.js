function onMapsLoad() {
  // For now, just use a dummy map name.
  var name = 'DEFAULT_MAP';
  MapData.load('map.binary', name, function(error) {
    if (error) {
      alert('Failed to load map "map.binary": ' + error);
    } else {
      // alert('Map loaded and available offline.');
    }
  })
}

function onRenderMap() {
  mapStore.getAll(function(maps) {
    if (maps.length == 0) {
      // alert('No map loaded yet.');
      onMapsLoad();
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

function updateMaps() {
  $('#leafletMap').style.display = USE_LEAFLET_MAP ? 'block' : 'none';
  $('#canvas').style.display = !USE_LEAFLET_MAP ? 'block' : 'none';
}

function onToggleLeafletMap(value) {
  USE_LEAFLET_MAP = value === undefined ? !USE_LEAFLET_MAP : value;
  updateMaps();
  onRenderMap();
}