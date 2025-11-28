/**
 * InfoHotspot Class
 * Extracted from app5de6.js module 214 (lines 21624-21666)
 * Data class for info hotspots
 */

"use strict";

var eventEmitter = require("./util/eventEmitter");
var ko = require("knockout-es5");

/**
 * InfoHotspot constructor
 * @param {number} yaw - Horizontal angle
 * @param {number} pitch - Vertical angle
 * @param {string} title - Hotspot title
 * @param {string} text - Hotspot text content
 */
function InfoHotspot(yaw, pitch, title, text) {
  this.yaw = yaw;
  this.pitch = pitch;
  this.title = title;
  this.text = text;
  this.initialTitle = title;
  this.initialText = text;

  this.getObservable = function (propertyName) {
    return ko.getObservable(this, propertyName);
  }.bind(this);

  ko.track(this);
}

eventEmitter(InfoHotspot);

/**
 * Set hotspot coordinates
 * @param {Object} coords - {yaw, pitch}
 */
InfoHotspot.prototype.setCoordinates = function (coords) {
  this.yaw = coords.yaw;
  this.pitch = coords.pitch;
  this.emit("coordinatesChanged");
};

/**
 * Check if hotspot is unchanged from initial state
 */
InfoHotspot.prototype.isUnchanged = function () {
  return this.title === this.initialTitle && this.text === this.initialText;
};

/**
 * Convert to plain object for export
 */
InfoHotspot.prototype.toObject = function () {
  return {
    yaw: this.yaw,
    pitch: this.pitch,
    title: this.title,
    text: this.text,
  };
};

module.exports = InfoHotspot;

