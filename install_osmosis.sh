curl -o osmosis.zip http://bretth.dev.openstreetmap.org/osmosis-build/osmosis-0.40.1.zip && \
  unzip osmosis.zip && \
  rm osmosis.zip && \
  chmod 755 osmosis-0.40.1/bin/osmosis && \
  cd osmosis-0.40.1/lib/default/ && \
  curl -O https://mapsforge.googlecode.com/files/mapsforge-map-writer-0.3.0-jar-with-dependencies.jar && \
  cd ../../config && \
  echo "org.mapsforge.map.writer.osmosis.MapFileWriterPluginLoader" > osmosis-plugins.conf

# example command:
# wget -O muenchen2.osm "http://api.openstreetmap.org/api/0.6/map?bbox=11.56,48.13,11.59,48.145"
# osmosis-0.40.1/bin/osmosis --read-xml file=muenchen2.osm --mapfile-writer file=mymap.map bbox=11.56,48.13,11.59,48.145
