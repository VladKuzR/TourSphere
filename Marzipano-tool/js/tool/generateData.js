/**
 * Generate Tour Data
 * Extracted from app5de6.js module 220 (lines 22379-22410)
 * Generates data structure for exported tours
 */

"use strict";

/**
 * Generate tour data from panoramas
 * @param {Array} panoramas - Array of panorama objects
 * @param {string} projectName - Name of the project
 * @param {Object} settings - Tour settings
 * @returns {Object} Tour data object
 */
module.exports = function generateData(panoramas, projectName, settings) {
  return {
    scenes: panoramas.map(function (panorama) {
      // Filter link hotspots to only include valid targets
      var linkHotspots = panorama.settings.linkHotspots
        .filter(function (hotspot) {
          return hotspot.hasValidTarget();
        })
        .map(function (hotspot) {
          return hotspot.toObject();
        });

      // Map info hotspots
      var infoHotspots = panorama.settings.infoHotspots.map(function (hotspot) {
        return hotspot.toObject();
      });

      return {
        id: panorama.uniqueId(),
        name: panorama.name,
        levels: panorama.levels,
        faceSize: panorama.faceSize,
        initialViewParameters: panorama.settings.initialViewParameters,
        linkHotspots: linkHotspots,
        infoHotspots: infoHotspots,
      };
    }),
    name: projectName,
    settings: settings,
  };
};

