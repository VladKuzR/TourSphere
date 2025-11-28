/**
 * Previewer Class
 * Extracted from app5de6.js module 231 (lines 22942-23057)
 * Manages the preview of panoramas in the Marzipano Tool
 */

"use strict";

var Marzipano = require("marzipano");
var Viewer = Marzipano.Viewer;
var CubeGeometry = Marzipano.CubeGeometry;
var RectilinearView = Marzipano.RectilinearView;
var TileStoreSource = require("./TileStoreSource");
var PreviewerHotspots = require("./PreviewerHotspots");
var eventEmitter = require("../util/eventEmitter");

var DEFAULT_LEVELS = [
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
  { tileSize: 512, size: 4096 },
  { tileSize: 512, size: 8192 },
];

/**
 * Previewer constructor
 * @param {HTMLElement} element - DOM element to attach viewer
 * @param {Object} panoramaCollection - Collection of panoramas
 */
function Previewer(element, panoramaCollection) {
  this._viewer = new Viewer(element);
  this._panorama = null;
  this._panoramaChangedHandler = this.updatePreview.bind(this);
  this.hotspots = new PreviewerHotspots(this);
}

eventEmitter(Previewer);

/**
 * Preview a panorama
 * @param {Object} panorama - Panorama object to preview
 */
Previewer.prototype.preview = function (panorama) {
  // Update viewer size
  setTimeout(this._viewer.updateSize.bind(this._viewer), 0);

  if (panorama && panorama === this._panorama) {
    // Same panorama - just update view
    var initialViewParams = panorama.settings.initialViewParameters;
    if (initialViewParams) {
      this._viewer.lookTo(initialViewParams, {
        transitionDuration: 0,
      });
    }
  } else {
    // Different panorama - switch scenes
    var oldPanorama = this._panorama;
    var newPanorama = panorama;

    if (oldPanorama) {
      oldPanorama.removeEventListener(
        "levelsSet",
        this._panoramaChangedHandler
      );
    }

    this._panorama = newPanorama;
    this._panoramaChangedHandler();

    if (newPanorama) {
      newPanorama.addEventListener("levelsSet", this._panoramaChangedHandler);
    }
  }
};

/**
 * Update the preview when panorama changes
 */
Previewer.prototype.updatePreview = function () {
  var panorama = this._panorama;

  // Destroy existing scenes
  this._viewer.destroyAllScenes();

  if (panorama) {
    // Get levels or use defaults
    var levels = panorama.levels || DEFAULT_LEVELS;

    // Create geometry
    var geometry = new CubeGeometry(levels);

    // Create source
    var source = new TileStoreSource(panorama.tileStore);

    // Get face size
    var faceSize = panorama.faceSize || levels[levels.length - 1].size;

    // Create view limiter
    var limiter = RectilinearView.limit.traditional(
      faceSize,
      (120 * Math.PI) / 180
    );

    // Create view with initial parameters
    var view = new RectilinearView(
      panorama.settings.initialViewParameters,
      limiter
    );

    // Create scene
    var scene = this._viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
    });

    // Setup hotspots for this scene
    this.hotspots.useScene(scene, panorama);

    // Switch to the scene
    scene.switchTo({
      transitionDuration: 0,
    });
  }
};

/**
 * Get current view parameters
 * @returns {Object|null} Current view parameters (yaw, pitch, fov)
 */
Previewer.prototype.currentViewParams = function () {
  var view = this._viewer.view();
  if (view) {
    return {
      yaw: view.yaw(),
      pitch: view.pitch(),
      fov: view.fov(),
    };
  }
  return null;
};

/**
 * Set mouse control to drag mode
 */
Previewer.prototype.setDragMode = function () {
  this._viewer.controls().disableMethod("mouseViewQtvr");
  this._viewer.controls().enableMethod("mouseViewDrag");
};

/**
 * Set mouse control to QTVR mode
 */
Previewer.prototype.setQtvrMode = function () {
  this._viewer.controls().disableMethod("mouseViewDrag");
  this._viewer.controls().enableMethod("mouseViewQtvr");
};

/**
 * Enable or disable autorotate
 * @param {boolean} enabled - Whether to enable autorotate
 */
Previewer.prototype.setAutorotate = function (enabled) {
  if (enabled) {
    var autorotateFunction = Marzipano.autorotate({
      yawSpeed: 0.1,
      targetPitch: 0,
      targetFov: Math.PI / 2,
    });
    this._viewer.setIdleMovement(3000, autorotateFunction);
    this._viewer.startMovement(autorotateFunction);
  } else {
    this._viewer.setIdleMovement(Infinity);
    this._viewer.stopMovement();
  }
};

/**
 * Interrupt autorotate (e.g., when user interacts)
 */
Previewer.prototype.interruptAutorotate = function () {
  this._viewer.breakIdleMovement();
};

module.exports = Previewer;

