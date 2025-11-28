/**
 * Panoramas Collection Class
 * Extracted from app5de6.js module 217 (lines 21781-21982)
 * Manages collection of panoramas
 */

"use strict";

var find = require("lodash/collection/find");
var values = require("lodash/object/values");
var TileStore = require("./TileStore");
var processPanorama = require("./processPanorama");
var ProcessingState = require("./processingState/ProcessingState");
var eventEmitter = require("./util/eventEmitter");
var oneShotEdit = require("./oneShotEdit");
var ko = require("knockout-es5");
var errorToObject = require("./util/errorToObject");
var slug = require("./util/slug");

/**
 * Panoramas constructor
 * Collection of panoramas
 */
function Panoramas() {
  this.list = [];
  this.selected = null;
  this._processing = null;
  ko.track(this);
}

/**
 * Panorama constructor
 * Single panorama instance
 */
function Panorama(panoramasList, type, name, fileData, width, height) {
  this.panoramasList = panoramasList;
  this.type = type;
  this.name = name;
  this.fileData = fileData;
  this.width = width;
  this.height = height;

  this.processingState = new ProcessingState("panorama", {
    type: type,
    name: name,
    width: width,
    height: height,
  });

  this.tileStore = new TileStore();
  this.cubeMapPreview = null;
  this.faceSize = null;
  this.levels = null;
  this.cubeMapPreviewSize = null;

  this.settings = {
    initialViewParameters: {
      pitch: 0,
      yaw: 0,
      fov: Math.PI / 2,
    },
    linkHotspots: [],
    infoHotspots: [],
  };

  ko.track(this);
  ko.track(this.settings.linkHotspots);
}

/**
 * Add a new panorama to the collection
 */
Panoramas.prototype.push = function (type, name, fileData, width, height) {
  var panorama = new Panorama(this, type, name, fileData, width, height);
  this.list.push(panorama);

  var self = this;
  panorama.processingState.addEventListener("changed", function () {
    self.emit("changed");
  });

  this.emit("changed");
  this._handleListChange();

  // Select if nothing else is selected
  if (!this.selected) {
    panorama.select();
  }
};

/**
 * Handle processing queue
 * @private
 */
Panoramas.prototype._handleListChange = function () {
  if (!this._processing) {
    // Find next queued panorama
    var queuedPanorama = find(this.list, function (pano) {
      return pano.processingState.isQueued();
    });

    if (queuedPanorama) {
      queuedPanorama.processingState.started();

      var self = this;
      var cancelFunction = processPanorama(queuedPanorama, function (error) {
        if (error && error.message === "cancelled") {
          queuedPanorama.processingState.cancelled();
        } else if (error) {
          queuedPanorama.processingState.failed(errorToObject(error));
          self.emit("processingFailed", queuedPanorama);
        } else {
          queuedPanorama.processingState.successful();
        }

        self._processing = null;
        self._handleListChange();
      });

      this._processing = {
        panorama: queuedPanorama,
        cancel: cancelFunction,
      };
    }
  }
};

/**
 * Remove a panorama from the collection
 * @private
 */
Panoramas.prototype._remove = function (panorama) {
  if (
    (panorama.processingState.isSuccessful() ||
      panorama.processingState.isStarted()) &&
    !window.confirm("Are you sure you want to remove this panorama?")
  ) {
    return;
  }

  var index = this.list.indexOf(panorama);
  if (index < 0) return;

  this.list.splice(index, 1);

  if (this._processing && this._processing.panorama === panorama) {
    this._processing.cancel();
  }

  this.emit("changed");
  this._handleListChange();

  if (this.selected === panorama) {
    if (this.list.length > 0) {
      this.list[0].select();
    } else {
      this.selected = null;
    }
  }
};

/**
 * Set selected panorama
 * @private
 */
Panoramas.prototype._setSelected = function (panorama) {
  this.selected = panorama;
  this.emit("selectedPanoramaChanged", panorama);
};

