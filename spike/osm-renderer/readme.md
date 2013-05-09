# Readme

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
