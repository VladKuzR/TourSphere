# Technical Specification: Marzipano Python Pipeline & Editor

## 1. Technology Stack

**Backend / CLI**: Python 3.x (standard libraries: zipfile, json, re, http.server for local hosting).

**Frontend (Editor)**: Vanilla JS + CSS (embedded in the tour).

**Data Transport**: JSON.

## 2. Component A: Python Manager (CLI)

Script `manage_tour.py`. Performs "dirty" file operations.

### Functionality

#### Init Mode (Initialization):

- Accepts a ZIP archive from Marzipano Tool.
- Extracts it.
- Parses `data.js` (extracts JS object into Python dictionary).
- **Auto-180 Logic**: Iterates through all links. If there's a transition from Scene A to Scene B with angle X, records metadata for Scene B: `entry_heading = X + 180`.
- Copies editor files (`editor.js`, `editor.css`) into the `app-files` folder.
- Patches `index.html`: injects editor call.
- Launches local server (to avoid CORS issues during testing).

#### Build Mode (Build):

- Accepts modified `data.json` (exported from the editor).
- Generates final `data.js` (clean, without extra clutter).
- Adds lightweight `player.js` (runtime transition engine).
- Removes editor files.
- Packages into ready ZIP.

## 3. Component B: Web Editor (UI)

Embeddable interface working on top of the tour.

### Interface Layout:

- **Left Panel (Sidebar)**: List of all scenes (similar to Marzipano Tool).
- **Center**: Tour viewport.
- **Viewport Overlay**: Red small dot fixed in the center of the viewport (alignment reference point).

### Sidebar Functionality (Scene List): Each scene row has:

- Scene name.
- Status indicator: "Current" (Current) or "Overlay" (Overlay).

### Selection Logic:

- The scene we're currently in is always "Current" (Layer 0).
- User clicks on another scene in the list → it becomes "Overlay" (Layer 1).
- **Constraint**: Only 2 scenes are active simultaneously (Current + 1 Overlay). When selecting a new one, the old overlay is disabled.

### Overlay Control (within active overlay row):

Instead of a slider — toggle/radio:

- **OFF** (Hidden)
- **50%** (Semi-transparent for alignment)
- **100%** (Full visibility for detail checking)

### Overlay Alignment Tools:

When overlay is active, additional controls become available:

- **Zoom Control**: Ability to zoom in/out during overlay mode to properly align current and next scene.
- **Save Zoom Level Button**: Saves the current zoom level to the transition configuration.
- **Play Transition Button**: Tests the transition by executing the configured animation (zoom, blur, scene switch) to verify alignment and smoothness.

### Hotspot Visual Editor Functionality: On hotspot click, opens appearance settings menu:

- **Type Selector**: Image (Icon) / HTML Code.
- **Asset Loader**: Image upload button (converts to Base64 or saves to folder) OR HTML/CSS input field.
- **Preview**: Instant display of how the arrow/icon will look in the tour.

### Transition Settings Functionality: Panel appearing when selecting a hotspot (or globally):

