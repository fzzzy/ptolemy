# Minimal-Readme

## About

This implements the minimal functionality to render some "raw" OpenStreetMap data (using the `osm` format) to a canvas by converting the `osm` data to `json` and then render it using a dump simple renderer (don't expect anything awesome at this point ;) ).

## Usage

The file `muenchen.osm` was created using:

```
wget -O muenchen.osm "http://api.openstreetmap.org/api/0.6/map?bbox=11.54,48.14,11.543,48.145"
```

The area recorded is roughly

  http://www.openstreetmap.org/?lat=48.14229&lon=11.54297&zoom=17&layers=M

To generate the `muenchen.osm.json` and `muenchen.osm.js` file, execute:

```
node index.js muenchen.osm
```

`index.html` implements a dump simple rendered reading the `muenchen.osm.js` data.
