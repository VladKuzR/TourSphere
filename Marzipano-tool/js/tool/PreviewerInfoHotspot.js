/**
 * PreviewerInfoHotspot Class
 * Extracted from app5de6.js module 233 (lines 23110-23244)
 * Manages info hotspots in the preview
 */

"use strict";

var ko = require("knockout-es5");
var oneShotEditContentEditable = require("../oneShotEditContentEditable");

/**
 * PreviewerInfoHotspot constructor
 * @param {Object} hotspot - Hotspot data
 * @param {Object} panorama - Panorama object
 * @param {Scene} scene - Marzipano scene
 * @param {Previewer} previewer - Previewer instance
 */
function PreviewerInfoHotspot(hotspot, panorama, scene, previewer) {
  this._hotspot = hotspot;
  this._panorama = panorama;
  this._scene = scene;
  this._previewer = previewer;
  this._view = scene.view();

  // Position properties
  this.left = null;
  this.top = null;
  this.visible = false;

  // Setup position tracking
  this._updateTransform();
  this._positionChangeHandler = this._updateTransform.bind(this);
  this._view.addEventListener("change", this._positionChangeHandler);
  this._hotspot.addEventListener("coordinatesChanged", this._positionChangeHandler);

  // Drag state
  this.dragging = false;
  this._mouseUpHandler = this._stopDrag.bind(this);
  window.addEventListener("mouseup", this._mouseUpHandler);
  this._mouseMoveHandler = this._drag.bind(this);
  window.addEventListener("mousemove", this._mouseMoveHandler);

  // Edit state
  this.editingTitle = false;
  this.editingText = false;

  ko.track(this);
}

/**
 * Cleanup when destroying hotspot
 */
PreviewerInfoHotspot.prototype.destroy = function () {
  this._view.removeEventListener("change", this._positionChangeHandler);
  this._hotspot.removeEventListener("coordinatesChanged", this._positionChangeHandler);
  window.removeEventListener("mouseup", this._mouseUpHandler);
  window.removeEventListener("mousemove", this._mouseMoveHandler);
  this.left = null;
  this.top = null;
  this.visible = null;
  this.targetSelectorVisible = null;
};

/**
 * Update hotspot position on screen
 * @private
 */
PreviewerInfoHotspot.prototype._updateTransform = function () {
  var screenPosition = this._view.coordinatesToScreen({
    yaw: this._hotspot.yaw,
    pitch: this._hotspot.pitch,
  });

  if (screenPosition) {
    this.left = screenPosition.x + "px";
    this.top = screenPosition.y + "px";
    this.visible = true;
  } else {
    this.visible = false;
  }
};

/**
 * Start editing hotspot title
 */
PreviewerInfoHotspot.prototype.editTitle = function () {
  var self = this;
  this.editingTitle = true;
  var titleElement = document.querySelector(".info-hotspot.editingTitle .title");
  oneShotEditContentEditable(titleElement, function () {
    self.editingTitle = false;
  });
};

/**
 * Finish editing title
 */
PreviewerInfoHotspot.prototype.finishEditTitle = function () {
  if (this.editingTitle) {
    document.querySelector(".info-hotspot.editingTitle .title").blur();
  }
};

/**
 * Start editing hotspot text
 */
PreviewerInfoHotspot.prototype.editText = function () {
  var self = this;
  this.editingText = true;
  var textElement = document.querySelector(".info-hotspot.editingText .text");
  oneShotEditContentEditable(textElement, function () {
    self.editingText = false;
  });
};

/**
 * Finish editing text
 */
PreviewerInfoHotspot.prototype.finishEditText = function () {
  if (this.editingText) {
    var element = document.querySelector(".info-hotspot.editingText .text");
    element.blur();
  }
};

/**
 * Check if hotspot is unchanged
 */
PreviewerInfoHotspot.prototype.isUnchanged = function () {
  return this._hotspot.isUnchanged();
};

/**
 * Start dragging hotspot
 */
PreviewerInfoHotspot.prototype.startDrag = function (event, mouseEvent) {
  this._previewer.interruptAutorotate();
  this.dragging = mouseEvent;
};

/**
 * Click handler
 */
PreviewerInfoHotspot.prototype.click = function () {
  if (this._hotspot.target) {
    this._hotspot.target.select();
  }
};

/**
 * Remove hotspot
 */
PreviewerInfoHotspot.prototype.remove = function () {
  this._previewer.interruptAutorotate();
  if (window.confirm("Delete this hotspot?")) {
    this._panorama.removeInfoHotspot(this._hotspot);
  }
};

/**
 * Stop dragging
 * @private
 */
PreviewerInfoHotspot.prototype._stopDrag = function () {
  this.dragging = false;
};

/**
 * Interrupt autorotate
 */
PreviewerInfoHotspot.prototype.interruptAutorotate = function () {
  this._previewer.interruptAutorotate();
  return true;
};

/**
 * Handle drag movement
 * @private
 */
PreviewerInfoHotspot.prototype._drag = function (event) {
  if (this.dragging) {
    this._previewer.interruptAutorotate();

    var currentScreenPos = this._view.coordinatesToScreen({
      yaw: this._hotspot.yaw,
      pitch: this._hotspot.pitch,
    });

    var deltaX = event.clientX - this.dragging.clientX;
    var deltaY = event.clientY - this.dragging.clientY;

    currentScreenPos.x += deltaX;
    currentScreenPos.y += deltaY;

    var newCoords = this._view.screenToCoordinates(currentScreenPos);
    this._hotspot.setCoordinates(newCoords);
    this.dragging = event;
  }
};

/**
 * Get hotspot instance
 */
PreviewerInfoHotspot.prototype.hotspotInstance = function () {
  return this._hotspot;
};

/**
 * Get hotspot type
 */
PreviewerInfoHotspot.prototype.hotspotType = function () {
  return "info";
};

module.exports = PreviewerInfoHotspot;

