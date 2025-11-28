/**
 * LinkHotspot Class
 * Extracted from app5de6.js module 215 (lines 21667-21713)
 * Data class for link hotspots
 */

"use strict";

var eventEmitter = require("./util/eventEmitter");
var ko = require("knockout-es5");

/**
 * LinkHotspot constructor
 * @param {number} yaw - Horizontal angle
 * @param {number} pitch - Vertical angle
 * @param {Object} target - Target panorama
 */
function LinkHotspot(yaw, pitch, target) {
  this.yaw = yaw;
  this.pitch = pitch;
  this.target = target;
  this.rotation = 0;
  ko.track(this);
}

eventEmitter(LinkHotspot);

/**
 * Set hotspot coordinates
 * @param {Object} coords - {yaw, pitch}
 */
LinkHotspot.prototype.setCoordinates = function (coords) {
  this.yaw = coords.yaw;
  this.pitch = coords.pitch;
  this.emit("coordinatesChanged");
};

/**
 * Offset the rotation by a given amount
 * @param {number} delta - Rotation offset in radians
 */
LinkHotspot.prototype.offsetRotation = function (delta) {
  this.rotation += delta;
  this.emit("rotationChanged");
};

/**
 * Set the target panorama
 * @param {Object} target - Target panorama
 */
LinkHotspot.prototype.setTarget = function (target) {
  this.target = target;
  this.emit("targetChanged");
};

/**
 * Convert to plain object for export
 */
LinkHotspot.prototype.toObject = function () {
  return {
    yaw: this.yaw,
    pitch: this.pitch,
    rotation: this.rotation,
    target: this.target.uniqueId(),
  };
};

/**
 * Check if hotspot has a valid target
 */
LinkHotspot.prototype.hasValidTarget = function () {
  return this.target && !this.target.removed();
};

module.exports = LinkHotspot;

