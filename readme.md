# Ptolemy

Rendering OpenStreetMap data (offline) in the browser.

## About

This implements the minimal functionality to render some "raw" OpenStreetMap data (using the `osm` format) to a canvas by converting the `osm` data to `json` and then render it using a simple renderer (don't expect anything awesome at this point ;) ).

## Usage

The file `muenchen.osm` was created using:

```
wget -O muenchen.osm "http://api.openstreetmap.org/api/0.6/map?bbox=11.54,48.14,11.543,48.145"
```

Larger area:

```
wget -O muenchen2.osm "http://api.openstreetmap.org/api/0.6/map?bbox=11.56,48.13,11.59,48.145"
```

To get the map using the faster [Overpass](http://overpass-api.de/query_form.html) library, run from the previous linked page:

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

## Convert the map

To generate the `muenchen.osm.json` and `muenchen.osm.js` file, execute:

```
node index.js muenchen.osm
```

The `xxx.osm.json` file is then converted into a binary file using

```
node binary-converter.js muenchen.osm.json
```

which emits `muenchen.osm.json.binary`.

The index.html implements a simple rendererd that reads the binary format and then emits it.

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
