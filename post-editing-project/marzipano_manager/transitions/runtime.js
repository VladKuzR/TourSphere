/**
 * Marzipano Seamless Transition System
 *
 * Handles smooth transitions between scenes with:
 * - Center on hotspot (0.5s)
 * - Zoom in with blur
 * - Scene switch
 * - Zoom out, remove blur, restore to conditional view
 */

(function () {
  "use strict";

  // Configuration
  const TRANSITION_CONFIG = {
    centerDuration: 500, // ms to center on hotspot
    zoomDuration: 400, // ms to zoom in
    switchDuration: 100, // ms to switch scene
    unzoomDuration: 400, // ms to zoom out
    maxZoom: 2.0, // max zoom level during transition
    maxBlur: 8, // max blur in pixels
    easing: function (t) {
      // easeInOutQuad
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
  };

  // Global state
  let viewConfig = {};
  let currentSceneId = null;
  let isTransitioning = false;
  let originalLimiter = null;

  /**
   * Load view configuration
   */
  window.loadViewConfig = function (config) {
    viewConfig = config;
    console.log(
      "📊 View config loaded:",
      Object.keys(viewConfig).length,
      "scenes"
    );
  };

  /**
   * Remove zoom restrictions temporarily
   */
  function unlockZoom(view) {
    if (!originalLimiter) {
      originalLimiter = view._limiter;
    }
    // Create a very permissive limiter
    view.setLimiter(
      Marzipano.RectilinearView.limit.traditional(
        4096,
        (10 * Math.PI) / 180, // min FOV (max zoom in)
        (150 * Math.PI) / 180 // max FOV (max zoom out)
      )
    );
  }

  /**
   * Restore original zoom restrictions
   */
  function lockZoom(view) {
    if (originalLimiter) {
      view.setLimiter(originalLimiter);
      originalLimiter = null;
    }
  }

  /**
   * Apply blur effect to viewer
   */
  function applyBlur(amount) {
    const panoElement = document.querySelector("#pano");
    if (panoElement) {
      panoElement.style.filter = amount > 0 ? `blur(${amount}px)` : "none";
      panoElement.style.transition = "filter 0.3s ease";
    }
  }

  /**
   * Animate view parameters with easing
   */
  function animateView(view, targetParams, duration, onComplete) {
    const startParams = view.parameters();
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = TRANSITION_CONFIG.easing(progress);

      const currentParams = {
        yaw:
          startParams.yaw +
          (targetParams.yaw - startParams.yaw) * easedProgress,
        pitch:
          startParams.pitch +
          (targetParams.pitch - startParams.pitch) * easedProgress,
        fov:
          startParams.fov +
          (targetParams.fov - startParams.fov) * easedProgress,
      };

      view.setParameters(currentParams);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    }

    animate();
  }

  /**
   * Main transition function
   */
  window.performSeamlessTransition = function (fromScene, toScene, hotspot) {
    if (isTransitioning) {
      console.log("⚠️ Transition already in progress");
      return;
    }

    isTransitioning = true;
    const fromSceneId = fromScene.data.id;
    const toSceneId = toScene.data.id;
    console.log(`🎬 Starting transition: ${fromSceneId} → ${toSceneId}`);
    console.log(
      `📍 Hotspot at yaw=${hotspot.yaw.toFixed(
        2
      )}, pitch=${hotspot.pitch.toFixed(2)}`
    );

    const view = fromScene.view;
    const targetView = toScene.view;

    // Step 1: Center on hotspot (0.5s) - horizontal only (pitch = 0)
    console.log("1️⃣ Centering on hotspot (horizontal)...");
    const centerParams = {
      yaw: hotspot.yaw,
      pitch: 0, // Always horizontal
      fov: view.parameters().fov,
    };

    animateView(
      view,
      centerParams,
      TRANSITION_CONFIG.centerDuration,
      function () {
        // Step 2: Unlock zoom & zoom in with blur
        console.log("2️⃣ Zooming in with blur...");
        unlockZoom(view);

        const zoomParams = {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch,
          fov: view.parameters().fov / TRANSITION_CONFIG.maxZoom,
        };

        // Apply blur progressively
        let blurAmount = 0;
        const blurInterval = setInterval(function () {
          blurAmount = Math.min(blurAmount + 1, TRANSITION_CONFIG.maxBlur);
          applyBlur(blurAmount);
        }, TRANSITION_CONFIG.zoomDuration / TRANSITION_CONFIG.maxBlur);

        animateView(
          view,
          zoomParams,
          TRANSITION_CONFIG.zoomDuration,
          function () {
            clearInterval(blurInterval);

            // Step 3: Switch scene
            console.log("3️⃣ Switching scene...");

            setTimeout(function () {
              // Get conditional view parameters
              const toSceneId = toScene.data.id;
              const fromSceneId = fromScene.data.id;
              let entryParams;

               console.log("🔍 Looking up view config:", {
                 toSceneId: toSceneId,
                 fromSceneId: fromSceneId,
                 hasConfig: !!(
                   viewConfig[toSceneId] &&
                   viewConfig[toSceneId].ifCameFrom[fromSceneId]
                 ),
               });

               if (
                 viewConfig[toSceneId] &&
                 viewConfig[toSceneId].ifCameFrom[fromSceneId]
               ) {
                 entryParams = viewConfig[toSceneId].ifCameFrom[fromSceneId];
                 
                 // Verify auto-180 calculation
                 const expectedYaw = normalizeAngle(hotspot.yaw + Math.PI);
                 const diff = Math.abs(entryParams.yaw - expectedYaw);
                 console.log("✅ Using conditional view:", entryParams);
                 console.log("🔍 Auto-180 verification:", {
                   clickedHotspotYaw: hotspot.yaw.toFixed(3),
                   expectedEntryYaw: expectedYaw.toFixed(3),
                   configuredEntryYaw: entryParams.yaw.toFixed(3),
                   difference: diff.toFixed(3) + " radians (" + (diff * 180 / Math.PI).toFixed(1) + "°)"
                 });
               } else {
                // Fallback: auto-180 from hotspot (horizontal view)
                entryParams = {
                  yaw: normalizeAngle(hotspot.yaw + Math.PI),
                  pitch: 0, // Always horizontal
                  fov: toScene.data.initialViewParameters.fov,
                };
                console.log("⚠️ Using auto-180 fallback:", entryParams);
              }

              console.log("🎯 Setting entry view:", {
                yaw: entryParams.yaw.toFixed(3),
                pitch: entryParams.pitch.toFixed(3),
                fov: entryParams.fov.toFixed(3),
              });

              // Set target scene to entry view
              targetView.setParameters(entryParams);

              // Switch scene
              toScene.scene.switchTo();
              currentSceneId = toSceneId;

              // Step 4: Remove blur & restore zoom limits
              console.log("4️⃣ Removing blur & restoring zoom...");

              // Fade out blur
              let blurRemove = TRANSITION_CONFIG.maxBlur;
              const removeBlurInterval = setInterval(function () {
                blurRemove = Math.max(blurRemove - 1, 0);
                applyBlur(blurRemove);
                if (blurRemove === 0) {
                  clearInterval(removeBlurInterval);
                }
              }, TRANSITION_CONFIG.unzoomDuration / TRANSITION_CONFIG.maxBlur);

              // Restore zoom restrictions
              lockZoom(view);
              lockZoom(targetView);

              setTimeout(function () {
                isTransitioning = false;
                console.log("✅ Transition complete!");
              }, TRANSITION_CONFIG.unzoomDuration);
            }, TRANSITION_CONFIG.switchDuration);
          }
        );
      }
    );
  };

  /**
   * Normalize angle to [-π, π]
   */
  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  /**
   * Set current scene (track for conditional views)
   */
  window.setCurrentScene = function (sceneId) {
    currentSceneId = sceneId;
  };

  console.log("🎬 Seamless Transition System loaded");
})();
