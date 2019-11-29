"use strict";
const geojsonVt = require("geojson-vt");
const vtPbf = require("vt-pbf");
const request = require("requestretry");
const zlib = require("zlib");

const url = process.env.PARK_API_URL || "https://api.parkendd.de/Ulm";
const maxZoom = parseInt(process.env.MAX_ZOOM) || 20;

const getTileIndex = (url, callback) => {
  request(
    {
      url: url,
      maxAttempts: 20,
      retryDelay: 30000,
      retryStrategy: (err, response) =>
        request.RetryStrategies.HTTPOrNetworkError(err, response) ||
        (response && 202 === response.statusCode)
    },
    function(err, res, body) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, geojsonVt(parkApiToGeoJson(body), { maxZoom: maxZoom }));
    }
  );
};

// i haven't been able to find a way to directly generate the vector tiles, so
// we take detour via geojson.
// if you know of a way to do it directly, let me know.
const parkApiToGeoJson = data => {
  const json = JSON.parse(data);

  const features = json.lots.map(lot => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lot.coords.lng, lot.coords.lat]
      },
      // lat/long is a little superfluous, given that it's in the geometry above, but not removing it keeps the code simpler
      properties: lot
    };
  });

  return {
    type: "FeatureCollection",
    features: features
  };
};

class ParkApiSource {
  constructor(uri, callback) {
    getTileIndex(url, (err, tileIndex) => {
      if (err) {
        callback(err);
        return;
      }
      this.tileIndex = tileIndex;
      callback(null, this);
    });
  }

  getTile(z, x, y, callback) {
    let tile = this.tileIndex.getTile(z, x, y);

    if (tile === null) {
      tile = { features: [] };
    }

    const data = Buffer.from(vtPbf.fromGeojsonVt({ parking: tile }));

    zlib.gzip(data, function(err, buffer) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, buffer, { "content-encoding": "gzip" });
    });
  }

  getInfo(callback) {
    callback(null, {
      format: "pbf",
      maxzoom: maxZoom,
      vector_layers: [
        {
          description: "Parking lots data retrieved from ParkApi",
          id: "parking"
        }
      ]
    });
  }
}

module.exports = ParkApiSource;

module.exports.registerProtocols = tilelive => {
  tilelive.protocols["hbparking:"] = ParkApiSource;
};
