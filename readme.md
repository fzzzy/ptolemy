# Ptolemy

Ptolemy makes it possible to render maps offline in the browser without downloading bitmap tiles and only with the help of HTML5. As the map is rendered in the browser directly, the required map data is small in size which allows to to store the map for offline use in the browser's offline storage (IndexDB). The project is open source and hosted on GitHub.

Please note: Ptolemy is a prototype, is in an early development stage and is still misses many features that one would expect from a map rendered (e.g. street labels). 

## About the code

This implements the minimal functionality to render some "raw" OpenStreetMap data (using the `osm` format) to a canvas by converting the `osm` data to `json` (using `data-osm-json.js`), then from from `osm.json` to a `binary` format (see blow). The map binary data is stored in the browser's IndexDB for offline usage. This data is then used to render the map in the browser.

## Usage

### Get the raw OpenStreetMap data

Let's create the `binary` file first. Let's grab a piece from Munich:

```
wget -O muenchen.osm "http://api.openstreetmap.org/api/0.6/map?bbox=11.54,48.14,11.543,48.145"
```

Larger area:

```
wget -O muenchen2.osm "http://api.openstreetmap.org/api/0.6/map?bbox=11.56,48.13,11.59,48.145"
```

To get the map using the faster Overpass API, run from [this page](http://overpass-api.de/query_form.html):

  (
    way(48.13,11.56,48.145,11.59);
  );
  (._;>;);
  out;

This queries for all ways in the bounding box and includes the required nodes as well (this is based on [this](http://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide#All_kind_of_objects) example).

A larger Munich area can be queries by running:

  (
    way(48.096,11.494,48.187,11.68);
  );
  (._;>;);
  out;

The area recorded is roughly

  http://www.openstreetmap.org/?lat=48.14229&lon=11.54297&zoom=13&layers=M

### Convert OpenStreetMap -> BinaryFormat

To generate the `map.binary` file, execute install the `node` dependencies by running:

```
$ npm install
```

Next, genrate the `osm.json` file:

```
$ node data-osm-json.js muenchen.osm
```

The new generated `xxx.osm.json` file is then converted into a `binary` file using

```
node data-json-binary.js muenchen.osm.json
```

which emits `map.binary`. Note that the example viewer assumes the file to be names `map.binary`.

### Loading and rendering the map in the browser

Some browsers (e.g. Googel Chrome) require to serve the data using a local development server. A local server can be started by running

```
$ node local-server.js
```

This will serve the files at [localhost:8888](http://localhost:8888). Point your browser to that URL and click the "Load Map" button on the top. Once you got a confirmation, that the map is loaded (might take a few seconds on mobile devices), you can render the map by clicking on "Render map data". To get an "interactive" map, you can use the [Leaflet](http://leafletjs.com/) library by clicking on the "ToggleLeafletMap" button.

## Binary Format

The format is 32bit aligned. `Int` stands for `Uint32` and `Flt` for `Float32`. All numbers are stored in LittleEndian format. All offsets are counted in bytes.

The FeatureIDs used are:

```
  waterA: 1,      // Riverbanks
  waterB: 2,      // River
  highwayA: 3,    // HighwayA is the biggest street, while HighwayD is a small street.
  highwayB: 4,
  highwayC: 5,
  highwayD: 6,
  natural: 7,
  building: 8,
  landuse: 9
```

The file format looks like this:

```
// Overall file structure
File =
  <Version:Int>
  <xRefOffset:Int>
  Boundary:
    <minLat:Flt>
    <maxLat:Flt>
    <minLon:Flt>
    <maxLon:Flt>
  {Tile}  // For all tiles
  <XRef>

Tile =
  <FeatureCount:Int> // Number of features stored in the tile
  {TileFeature}      // For all features of the tile

TileFeature =
  <FeaturID:Int>     // ID of the feature, see above.
  <EntryCount:Int>   // Number of entries for this feature
  {TileFeatureEntry}

TileFeatureEntry =
  <NodeCount:Int>    // Number of nodes
  {Nodes:Flt}        // All the coordinates of the nodes are stored as Floats.

// The xRef contains a list of all the tiles stored in the file and offset pointers to the locations in the file.
XRef =
  <TileCount:Int>  // Number of tiles stored in the file.
  {XRefTileEntry}  // For all tiles

XRefTileEntry =
  <TileZ:Int>
  <TileX:Int>
  <TileY:Int>
  <TileDataOffset:Int>
```
