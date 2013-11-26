// --- Handlers for UI buttons/dropdowns etc. ---
function onMapsRemove() {
  mapStore.remove(parseInt($('#maps').value, 10), function() {
    renderAvailableMaps();
  }, function(error) {
    console.error(error);
  });
}

function onMapsRemoveAll() {
  mapStore.clear();
  renderAvailableMaps();
}

function onMapsChange() {
  var mapsDom = $('#maps');
  var mapID = parseInt(mapsDom.value, 10);


  var mapData = new MapData(mapID, function(error) {
    if (error) {
      console.error(error);
      return;
    }

    renderMapData(mapData)
  })
}

function renderAvailableMaps() {
  var mapsDom = $('#maps');
  var selectedIndex = mapsDom.selectedIndex;

  mapStore.getAll(function(maps) {
    var html = '';
    maps.forEach(function(map) {
      html += '<option value="' + map.id + '">' + map.name + '</option>';
    })
    mapsDom.innerHTML = html;

    // Restore the previous selected map.
    mapsDom.selectedIndex = selectedIndex;
  });
}

function onMapsLoad() {
  var name = prompt('Name of map:');

  if (!name) return;

  var url = prompt('URL of map data:');

  if (!url) return;

  MapData.load(url, name, function(error) {
    if (error) {
      alert('Failed to load map: ' + error);
    } else {
      alert('Map loaded and available offline.');
      renderAvailableMaps();
    }
  })
}