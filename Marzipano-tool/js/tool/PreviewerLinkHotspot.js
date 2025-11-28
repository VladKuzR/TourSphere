/**
 * PreviewerLinkHotspot Class
 * Extracted from app5de6.js module 234 (lines 23245-23372)
 * Manages link hotspots in the preview
 */

"use strict";

var ko = require("knockout-es5");

/**
 * PreviewerLinkHotspot constructor
 * @param {Object} hotspot - Hotspot data
 * @param {Object} panorama - Panorama object
 * @param {Scene} scene - Marzipano scene
 * @param {Previewer} previewer - Previewer instance
 */
function PreviewerLinkHotspot(hotspot, panorama, scene, previewer) {
  this._hotspot = hotspot;
  this._panorama = panorama;
  this._scene = scene;
  this._previewer = previewer;
  this._view = scene.view();

  // Position properties
  this.left = null;
  this.top = null;
  this.visible = false;
  this.targetSelectorVisible = !this._hotspot.hasValidTarget();

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

  ko.track(this);
}

/**
 * Cleanup when destroying hotspot
 */
PreviewerLinkHotspot.prototype.destroy = function () {
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
PreviewerLinkHotspot.prototype._updateTransform = function () {
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
 * Get image transform for rotation
 */
PreviewerLinkHotspot.prototype.imageTransform = function () {
  return "rotate(" + this._hotspot.rotation + "rad)";
};

/**
 * Get target panorama name
 */
PreviewerLinkHotspot.prototype.targetName = function () {
  return this._hotspot.hasValidTarget() && this._hotspot.target.name;
};

/**
 * Start dragging hotspot
 */
PreviewerLinkHotspot.prototype.startDrag = function (event, mouseEvent) {
  this._previewer.interruptAutorotate();
  this.dragging = mouseEvent;
};

/**
 * Navigate to target panorama
 */
PreviewerLinkHotspot.prototype.goToTarget = function () {
  if (this._hotspot.target) {
    this._hotspot.target.select();
  }
};

/**
 * Remove hotspot
 */
PreviewerLinkHotspot.prototype.remove = function () {
  this._previewer.interruptAutorotate();
  if (window.confirm("Delete this hotspot?")) {
    this._panorama.removeLinkHotspot(this._hotspot);
  }
};

/**
 * Toggle target selector
 */
PreviewerLinkHotspot.prototype.editTarget = function () {
  this._previewer.interruptAutorotate();
  this.targetSelectorVisible = !this.targetSelectorVisible;
};

/**
 * Close target selector
 */
PreviewerLinkHotspot.prototype.closeTargetSelector = function () {
  this.targetSelectorVisible = false;
};

/**
 * Select a target panorama
 */
PreviewerLinkHotspot.prototype.selectTarget = function (target) {
  this._hotspot.setTarget(target);
};

/**
 * Check if given panorama is the target
 */
PreviewerLinkHotspot.prototype.targetIs = function (panorama) {
  return this._hotspot.target === panorama;
};

/**
 * Rotate hotspot clockwise
 */
PreviewerLinkHotspot.prototype.rotateRight = function () {
  this._previewer.interruptAutorotate();
  this._hotspot.offsetRotation(Math.PI / 4);
};

/**
 * Rotate hotspot counter-clockwise
 */
PreviewerLinkHotspot.prototype.rotateLeft = function () {
  this._previewer.interruptAutorotate();
  this._hotspot.offsetRotation(-Math.PI / 4);
};

/**
 * Stop dragging
 * @private
 */
PreviewerLinkHotspot.prototype._stopDrag = function () {
  this.dragging = false;
};

/**
 * Interrupt autorotate
 */
PreviewerLinkHotspot.prototype.interruptAutorotate = function () {
  this._previewer.interruptAutorotate();
};

/**
 * Handle drag movement
 * @private
 */
PreviewerLinkHotspot.prototype._drag = function (event) {
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
 * Get hotspot type
 */
PreviewerLinkHotspot.prototype.hotspotType = function () {
  return "link";
};

module.exports = PreviewerLinkHotspot;