eventEmitter(Panoramas);
eventEmitter(Panorama);

/**
 * Add a tile to the panorama
 */
Panorama.prototype.addTile = function (level, face, x, y, blob) {
  this.tileStore.put(level, face, x, y, blob);
};

/**
 * Set cube map preview image
 */
Panorama.prototype.setCubeMapPreview = function (blob) {
  if (this.cubeMapPreview) {
    throw new Error("CubeMapPreview already set");
  }
  if (!this.cubeMapPreviewSize) {
    throw new Error("Cannot set CubeMapPreview on Panorama without cubeMapPreviewSize");
  }
  this.cubeMapPreview = blob;
};

/**
 * Set panorama levels
 */
Panorama.prototype.setLevels = function (levels, options) {
  options = options || {};

  if (this.levels) {
    throw new Error("Levels already set");
  }

  var levelsCopy = levels.slice();

  if (options.cubeMapPreviewSize) {
    levelsCopy.unshift({
      tileSize: options.cubeMapPreviewSize,
      size: options.cubeMapPreviewSize,
      fallbackOnly: true,
    });
  }

  this.levels = levelsCopy;
  this.cubeMapPreviewSize = options.cubeMapPreviewSize;

  var maxSize = levelsCopy[levelsCopy.length - 1].size;
  this.faceSize = options.faceSize ? Math.min(options.faceSize, maxSize) : maxSize;

  this.emit("levelsSet", null);
};

/**
 * Edit panorama name
 */
Panorama.prototype.edit = function () {
  var id = this.uniqueId();
  var nameElement = document.querySelector('[data-panorama-id="' + id + '"] .name');
  oneShotEdit(nameElement);
};

/**
 * Remove this panorama
 */
Panorama.prototype.remove = function (event, clickEvent) {
  this.panoramasList._remove(this);
  clickEvent.stopPropagation();
};

/**
 * Check if panorama is removed
 */
Panorama.prototype.removed = function () {
  return this.panoramasList.list.indexOf(this) < 0;
};

/**
 * Select this panorama
 */
Panorama.prototype.select = function () {
  this.panoramasList._setSelected(this);
};

/**
 * Check if this panorama is selected
 */
Panorama.prototype.isSelected = function () {
  return this.panoramasList.selected === this;
};

/**
 * Get unique ID for this panorama
 */
Panorama.prototype.uniqueId = function () {
  var index = this.panoramasList.list.indexOf(this);
  return index >= 0 ? index + "-" + slug(this.name) : slug(this.name);
};

/**
 * Get files associated with this panorama
 */
Panorama.prototype.files = function () {
  if (this.type === "equirectangular") {
    return [this.fileData];
  } else if (this.type === "cube") {
    return values(this.fileData);
  }
};

/**
 * Add a link hotspot
 */
Panorama.prototype.addLinkHotspot = function (hotspot) {
  this.settings.linkHotspots.push(hotspot);
  this.emit("linkHotspotAdded", hotspot);
};

/**
 * Remove a link hotspot
 */
Panorama.prototype.removeLinkHotspot = function (hotspot) {
  var index = this.settings.linkHotspots.indexOf(hotspot);
  this.settings.linkHotspots.splice(index, 1);
  this.emit("linkHotspotRemoved", hotspot);
};

/**
 * Add an info hotspot
 */
Panorama.prototype.addInfoHotspot = function (hotspot) {
  this.settings.infoHotspots.push(hotspot);
  this.emit("infoHotspotAdded", hotspot);
};

/**
 * Remove an info hotspot
 */
Panorama.prototype.removeInfoHotspot = function (hotspot) {
  var index = this.settings.infoHotspots.indexOf(hotspot);
  this.settings.infoHotspots.splice(index, 1);
  this.emit("infoHotspotRemoved", hotspot);
};

module.exports = Panoramas;

