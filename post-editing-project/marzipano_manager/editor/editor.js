// Marzipano Tour Editor
(function () {
  "use strict";

  window.MarzipanoEditor = {
    data: null,
    viewer: null,
    scenes: null,
    currentScene: null,
    currentSceneIndex: 0,
    overlayScene: null,
    overlaySceneIndex: -1,
    overlayOpacity: 0,
    selectedHotspot: null,
    overlayLayer: null,
    controllingOverlay: false, // false = control current scene, true = control overlay
    viewConfig: {}, // Stores view configurations per scene

    init: function (viewer, scenes, data) {
      this.viewer = viewer;
      this.scenes = scenes;
      this.data = JSON.parse(JSON.stringify(data)); // Deep copy
      this.currentScene = scenes[0];
      this.currentSceneIndex = 0;
      
      // Initialize viewConfig structure
      this.initializeViewConfig();

      this.createUI();
      this.createCenterDot();
      this.setupEventListeners();
      this.loadSceneList();
      this.updateSceneStatuses();
      this.listenToSceneChanges();

      console.log("Marzipano Editor initialized with", scenes.length, "scenes");
      console.log("📊 View configuration:", this.viewConfig);
    },
    
    initializeViewConfig: function() {
      // Create view config structure for each scene
      this.data.scenes.forEach(function(scene) {
        this.viewConfig[scene.id] = {
          Init_parameters: {
            yaw: scene.initialViewParameters.yaw,
            pitch: scene.initialViewParameters.pitch,
            fov: scene.initialViewParameters.fov
          },
          ifCameFrom: {}
        };
      }.bind(this));
      
      console.log("📋 Initialized view config for", Object.keys(this.viewConfig).length, "scenes");
    },
    
    listenToSceneChanges: function() {
      // Listen to scene switches from hotspot clicks
      const self = this;
      
      this.scenes.forEach(function(sceneObj, index) {
        sceneObj.scene.addEventListener('switchTo', function() {
          console.log("🔄 Scene switched to:", self.data.scenes[index].name);
          self.onSceneSwitch(index);
        });
      });
      
      // Log center dot angles only on view changes
      if (this.currentScene && this.currentScene.view) {
        this.currentScene.view.addEventListener('change', function() {
          const params = self.currentScene.view.parameters();
          console.log("🎯 Center dot viewing:", {
            scene: self.data.scenes[self.currentSceneIndex].id,
            yaw: params.yaw.toFixed(3),
            pitch: params.pitch.toFixed(3),
            fov: params.fov.toFixed(3)
          });
        });
      }
      
      console.log("📍 Tip: Move view to see center dot angles (updates on movement)");
    },
    
    onSceneSwitch: function(newSceneIndex) {
      // Called when scene switches (e.g., hotspot clicked)
      if (newSceneIndex === this.currentSceneIndex) {
        return; // Already current
      }
      
      console.log("📍 Updating editor for scene switch:", this.data.scenes[newSceneIndex].name);
      
      // Update current scene tracking
      this.currentSceneIndex = newSceneIndex;
      this.currentScene = this.scenes[newSceneIndex];
      
      // If the new current scene was the overlay, clear overlay
      if (newSceneIndex === this.overlaySceneIndex) {
        this.setOverlayOpacity(0);
        this.overlaySceneIndex = -1;
        this.overlayScene = null;
        document.getElementById("overlay-controls").style.display = "none";
        document.getElementById("transition-settings").style.display = "none";
      }
      
      // Update status indicators
      this.updateSceneStatuses();
      
      // Reset control to current scene
      if (this.controllingOverlay) {
        this.setControlTarget(false);
      }
      
      // Ensure main pano is controllable
      const panoElement = document.getElementById("pano");
      if (panoElement) {
        panoElement.style.pointerEvents = "auto";
      }
    },

    createUI: function () {
      // Create sidebar
      const sidebar = document.createElement("div");
      sidebar.id = "editor-sidebar";
      sidebar.innerHTML = `
        <div class="editor-header">
          <h3>Tour Editor</h3>
        </div>
        <div class="scene-list-container">
          <h4>Scenes</h4>
          <div id="scene-list"></div>
        </div>
        <div class="editor-controls">
          <button id="save-tour-btn" class="btn-primary">Save Tour Data</button>
        </div>
      `;
      document.body.appendChild(sidebar);

      // Create workflow instructions
      const instructions = document.createElement("div");
      instructions.id = "editor-instructions";
      instructions.style.display = "none";
      instructions.innerHTML = `
        <h4>📝 Workflow</h4>
        <ol style="font-size: 13px; line-height: 1.8; padding-left: 20px;">
          <li>Select overlay scene from list</li>
          <li>Set opacity to 50%</li>
          <li>Click "Overlay Scene" to control it</li>
          <li>Drag overlay to align with current</li>
          <li>Switch to "Current Scene" if needed</li>
          <li>Click "Set Current View" to save entry angle</li>
          <li>Set overlay to OFF when done</li>
          <li>Repeat for next scene pair</li>
          <li>Click "Save Tour Data" when finished</li>
        </ol>
      `;
      sidebar.appendChild(instructions);
      
      // Add show/hide instructions button
      const instrBtn = document.createElement("button");
      instrBtn.id = "toggle-instructions";
      instrBtn.className = "btn-small";
      instrBtn.textContent = "Show Workflow";
      instrBtn.style.marginTop = "10px";
      instrBtn.onclick = function() {
        const instr = document.getElementById("editor-instructions");
        if (instr.style.display === "none") {
          instr.style.display = "block";
          instrBtn.textContent = "Hide Workflow";
        } else {
          instr.style.display = "none";
          instrBtn.textContent = "Show Workflow";
        }
      };
      document.querySelector(".editor-controls").insertBefore(
        instrBtn, 
        document.getElementById("save-tour-btn")
      );

      // Create overlay controls panel
      const overlayPanel = document.createElement("div");
      overlayPanel.id = "overlay-controls";
      overlayPanel.style.display = "none";
      overlayPanel.innerHTML = `
        <h4>Overlay Controls</h4>
        <div class="opacity-controls">
          <label><input type="radio" name="overlay-opacity" value="0" checked> OFF</label>
          <label><input type="radio" name="overlay-opacity" value="0.5"> 50%</label>
          <label><input type="radio" name="overlay-opacity" value="1"> 100%</label>
        </div>
        <div class="control-toggle">
          <div class="control-toggle-label">Control:</div>
          <div class="control-toggle-buttons">
            <div class="control-toggle-btn active" id="control-current">Current Scene</div>
            <div class="control-toggle-btn" id="control-overlay">Overlay Scene</div>
          </div>
        </div>
        <div class="overlay-tools">
          <button id="save-zoom-btn" class="btn-secondary">Save Zoom Level</button>
          <button id="play-transition-btn" class="btn-secondary">Play Transition</button>
        </div>
      `;
      document.body.appendChild(overlayPanel);
      
      // Make overlay panel draggable
      this.makeDraggable(overlayPanel);

      // Create transition settings panel
      const transitionPanel = document.createElement("div");
      transitionPanel.id = "transition-settings";
      transitionPanel.style.display = "none";
      transitionPanel.innerHTML = `
        <h4>Transition Settings</h4>
        <div class="setting-group">
          <label>Entry Yaw:</label>
          <input type="number" id="entry-yaw" step="0.1" />
          <button id="set-current-view-btn" class="btn-small">Set Current View</button>
        </div>
        <div class="setting-group">
          <label>Zoom Level (1.0-3.0):</label>
          <input type="number" id="zoom-target" step="0.1" value="2.0" min="1.0" max="3.0" />
        </div>
        <div class="setting-group">
          <label>Blur Amount (px):</label>
          <input type="number" id="blur-amount" step="1" value="8" min="0" max="20" />
        </div>
        <div class="setting-group">
          <button id="test-transition-btn" class="btn-primary">🎬 Test Transition</button>
        </div>
      `;
      document.body.appendChild(transitionPanel);
      
      // Make transition panel draggable
      this.makeDraggable(transitionPanel);
    },
    
    makeDraggable: function(element) {
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      const header = element.querySelector('h4');
      
      if (header) {
        header.onmousedown = dragMouseDown;
      } else {
        element.onmousedown = dragMouseDown;
      }
      
      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }
      
      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.right = "auto";
      }
      
      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
    },

    createCenterDot: function () {
      const dot = document.createElement("div");
      dot.id = "center-dot";
      document.body.appendChild(dot);
      
      // Add live view parameter display
      const self = this;
      setInterval(function() {
        if (self.currentScene && self.currentScene.view) {
          const params = self.currentScene.view.parameters();
          console.log("🎯 Center dot viewing:", {
            scene: self.data.scenes[self.currentSceneIndex].id,
            yaw: params.yaw.toFixed(3),
            pitch: params.pitch.toFixed(3),
            fov: params.fov.toFixed(3)
          });
        }
      }, 2000); // Log every 2 seconds
    },

    setupEventListeners: function () {
      const self = this;

      // Save button
      document
        .getElementById("save-tour-btn")
        .addEventListener("click", function () {
          self.saveTourData();
        });

      // Overlay opacity controls
      document
        .querySelectorAll('input[name="overlay-opacity"]')
        .forEach(function (radio) {
          radio.addEventListener("change", function () {
            self.setOverlayOpacity(parseFloat(this.value));
          });
        });

      // Save zoom button
      document
        .getElementById("save-zoom-btn")
        .addEventListener("click", function () {
          self.saveZoomLevel();
        });

      // Play transition button
      document
        .getElementById("play-transition-btn")
        .addEventListener("click", function () {
          self.playTransition();
        });

      // Set current view button
      document
        .getElementById("set-current-view-btn")
        .addEventListener("click", function () {
          self.setCurrentViewAsEntry();
        });
      
      // Test transition button
      const testBtn = document.getElementById("test-transition-btn");
      if (testBtn) {
        testBtn.addEventListener("click", function () {
          self.testTransition();
        });
      }
      
      // Zoom and blur inputs - save on change
      const zoomInput = document.getElementById("zoom-target");
      const blurInput = document.getElementById("blur-amount");
      
      if (zoomInput) {
        zoomInput.addEventListener("change", function() {
          self.saveTransitionParams();
        });
      }
      
      if (blurInput) {
        blurInput.addEventListener("change", function() {
          self.saveTransitionParams();
        });
      }
      
      // Control toggle buttons
      document.getElementById("control-current").addEventListener("click", function() {
        self.setControlTarget(false);
      });
      
      document.getElementById("control-overlay").addEventListener("click", function() {
        self.setControlTarget(true);
      });
    },

    loadSceneList: function () {
      const container = document.getElementById("scene-list");
      container.innerHTML = "";

      const self = this;
      this.data.scenes.forEach(function (sceneData, index) {
        const sceneItem = document.createElement("div");
        sceneItem.className = "scene-item";
        sceneItem.dataset.index = index;
        sceneItem.innerHTML = `
          <span class="scene-name">${sceneData.name}</span>
          <span class="scene-status" id="status-${index}">-</span>
        `;

        sceneItem.addEventListener("click", function () {
          self.selectScene(index);
        });

        container.appendChild(sceneItem);
      });
    },

    updateSceneStatuses: function () {
      // Update all scene status indicators
      this.data.scenes.forEach(
        function (sceneData, index) {
          const statusEl = document.getElementById("status-" + index);
          if (statusEl) {
            if (index === this.currentSceneIndex) {
              statusEl.textContent = "Current";
              statusEl.className = "scene-status status-current";
            } else if (index === this.overlaySceneIndex) {
              statusEl.textContent = "Overlay";
              statusEl.className = "scene-status status-overlay";
            } else {
              statusEl.textContent = "-";
              statusEl.className = "scene-status";
            }
          }
        }.bind(this)
      );
    },

    selectScene: function (index) {
      const scene = this.scenes[index];

      // If clicking current scene, just ensure it's displayed
      if (index === this.currentSceneIndex) {
        this.switchToScene(index);
        return;
      }

      // If clicking the overlay scene, turn off overlay and switch to it
      if (index === this.overlaySceneIndex) {
        this.setOverlayOpacity(0);
        this.overlaySceneIndex = -1;
        this.overlayScene = null;
        document.getElementById("overlay-controls").style.display = "none";
        document.getElementById("transition-settings").style.display = "none";
        this.switchToScene(index);
        return;
      }

      // Otherwise, set as overlay
      this.overlaySceneIndex = index;
      this.overlayScene = scene;

      this.updateSceneStatuses();

      document.getElementById("overlay-controls").style.display = "block";
      document.getElementById("transition-settings").style.display = "block";

      // Show overlay at 50%
      document.querySelector(
        'input[name="overlay-opacity"][value="0.5"]'
      ).checked = true;
      this.setOverlayOpacity(0.5);
    },

    switchToScene: function (index) {
      // Switch to a scene as the current scene
      const oldIndex = this.currentSceneIndex;
      this.currentSceneIndex = index;
      this.currentScene = this.scenes[index];

      // Switch the actual scene view
      const sceneData = this.data.scenes[index];
      this.currentScene.view.setParameters(sceneData.initialViewParameters);
      this.currentScene.scene.switchTo();

      // Clear overlay if it was the old current scene
      if (this.overlaySceneIndex === index) {
        this.overlaySceneIndex = -1;
        this.overlayScene = null;
        this.setOverlayOpacity(0);
        document.getElementById("overlay-controls").style.display = "none";
        document.getElementById("transition-settings").style.display = "none";
      }

      this.updateSceneStatuses();
      
      // Reset control to current scene and ensure controls work
      if (this.controllingOverlay) {
        this.setControlTarget(false);
      }
      
      // Ensure main pano is controllable
      const panoElement = document.getElementById("pano");
      if (panoElement) {
        panoElement.style.pointerEvents = "auto";
      }
    },
    
    setControlTarget: function(controlOverlay) {
      this.controllingOverlay = controlOverlay;
      
      // Update button states
      const currentBtn = document.getElementById("control-current");
      const overlayBtn = document.getElementById("control-overlay");
      
      const panoElement = document.getElementById("pano");
      const overlayElement = this.overlayLayer;
      
      if (controlOverlay) {
        currentBtn.classList.remove("active");
        overlayBtn.classList.add("active");
        console.log("🎮 Now controlling: Overlay scene");
        
        // Disable pointer events on main pano, enable on overlay
        if (panoElement) {
          panoElement.style.pointerEvents = "none";
        }
        if (overlayElement) {
          overlayElement.style.pointerEvents = "auto";
        }
        
        // Add view change listener to save overlay position
        if (overlayElement && overlayElement._tempView) {
          const self = this;
          overlayElement._tempView.addEventListener('change', function() {
            const params = overlayElement._tempView.parameters();
            console.log("💾 Auto-saving overlay view:", params);
            
            // Save to currentViewParameters for re-opening
            self.data.scenes[self.overlaySceneIndex].currentViewParameters = {
              yaw: params.yaw,
              pitch: params.pitch,
              fov: params.fov
            };
            
            // Save to viewConfig structure: "Scene B came from Scene A"
            const currentSceneId = self.data.scenes[self.currentSceneIndex].id;
            const overlaySceneId = self.data.scenes[self.overlaySceneIndex].id;
            
            if (!self.viewConfig[overlaySceneId].ifCameFrom[currentSceneId]) {
              console.log(`📝 Creating entry: ${overlaySceneId}.ifCameFrom.${currentSceneId}`);
            }
            
            self.viewConfig[overlaySceneId].ifCameFrom[currentSceneId] = {
              yaw: params.yaw,
              pitch: params.pitch,
              fov: params.fov
            };
            
            console.log(`✅ Saved: Scene "${overlaySceneId}" view when coming from "${currentSceneId}"`);
            
            self.updateData();
          });
        }
      } else {
        currentBtn.classList.add("active");
        overlayBtn.classList.remove("active");
        console.log("🎮 Now controlling: Current scene");
        
        // Enable pointer events on main pano, disable on overlay
        if (panoElement) {
          panoElement.style.pointerEvents = "auto";
        }
        if (overlayElement) {
          overlayElement.style.pointerEvents = "none";
        }
      }
    },

    setOverlayOpacity: function (opacity) {
      this.overlayOpacity = opacity;

      if (!this.overlayScene) {
        return;
      }

      if (opacity === 0) {
        // BEFORE removing overlay, save its current view
        if (this.overlayLayer && this.overlayLayer._tempView) {
          const params = this.overlayLayer._tempView.parameters();
          console.log("💾 Saving overlay view:", params);
          // Store in our data for this scene
          this.data.scenes[this.overlaySceneIndex].currentViewParameters = {
            yaw: params.yaw,
            pitch: params.pitch,
            fov: params.fov
          };
          this.updateData();
        }
        
        // Remove overlay layer
        if (this.overlayLayer) {
          document.body.removeChild(this.overlayLayer);
          this.overlayLayer = null;
        }
      } else {
        // Create or update overlay layer
        if (!this.overlayLayer) {
          this.overlayLayer = document.createElement('div');
          this.overlayLayer.id = 'overlay-pano';
          this.overlayLayer.style.position = 'fixed';
          this.overlayLayer.style.top = '0';
          this.overlayLayer.style.left = '0';
          this.overlayLayer.style.right = '0';
          this.overlayLayer.style.bottom = '0';
          this.overlayLayer.style.pointerEvents = 'none'; // Initially disabled
          this.overlayLayer.style.zIndex = '5000';
          document.body.appendChild(this.overlayLayer);
          
          // Create temporary viewer for overlay
          var tempViewer = new Marzipano.Viewer(this.overlayLayer, {
            controls: {
              mouseViewMode: 'drag'
            }
          });
          
          // Clone the overlay scene's configuration
          var overlaySceneData = this.data.scenes[this.overlaySceneIndex];
          var urlPrefix = "tiles";
          var source = Marzipano.ImageUrlSource.fromString(
            urlPrefix + "/" + overlaySceneData.id + "/{z}/{f}/{y}/{x}.jpg",
            {
              cubeMapPreviewUrl:
                urlPrefix + "/" + overlaySceneData.id + "/preview.jpg",
            }
          );
          var geometry = new Marzipano.CubeGeometry(overlaySceneData.levels);
          var limiter = Marzipano.RectilinearView.limit.traditional(
            overlaySceneData.faceSize,
            (100 * Math.PI) / 180,
            (120 * Math.PI) / 180
          );
          
          // Use saved view if available, otherwise use initial view
          var viewParams = overlaySceneData.currentViewParameters || overlaySceneData.initialViewParameters;
          console.log("🔄 Loading overlay scene with view:", viewParams);
          
          var view = new Marzipano.RectilinearView(
            viewParams,
            limiter
          );

          var tempScene = tempViewer.createScene({
            source: source,
            geometry: geometry,
            view: view,
            pinFirstLevel: true,
          });

          tempScene.switchTo();
          this.overlayLayer._tempViewer = tempViewer;
          this.overlayLayer._tempView = view;
          
          console.log("📹 Overlay viewer created");
        }

        // Set opacity
        this.overlayLayer.style.opacity = opacity;

        // Sync view with current scene if controlling current
        if (!this.controllingOverlay) {
          var currentParams = this.currentScene.view.parameters();
          if (this.overlayLayer._tempView) {
            this.overlayLayer._tempView.setParameters(currentParams);
          }
        }
      }
    },
    
    syncViews: function() {
      // Synchronize overlay view with current view when needed
      if (this.overlayLayer && this.overlayLayer._tempView && !this.controllingOverlay) {
        var currentParams = this.currentScene.view.parameters();
        this.overlayLayer._tempView.setParameters(currentParams);
      }
    },

    saveZoomLevel: function () {
      const view = this.currentScene.view;
      const params = view.parameters();

      console.log("Saved zoom level:", params.fov);
      alert("Zoom level saved: " + params.fov.toFixed(3));

      // Store in transition data
      if (this.selectedHotspot) {
        this.selectedHotspot.zoomTarget = params.fov;
        this.updateData();
      }
    },

    playTransition: function () {
      console.log("🎬 Testing transition with current settings");
      
      if (!this.overlayScene || this.overlaySceneIndex === -1) {
        alert("⚠️ Please select an overlay scene first!");
        return;
      }
      
      // Get transition parameters
      const zoomLevel = parseFloat(document.getElementById("zoom-target").value) || 2.0;
      const blurAmount = parseInt(document.getElementById("blur-amount").value) || 8;
      
      console.log(`Testing transition with zoom=${zoomLevel}, blur=${blurAmount}px`);
      
      // Use the seamless transition system if available
      if (window.performSeamlessTransition) {
        // Temporarily update config
        const oldMaxZoom = window.TRANSITION_CONFIG ? window.TRANSITION_CONFIG.maxZoom : null;
        const oldMaxBlur = window.TRANSITION_CONFIG ? window.TRANSITION_CONFIG.maxBlur : null;
        
        if (window.TRANSITION_CONFIG) {
          window.TRANSITION_CONFIG.maxZoom = zoomLevel;
          window.TRANSITION_CONFIG.maxBlur = blurAmount;
        }
        
        // Find hotspot connecting current -> overlay scene
        const targetSceneId = this.data.scenes[this.overlaySceneIndex].id;
        let testHotspot = null;
        
        for (let hs of this.data.scenes[this.currentSceneIndex].linkHotspots || []) {
          if (hs.target === targetSceneId) {
            testHotspot = hs;
            break;
          }
        }
        
        if (!testHotspot) {
          // Create a virtual hotspot at current view
          const currentParams = this.currentScene.view.parameters();
          testHotspot = {
            yaw: currentParams.yaw,
            pitch: currentParams.pitch,
            target: targetSceneId
          };
        }
        
        window.performSeamlessTransition(this.currentScene, this.overlayScene, testHotspot);
        
        // Restore original config
        if (oldMaxZoom && oldMaxBlur && window.TRANSITION_CONFIG) {
          setTimeout(function() {
            window.TRANSITION_CONFIG.maxZoom = oldMaxZoom;
            window.TRANSITION_CONFIG.maxBlur = oldMaxBlur;
          }, 3000);
        }
      } else {
        alert("⚠️ Transition system not loaded. Please refresh the page.");
      }
    },
    
    saveTransitionParams: function() {
      const zoomLevel = parseFloat(document.getElementById("zoom-target").value) || 2.0;
      const blurAmount = parseInt(document.getElementById("blur-amount").value) || 8;
      
      // Save to viewConfig for the current scene->overlay transition
      if (this.overlaySceneIndex !== -1) {
        const currentSceneId = this.data.scenes[this.currentSceneIndex].id;
        const overlaySceneId = this.data.scenes[this.overlaySceneIndex].id;
        
        // Store transition params in viewConfig
        if (!this.viewConfig[overlaySceneId].ifCameFrom[currentSceneId]) {
          this.viewConfig[overlaySceneId].ifCameFrom[currentSceneId] = {};
        }
        
        this.viewConfig[overlaySceneId].ifCameFrom[currentSceneId].zoomLevel = zoomLevel;
        this.viewConfig[overlaySceneId].ifCameFrom[currentSceneId].blurAmount = blurAmount;
        
        console.log(`💾 Saved transition params: zoom=${zoomLevel}, blur=${blurAmount}px`);
        this.updateData();
      }
    },

    setCurrentViewAsEntry: function () {
      const view = this.currentScene.view;
      const params = view.parameters();

      document.getElementById("entry-yaw").value = params.yaw.toFixed(3);

      // Store in scene data
      this.currentScene.data.initialViewParameters.yaw = params.yaw;
      this.updateData();

      alert("Entry angle set to: " + params.yaw.toFixed(3));
    },

    updateData: function () {
      // This triggers instant update to data structure
      console.log("Data updated");

      // Store in localStorage for persistence
      const saveData = {
        tourData: this.data,
        viewConfig: this.viewConfig
      };
      localStorage.setItem("marzipano_tour_data", JSON.stringify(saveData));
      console.log("💾 Saved to localStorage");
    },

    saveTourData: function () {
      // Prepare export data with view config
      const exportData = {
        tourData: this.data,
        viewConfig: this.viewConfig
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "config.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Tour data saved");
      console.log("📊 View Config:", this.viewConfig);
      alert("Tour data saved as config.json");
    },
  };
})();
