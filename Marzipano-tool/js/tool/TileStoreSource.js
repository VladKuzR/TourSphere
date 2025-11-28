/**
 * TileStoreSource Class
 * Extracted from app5de6.js module 235 (lines 23373-23483)
 * Custom tile source for the Marzipano Tool
 */

"use strict";

var Marzipano = require("marzipano");
var DynamicAsset = Marzipano.DynamicAsset;
var cancelize = Marzipano.util.cancelize;

/**
 * TileStoreSource constructor
 * @param {Object} tileStore - The tile store containing tile data
 */
function TileStoreSource(tileStore) {
  this._tileStore = tileStore;
}

/**
 * Load a tile asset
 * @param {Object} stage - Stage object
 * @param {Object} tile - Tile object
 * @param {Function} done - Callback function
 */
TileStoreSource.prototype.loadAsset = function (stage, tile, done) {
  var self = this;

  return cancelize(function (cancelCallback) {
    var cancelled = false;
    var canvas = document.createElement("canvas");
    canvas.width = tile.width();
    canvas.height = tile.height();

    renderTileToCanvas(canvas, self._tileStore, tile);

    var asset = new DynamicAsset(canvas);
    done(null, tile, asset);

    function cancel() {
      cancelled = true;
    }

    return cancel;
  });
};

/**
 * Render a tile to canvas
 * @private
 */
function renderTileToCanvas(canvas, tileStore, tile) {
  var ctx = canvas.getContext("2d");

  // Tile rendering logic - fill with tile data from tileStore
  var getTileColor = function (tile) {
    var level = tile._level;
    if (level.numHorizontalTiles() === 1 && level.numVerticalTiles() === 1) {
      // Single tile - use face index
      var faceIndices = ["f", "r", "b", "l", "u", "d"];
      return 112 + 16 * faceIndices.indexOf(tile.face);
    }
    // Multi-tile - use position
    var color = 144 + (tile.x % 2) * 16 + (tile.y % 2) * 32;
    return color;
  };

  // Fill with default color
  var color = getTileColor(tile);
  ctx.fillStyle = "rgb(" + color + "," + color + "," + color + ")";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw actual tile if available
  tileStore.query(
    tile._level.z,
    tile.face,
    tile.x,
    tile.y,
    function (err, tileData) {
      if (!err && tileData) {
        var img = new Image();
        img.onload = function () {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = URL.createObjectURL(tileData);
      }
    }
  );
}

module.exports = TileStoreSource;