- Input field for entry angle correction (Initial Yaw).
- Button "Set Current View as Entry" (Remembers where we're currently looking).
- Field "Zoom Target" (zoom level before jump).
- Field "Blur Amount" (blur strength).

### Live Data Updates:

- **Instant Updates**: All edits to `data.js` (scene configurations, hotspot settings, transition parameters) are applied immediately and persist in real-time.
- **No Manual Save Required**: Changes are automatically saved to the data structure as they are made.
- **Live Preview**: All modifications (hotspot appearance, transition settings, zoom levels) are reflected instantly in the viewport without requiring a page refresh or manual save action.

## 4. Component C: Runtime Player (Final Logic)

JS script that Python embeds into the final build.

### Transition Algorithm (Seamless Transition):

1. User clicks hotspot.
2. Script reads config: "Okay, center on hotspot, zoom to 2.0, blur to 5px".
3. Executes animation (Tween).
4. Switches scene.
5. **Critical moment**: When loading a new scene, the script checks `data.js`: "Where did we come from? From Scene A. So, set camera to angle Y, which we configured in the editor."
6. Removes blur.

## Final Workflow

1. Export from Marzipano Tool → `tour.zip`.
2. In terminal: `python manage_tour.py init tour.zip`.
3. Browser opens. Scene list on the left.
4. Navigate the tour. Enable overlay (50%), adjust zoom and angles of the next scene so images align.
5. Click on hotspots → change their icons (CSS/IMG).
6. Press "Save Logic" button in UI → `config.json` downloads.
7. In terminal: `python manage_tour.py build config.json`.
8. Get `final_tour.zip`.

---

# Implementation Plan

## Phase 1: Python Manager (CLI) - Core Infrastructure

### 1.1 Project Setup

- [x] Create project structure (`manage_tour.py`, `editor/` folder)
- [x] Set up Python virtual environment
- [x] Create requirements.txt (if needed for dependencies)
- [x] Initialize git repository

### 1.2 Init Mode Implementation

- [x] Implement ZIP archive extraction
- [x] Create `data.js` parser (extract JS object to Python dict)
- [x] Implement Auto-180 Logic (entry_heading calculation)
- [x] Create editor file copying mechanism (`editor.js`, `editor.css` → `app-files/`)
- [x] Implement `index.html` patching (inject editor call)
- [x] Add local HTTP server launch (http.server)
- [x] Handle error cases (invalid ZIP, missing files, etc.)

### 1.3 Build Mode Implementation

- [x] Implement `data.json` to `data.js` converter
- [x] Create `player.js` generator (runtime transition engine)
- [x] Implement editor file removal
- [x] Create final ZIP packaging
- [x] Add validation for input `config.json`
- [x] Handle build errors gracefully

### 1.4 CLI Interface

- [x] Implement command-line argument parsing (`init`, `build`)
- [x] Add help/usage messages
- [x] Add progress indicators/logging
- [x] Add error messages and exit codes

## Phase 2: Web Editor - Core UI

### 2.1 Editor Infrastructure

- [x] Create `editor.js` base structure
- [x] Create `editor.css` with base styles
- [x] Implement editor initialization and injection
- [x] Set up communication between editor and tour (Marzipano API)
- [x] Create data persistence layer (localStorage/JSON export)
- [x] Implement live data update system (instant `data.js` modifications)
- [x] Create real-time data synchronization mechanism

### 2.2 Sidebar Component

- [x] Create sidebar HTML structure
- [x] Implement scene list rendering
- [x] Add scene name display
- [x] Implement "Current" vs "Overlay" status indicators
- [x] Add scene click handlers
- [x] Implement overlay selection logic (max 2 scenes active)
- [x] Add visual feedback for selected scenes

### 2.3 Overlay Control

- [x] Create overlay opacity toggle (OFF/50%/100%)
- [x] Implement opacity switching logic
- [x] Connect opacity changes to Marzipano layer system
- [x] Add visual indicators for current opacity state
- [x] Test overlay switching performance

### 2.4 Viewport Alignment Tools

- [x] Create red center dot overlay (fixed in viewport center)
- [x] Implement zoom control during overlay mode
- [x] Add "Save Zoom Level" button functionality
- [x] Create "Play Transition" button (test transition animation)
- [x] Implement transition preview/test execution
- [x] Connect zoom save to transition configuration

## Phase 3: Hotspot Editor

### 3.1 Hotspot Detection & Selection

- [ ] Implement hotspot click detection
- [ ] Create hotspot selection highlighting
- [ ] Add hotspot context menu/panel trigger

### 3.2 Hotspot Visual Editor UI

- [ ] Create hotspot settings panel/modal
- [ ] Implement type selector (Image/HTML Code)
- [ ] Add image upload functionality (Base64 conversion)
- [ ] Create HTML/CSS input field
- [ ] Implement asset folder management (if using file-based assets)
- [ ] Add preview functionality (instant visual feedback)
- [ ] Create preview rendering system

### 3.3 Hotspot Data Management

- [ ] Implement hotspot data structure updates
- [ ] Add hotspot configuration save/load
- [ ] Connect visual changes to hotspot rendering
- [ ] Test hotspot appearance updates in real-time
- [ ] Ensure instant updates to `data.js` when hotspot changes are made
- [ ] Implement live preview of hotspot modifications

## Phase 4: Transition Settings

### 4.1 Transition Settings Panel

- [x] Create transition settings UI panel
- [x] Add Initial Yaw input field
- [x] Implement "Set Current View as Entry" button
- [ ] Add Zoom Target input field (UI exists, not implemented)
- [ ] Add Blur Amount input field (UI exists, not implemented)
- [x] Create input validation

### 4.2 Transition Data Management

- [x] Implement transition config storage
- [x] Connect settings to hotspot data
- [ ] Add transition preview (if possible)
- [x] Implement data export for transitions
- [x] Ensure instant updates to `data.js` when transition settings change
- [ ] Implement "Play Transition" button functionality (placeholder exists)
- [ ] Add zoom level save/restore for transitions
- [ ] Create transition test execution system

### 4.3 Zoom Limits (TODO)

- [ ] Find and document zoom limit blockers in Marzipano code
- [ ] Implement zoom limit removal before transitions
- [ ] Implement zoom limit restoration after transitions
- [ ] Allow deep zooming during transitions only
- [ ] Maintain user zoom restrictions during normal operation

## Phase 5: Runtime Player

### 5.1 Player Core

- [ ] Create `player.js` base structure
- [ ] Implement config reading from `data.js`
- [ ] Set up scene transition event handlers
- [ ] Create transition state machine

### 5.2 Seamless Transition Algorithm

- [ ] Implement hotspot click detection
- [ ] Create config reading logic (zoom, blur, centering)
- [ ] Implement animation/Tween system
- [ ] Add scene switching logic
- [ ] Implement entry angle application (from Auto-180 logic)
- [ ] Add blur removal after transition
- [ ] Test transition smoothness

### 5.3 Entry Angle Logic

- [ ] Implement source scene detection
- [ ] Add entry_heading lookup from metadata
- [ ] Create camera positioning on scene load
- [ ] Test angle accuracy

## Phase 6: Integration & Testing

### 6.1 End-to-End Workflow

- [ ] Test complete init → edit → build workflow
- [ ] Verify ZIP export/import cycle
- [ ] Test editor file injection/removal
- [ ] Validate final tour functionality

### 6.2 Editor Integration Testing

- [ ] Test editor loading in various tour configurations
- [ ] Verify sidebar scene list accuracy
- [ ] Test overlay switching with multiple scenes
- [ ] Validate hotspot editing across different hotspot types
- [ ] Test transition settings persistence

### 6.3 Runtime Player Testing

- [ ] Test transitions with various configurations
- [ ] Verify entry angles are applied correctly
- [ ] Test zoom and blur effects
- [ ] Validate seamless transition smoothness
- [ ] Test edge cases (rapid clicking, invalid configs)

### 6.4 Error Handling

- [ ] Add error handling for malformed ZIP files
- [ ] Handle missing or corrupted `data.js`
- [ ] Add validation for invalid JSON configs
- [ ] Implement graceful degradation for missing features
- [ ] Add user-friendly error messages

## Phase 7: Documentation & Polish

### 7.1 Documentation

- [x] Create README with installation instructions
- [x] Document CLI usage (init, build commands)
- [x] Create editor usage guide
- [x] Document data structure formats
- [x] Add code comments and docstrings

### 7.2 UI/UX Polish

- [ ] Improve editor visual design
- [ ] Add loading indicators
- [ ] Implement keyboard shortcuts (if applicable)
- [ ] Add tooltips and help text
- [ ] Optimize editor performance

### 7.3 Final Testing

- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Memory leak testing
- [ ] Final integration tests
- [ ] User acceptance testing
