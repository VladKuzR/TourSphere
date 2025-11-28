/**
 * Get Archive (Export to ZIP)
 * Extracted from app5de6.js module 221 (lines 22412-22540)
 * Creates ZIP archive of the tour
 */

"use strict";

var async = require("async");
var Zip = require("./zip/Zip");
var delay = require("./util/delay");
var template = require("lodash/string/template");
var fileExt = require("./util/fileExt");
var fileNoExt = require("./util/fileNoExt");
var FileSaver = require("filesaver.js");
var ProcessingState = require("./processingState/ProcessingState");
var slug = require("./util/slug");

var ZIP_MIME_TYPE = "application/zip";

/**
 * Create archive from tour data
 * @param {Object} tourData - Generated tour data
 * @param {Array} panoramas - Array of panorama objects
 * @param {Array} templateFiles - Template files for export
 * @param {Object} options - Options including workerSource
 * @returns {ProcessingState} Processing state for tracking progress
 */
module.exports = function getArchive(
  tourData,
  panoramas,
  templateFiles,
  options
) {
  options = options || {};

  var processingState = new ProcessingState("zip", {
    panoramaNum: panoramas.length,
  }).started();

  var zip = new Zip({
    workerSource: options.workerSource,
  });

  // Add tour data as data.js
  var addDataState = processingState.addChild("add_data").started();
  addTourData(tourData, zip);
  addDataState.successful({ tourData: tourData });

  // Add template files
  var addTemplateState = processingState
    .addChild("add_template_files")
    .started();
  addTemplateFiles(templateFiles, tourData, zip, function (error) {
    if (error) throw error;
    addTemplateState.successful();

    // Add tiles
    var addTilesState = processingState.addChild("add_tiles").started();
    addTiles(panoramas, zip, function (error, tileCount) {
      if (error) throw error;
      addTilesState.successful({ tileNum: tileCount });

      // Generate ZIP
      var generateState = processingState.addChild("generate_zip").started();
      zip.generate({ type: "uint8array" }, function (error, data) {
        if (error) throw error;
        generateState.successful();
        zip.destroy();

        // Create blob
        var createBlobState = processingState.addChild("create_blob").started();
        var blob = new Blob([data], { type: ZIP_MIME_TYPE });
        createBlobState.successful();

        // Save blob
        var saveBlobState = processingState.addChild("save_blob").started();
        var filename = (slug(tourData.name) || "marzipano-tour") + ".zip";
        FileSaver(blob, filename);
        saveBlobState.successful();

        processingState.successful({ byteLength: data.byteLength });
      });
    });
  });

  return processingState;
};

/**
 * Add tour data to ZIP
 * @private
 */
function addTourData(tourData, zip) {
  var jsonString = JSON.stringify(tourData, null, 2);
  // Escape unicode line/paragraph separators
  jsonString = jsonString.replace(/\u2028/g, "\\u2028");
  jsonString = jsonString.replace(/\u2029/g, "\\u2029");
  var dataJs = "var APP_DATA = " + jsonString + ";\n";
  zip.add(["app-files"], "data.js", dataJs);
}

/**
 * Add template files to ZIP
 * @private
 */
function addTemplateFiles(templateFiles, tourData, zip, callback) {
  if (!templateFiles) {
    throw new Error("Template files not loaded");
  }

  async.eachSeries(
    templateFiles,
    function (file, done) {
      var filename = file.name;
      var content = file.data;

      // Process .tpl files as templates
      if (fileExt(file.name) === "tpl") {
        try {
          content = template(file.data)(tourData);
        } catch (error) {
          return done(error);
        }
        filename = fileNoExt(file.name);
      }

      zip.add([], filename, content);
      delay(done);
    },
    callback
  );
}

/**
 * Add tiles to ZIP
 * @private
 */
function addTiles(panoramas, zip, callback) {
  var tileCount = 0;

  async.eachSeries(
    panoramas,
    function (panorama, done) {
      var tilePath = ["app-files", "tiles", panorama.uniqueId()];

      // Add cube map preview if available
      if (panorama.cubeMapPreview) {
        zip.add(tilePath, "preview.jpg", panorama.cubeMapPreview, {
          binary: true,
        });
      }

      // Add all tiles
      panorama.tileStore.forEach(function (
        level,
        face,
        x,
        y,
        blob,
        tileCallback
      ) {
        var coords = [level, face, x, y].map(function (coord) {
          return coord.toString(10);
        });
        var fullPath = tilePath.concat(coords);
        zip.add(fullPath, y.toString(10) + ".jpg", blob, {
          binary: true,
        });
        tileCount++;
        tileCallback();
      },
      done);
    },
    function (error) {
      if (error) return callback(error);
      callback(null, tileCount);
    }
  );
}
