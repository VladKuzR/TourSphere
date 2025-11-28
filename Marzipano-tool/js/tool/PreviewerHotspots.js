/**
 * PreviewerHotspots Class
 * Extracted from app5de6.js module 232 (lines 23058-23109)
 * Manages hotspots in the preview
 */

"use strict";

var ko = require("knockout-es5");
var PreviewerLinkHotspot = require("./PreviewerLinkHotspot");
var PreviewerInfoHotspot = require("./PreviewerInfoHotspot");

/**
 * PreviewerHotspots constructor
 * @param {Previewer} previewer - The previewer instance
 */
function PreviewerHotspots(previewer) {
  this.list = [];
  this._previewer = previewer;
  this._panorama = null;
  this._scene = null;
  this._hotspotChangeHandler = this._update.bind(this);
  ko.track(this);
}

/**
 * Use a specific scene for hotspot display
 * @param {Scene} scene - Marzipano scene
 * @param {Object} panorama - Panorama object
 */
PreviewerHotspots.prototype.useScene = function (scene, panorama) {
  // Remove old event listeners
  if (this._panorama) {
    this._panorama.removeEventListener(
      "linkHotspotAdded",
      this._hotspotChangeHandler
    );
    this._panorama.removeEventListener(
      "linkHotspotRemoved",
      this._hotspotChangeHandler
    );
    this._panorama.removeEventListener(
      "infoHotspotAdded",
      this._hotspotChangeHandler
    );
    this._panorama.removeEventListener(
      "infoHotspotRemoved",
      this._hotspotChangeHandler
    );
  }

  // Set new scene and panorama
  this._panorama = panorama;
  this._scene = scene;

  // Add new event listeners
  panorama.addEventListener("linkHotspotAdded", this._hotspotChangeHandler);
  panorama.addEventListener("linkHotspotRemoved", this._hotspotChangeHandler);
  panorama.addEventListener("infoHotspotAdded", this._hotspotChangeHandler);
  panorama.addEventListener("infoHotspotRemoved", this._hotspotChangeHandler);

  // Update hotspots
  this._hotspotChangeHandler();
};

/**
 * Update hotspot list when panorama hotspots change
 * @private
 */
PreviewerHotspots.prototype._update = function () {
  var self = this;

  // Interrupt autorotate on hotspot change
  this._previewer.interruptAutorotate();

  // Destroy old hotspot instances
  this.list.forEach(function (hotspot) {
    hotspot.destroy();
  });

  // Create link hotspot instances
  var linkHotspots = this._panorama.settings.linkHotspots.map(function (
    hotspotData
  ) {
    return new PreviewerLinkHotspot(
      hotspotData,
      self._panorama,
      self._scene,
      self._previewer
    );
  });

  // Create info hotspot instances
  var infoHotspots = this._panorama.settings.infoHotspots.map(function (
    hotspotData
  ) {
    return new PreviewerInfoHotspot(
      hotspotData,
      self._panorama,
      self._scene,
      self._previewer
    );
  });

  // Combine all hotspots
  this.list = [].concat(linkHotspots, infoHotspots);
};

module.exports = PreviewerHotspots;

