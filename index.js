"use strict"
const geojsonVt = require('geojson-vt');
const vtPbf = require('vt-pbf');
const request = require('requestretry');
const zlib = require('zlib');

const getTileIndex = (url, callback) => {
  request({
    url: url,
    maxAttempts: 20,
    retryDelay: 30000,
    retryStrategy: (err, response) => (request.RetryStrategies.HTTPOrNetworkError(err, response) || (response && 202 === response.statusCode))
  }, function (err, res, body){
    if (err){
      callback(err);
      return;
    }
    callback(null, geojsonVt(JSON.parse(body), {maxZoom: 20})); //TODO: this should be configurable)
  })
}

class GeoJSONSource {
  constructor(uri, callback){
    getTileIndex("http://data.hslhrt.opendata.arcgis.com/datasets/42045a8235114dc8bf417df0a1a89edd_0.geojson", (err, tileIndex) => {
      if (err){
        callback(err);
        return;
      }
      this.tileIndex = tileIndex;
      callback(null, this);
    })
  };

  getTile(z, x, y, callback){
    let tile = this.tileIndex.getTile(z, x, y)

    if (tile === null){
      tile = {features: []}
    }

    zlib.gzip(vtPbf.fromGeojsonVt({'ticket-sales': tile}), function (err, buffer) {
      if (err){
        callback(err);
        return;
      }

      callback(null, buffer, {"content-encoding": "gzip"})
    })
  }

  getInfo(callback){
    callback(null, {
      format: "pbf",
      maxzoom: 20,
      vector_layers: [{
        description: "",
        id: "ticket-sales"
      }]
    })
  }
}

module.exports = GeoJSONSource

module.exports.registerProtocols = (tilelive) => {
  tilelive.protocols['hslticketsales:'] = GeoJSONSource
}
