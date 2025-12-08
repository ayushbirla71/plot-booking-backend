const { Layout, Plot } = require('../models');

/**
 * Generate an admin tool page for drawing plots on layout
 */
const getPlotDrawingTool = async (req, res) => {
  try {
    const { id } = req.params;

    const layout = await Layout.findByPk(id, {
      include: [{ model: Plot, as: 'plots' }]
    });

    if (!layout) {
      return res.status(404).json({ success: false, message: 'Layout not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const plots = layout.plots || [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plot Drawing Tool - ${layout.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: white; }
    .header { background: #16213e; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .header h1 { font-size: 14px; }
    .header-info { font-size: 12px; }
    .container { display: flex; flex-direction: column; min-height: calc(100vh - 60px); }
    .canvas-area { flex: 1; overflow: auto; padding: 10px; background: #0f0f23; -webkit-overflow-scrolling: touch; }
    .sidebar { background: #16213e; padding: 15px; overflow-y: auto; max-height: 50vh; }
    .canvas-wrapper { position: relative; display: inline-block; cursor: crosshair; touch-action: none; }
    .layout-image { display: block; max-width: 100%; }
    .plot-rect { position: absolute; border: 2px solid; background: rgba(34, 197, 94, 0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white; text-shadow: 1px 1px 2px black; }
    .plot-rect.available { background: rgba(34, 197, 94, 0.4); border-color: #16a34a; }
    .plot-rect.hold { background: rgba(234, 179, 8, 0.4); border-color: #ca8a04; }
    .plot-rect.booked { background: rgba(239, 68, 68, 0.4); border-color: #dc2626; }
    .plot-rect.drawing { background: rgba(59, 130, 246, 0.5); border-color: #3b82f6; border-style: dashed; }
    .plot-rect.selection { background: rgba(147, 51, 234, 0.5); border-color: #9333ea; border-width: 3px; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .plot-rect:hover { opacity: 0.8; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 4px; font-size: 12px; color: #a0a0a0; }
    .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #333; background: #0f0f23; color: white; border-radius: 5px; font-size: 14px; }
    .btn { padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; margin-right: 5px; margin-bottom: 5px; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-success { background: #22c55e; color: white; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-secondary { background: #6b7280; color: white; }
    .btn:hover { opacity: 0.9; }
    .plot-list { margin-top: 15px; max-height: 200px; overflow-y: auto; }
    .plot-item { background: #0f0f23; padding: 8px; margin-bottom: 5px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
    .plot-item .info { font-size: 12px; }
    .plot-item .status { font-size: 10px; padding: 2px 6px; border-radius: 3px; }
    .status.available { background: #22c55e; }
    .status.hold { background: #eab308; }
    .status.booked { background: #ef4444; }
    .instructions { background: #0f0f23; padding: 12px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; line-height: 1.5; }
    .coords-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
    #jsonOutput { width: 100%; height: 100px; background: #0f0f23; color: #22c55e; border: 1px solid #333; border-radius: 5px; font-family: monospace; font-size: 10px; padding: 8px; resize: vertical; }
    .toggle-sidebar { display: block; width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; font-size: 14px; cursor: pointer; }
    .sidebar-content { display: none; }
    .sidebar-content.show { display: block; }

    /* Desktop styles */
    @media (min-width: 768px) {
      .header h1 { font-size: 18px; }
      .header-info { font-size: 14px; }
      .container { flex-direction: row; height: calc(100vh - 60px); }
      .canvas-area { padding: 20px; }
      .sidebar { width: 350px; max-height: none; padding: 20px; }
      .toggle-sidebar { display: none; }
      .sidebar-content { display: block !important; }
      .plot-rect { font-size: 11px; }
      .form-group input, .form-group select { padding: 10px; }
      .plot-list { max-height: 300px; }
      #jsonOutput { height: 150px; font-size: 11px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 ${layout.name}</h1>
    <div class="header-info">
      <span id="coordsDisplay">X: 0, Y: 0</span>
      <span style="margin-left: 10px;">${layout.imageWidth}x${layout.imageHeight}</span>
    </div>
  </div>

  <div class="container">
    <div class="canvas-area">
      <div class="canvas-wrapper" id="canvasWrapper">
        <img src="${baseUrl}${layout.imageUrl}" alt="${layout.name}" class="layout-image" id="layoutImage">
        <div id="plotsContainer"></div>
        <div id="drawingRect" class="plot-rect drawing" style="display:none;"></div>
        <div id="selectionRect" class="plot-rect selection" style="display:none;"></div>
      </div>
    </div>

    <div class="sidebar">
      <button class="toggle-sidebar" onclick="toggleSidebar()">📝 Show/Hide Form</button>
      <div class="sidebar-content" id="sidebarContent">
        <div class="instructions">
          <strong>📋 How to use:</strong><br>
          1. Tap and drag to draw plot<br>
          2. Fill details → Add Plot<br>
          3. Save to server when done
        </div>

        <div class="form-group">
          <label>Plot Number *</label>
          <input type="text" id="plotNumber" placeholder="e.g., 101">
        </div>

        <div class="coords-grid">
          <div class="form-group">
            <label>X</label>
            <input type="number" id="plotX" readonly>
          </div>
          <div class="form-group">
            <label>Y</label>
            <input type="number" id="plotY" readonly>
          </div>
          <div class="form-group">
            <label>W</label>
            <input type="number" id="plotWidth" readonly>
          </div>
          <div class="form-group">
            <label>H</label>
            <input type="number" id="plotHeight" readonly>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label>Status</label>
            <select id="plotStatus">
              <option value="available">Available</option>
              <option value="hold">On Hold</option>
              <option value="booked">Booked</option>
            </select>
          </div>
          <div class="form-group">
            <label>Facing</label>
            <select id="plotFacing">
              <option value="">Select</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="N-E">N-E</option>
              <option value="N-W">N-W</option>
              <option value="S-E">S-E</option>
              <option value="S-W">S-W</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label>Price</label>
            <input type="number" id="plotPrice" placeholder="500000">
          </div>
          <div class="form-group">
            <label>Size</label>
            <input type="text" id="plotSize" placeholder="30x40">
          </div>
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="addBtn" class="btn btn-success" onclick="addPlot()" style="flex:1;">➕ Add</button>
          <button id="updateBtn" class="btn btn-primary" onclick="updatePlot()" style="flex:1; display:none;">✏️ Update</button>
          <button class="btn btn-secondary" onclick="clearForm()">Clear</button>
        </div>

        <h3 style="margin-bottom: 10px; font-size: 14px;">📦 Plots (${plots.length} + <span id="newCount">0</span> new)</h3>

        <div class="plot-list" id="plotList"></div>

        <button class="btn btn-success" onclick="saveToServer()" style="width: 100%; margin-top: 10px;">💾 Save New Plots</button>

        <button class="btn btn-primary" onclick="exportJSON()" style="width: 100%; margin-top: 8px;">📋 Export JSON</button>
        <textarea id="jsonOutput" style="margin-top: 8px;"></textarea>
      </div>
    </div>
  </div>

  <script>
    const layoutId = "${layout.id}";
    const imageWidth = ${layout.imageWidth};
    const imageHeight = ${layout.imageHeight};
    const existingPlots = ${JSON.stringify(plots.map(p => ({ id: p.id, plotNumber: p.plotNumber, x: p.x, y: p.y, width: p.width, height: p.height, status: p.status, price: p.price, size: p.size, facing: p.facing })))};

    let newPlots = [];
    let isDrawing = false;
    let startX, startY;

    const wrapper = document.getElementById('canvasWrapper');
    const image = document.getElementById('layoutImage');
    const drawingRect = document.getElementById('drawingRect');
    const selectionRect = document.getElementById('selectionRect');
    const plotsContainer = document.getElementById('plotsContainer');
    const coordsDisplay = document.getElementById('coordsDisplay');

    // Toggle sidebar on mobile
    function toggleSidebar() {
      const content = document.getElementById('sidebarContent');
      content.classList.toggle('show');
    }

    // Get scaled coordinates from mouse or touch event
    function getScaledCoords(e) {
      const rect = image.getBoundingClientRect();
      const scaleX = imageWidth / rect.width;
      const scaleY = imageHeight / rect.height;
      // Handle touch events
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY)
      };
    }

    // Update drawing rect position
    function updateDrawingRect(coords) {
      const rect = image.getBoundingClientRect();
      const scaleX = rect.width / imageWidth;
      const scaleY = rect.height / imageHeight;

      const w = coords.x - startX;
      const h = coords.y - startY;

      drawingRect.style.left = (Math.min(startX, coords.x) * scaleX) + 'px';
      drawingRect.style.top = (Math.min(startY, coords.y) * scaleY) + 'px';
      drawingRect.style.width = (Math.abs(w) * scaleX) + 'px';
      drawingRect.style.height = (Math.abs(h) * scaleY) + 'px';
    }

    // Start drawing
    function startDrawing(e) {
      if (e.target === image || e.target === plotsContainer || plotsContainer.contains(e.target)) {
        isDrawing = true;
        const coords = getScaledCoords(e);
        startX = coords.x;
        startY = coords.y;
        drawingRect.style.display = 'block';
        drawingRect.style.left = '0';
        drawingRect.style.top = '0';
        drawingRect.style.width = '0';
        drawingRect.style.height = '0';
      }
    }

    // End drawing
    function endDrawing(e) {
      if (isDrawing) {
        isDrawing = false;
        const coords = getScaledCoords(e.changedTouches ? e.changedTouches[0] : e);

        const x = Math.min(startX, coords.x);
        const y = Math.min(startY, coords.y);
        const w = Math.abs(coords.x - startX);
        const h = Math.abs(coords.y - startY);

        if (w > 5 && h > 5) {
          document.getElementById('plotX').value = x;
          document.getElementById('plotY').value = y;
          document.getElementById('plotWidth').value = w;
          document.getElementById('plotHeight').value = h;

          // Show selection rectangle while filling form
          const rect = image.getBoundingClientRect();
          const scaleX = rect.width / imageWidth;
          const scaleY = rect.height / imageHeight;
          selectionRect.style.display = 'flex';
          selectionRect.style.left = (x * scaleX) + 'px';
          selectionRect.style.top = (y * scaleY) + 'px';
          selectionRect.style.width = (w * scaleX) + 'px';
          selectionRect.style.height = (h * scaleY) + 'px';

          // Show sidebar on mobile after drawing
          document.getElementById('sidebarContent').classList.add('show');
        }

        drawingRect.style.display = 'none';
      }
    }

    // Mouse events
    wrapper.addEventListener('mousemove', (e) => {
      const coords = getScaledCoords(e);
      coordsDisplay.textContent = 'X: ' + coords.x + ', Y: ' + coords.y;
      if (isDrawing) updateDrawingRect(coords);
    });
    wrapper.addEventListener('mousedown', startDrawing);
    wrapper.addEventListener('mouseup', endDrawing);

    // Touch events for mobile
    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        startDrawing(e);
      }
    }, { passive: false });

    wrapper.addEventListener('touchmove', (e) => {
      if (isDrawing && e.touches.length === 1) {
        e.preventDefault();
        const coords = getScaledCoords(e);
        coordsDisplay.textContent = 'X: ' + coords.x + ', Y: ' + coords.y;
        updateDrawingRect(coords);
      }
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
      if (isDrawing) {
        e.preventDefault();
        endDrawing(e);
      }
    }, { passive: false });
    
    let selectedPlotId = null;
    let selectedPlotIsNew = false;
    let selectedPlotIndex = -1;

    // Get token from localStorage
    function getToken() {
      return localStorage.getItem('token');
    }

    function renderPlots() {
      plotsContainer.innerHTML = '';
      const rect = image.getBoundingClientRect();
      const scaleX = rect.width / imageWidth;
      const scaleY = rect.height / imageHeight;

      [...existingPlots, ...newPlots].forEach((plot, idx) => {
        const div = document.createElement('div');
        div.className = 'plot-rect ' + plot.status;
        div.style.left = (plot.x * scaleX) + 'px';
        div.style.top = (plot.y * scaleY) + 'px';
        div.style.width = (plot.width * scaleX) + 'px';
        div.style.height = (plot.height * scaleY) + 'px';
        div.textContent = plot.plotNumber;
        const isNew = idx >= existingPlots.length;
        div.onclick = () => selectPlot(plot, idx, isNew);
        plotsContainer.appendChild(div);
      });

      updatePlotList();
    }

    function updatePlotList() {
      const list = document.getElementById('plotList');
      list.innerHTML = '';

      existingPlots.forEach((plot, idx) => {
        const div = document.createElement('div');
        div.className = 'plot-item';
        div.innerHTML = '<div class="info" onclick="selectPlot(existingPlots[' + idx + '], ' + idx + ', false)"><strong>' + plot.plotNumber + '</strong> <span style="font-size:10px;color:#888;">(saved)</span></div><div><span class="status ' + plot.status + '">' + plot.status + '</span> <button onclick="deletePlot(\\'' + plot.id + '\\', false)" style="background:#ef4444;color:white;border:none;padding:2px 6px;border-radius:3px;cursor:pointer;margin-left:4px;">✕</button></div>';
        list.appendChild(div);
      });

      newPlots.forEach((plot, idx) => {
        const div = document.createElement('div');
        div.className = 'plot-item';
        div.innerHTML = '<div class="info" onclick="selectPlot(newPlots[' + idx + '], ' + (existingPlots.length + idx) + ', true)"><strong>' + plot.plotNumber + '</strong> <span style="font-size:10px;color:#22c55e;">(new)</span></div><div><span class="status ' + plot.status + '">' + plot.status + '</span> <button onclick="removeNewPlot(' + idx + ')" style="background:#ef4444;color:white;border:none;padding:2px 6px;border-radius:3px;cursor:pointer;margin-left:4px;">✕</button></div>';
        list.appendChild(div);
      });

      document.getElementById('newCount').textContent = newPlots.length;
    }

    function addPlot() {
      const plotNumber = document.getElementById('plotNumber').value;
      const x = parseInt(document.getElementById('plotX').value);
      const y = parseInt(document.getElementById('plotY').value);
      const width = parseInt(document.getElementById('plotWidth').value);
      const height = parseInt(document.getElementById('plotHeight').value);

      if (!plotNumber || !x || !y || !width || !height) {
        alert('Please draw a rectangle and enter plot number');
        return;
      }

      newPlots.push({
        plotNumber,
        x, y, width, height,
        status: document.getElementById('plotStatus').value,
        price: parseFloat(document.getElementById('plotPrice').value) || null,
        size: document.getElementById('plotSize').value || null,
        facing: document.getElementById('plotFacing').value || null
      });

      clearForm();
      renderPlots();
    }

    function clearForm() {
      document.getElementById('plotNumber').value = '';
      document.getElementById('plotX').value = '';
      document.getElementById('plotY').value = '';
      document.getElementById('plotWidth').value = '';
      document.getElementById('plotHeight').value = '';
      document.getElementById('plotPrice').value = '';
      document.getElementById('plotSize').value = '';
      document.getElementById('plotFacing').value = '';
      selectionRect.style.display = 'none';
      selectedPlotId = null;
      selectedPlotIsNew = false;
      selectedPlotIndex = -1;
      document.getElementById('updateBtn').style.display = 'none';
      document.getElementById('addBtn').style.display = 'inline-block';
    }

    function selectPlot(plot, idx, isNew) {
      document.getElementById('plotNumber').value = plot.plotNumber;
      document.getElementById('plotX').value = plot.x;
      document.getElementById('plotY').value = plot.y;
      document.getElementById('plotWidth').value = plot.width;
      document.getElementById('plotHeight').value = plot.height;
      document.getElementById('plotStatus').value = plot.status;
      document.getElementById('plotPrice').value = plot.price || '';
      document.getElementById('plotSize').value = plot.size || '';
      document.getElementById('plotFacing').value = plot.facing || '';

      selectedPlotId = plot.id || null;
      selectedPlotIsNew = isNew;
      selectedPlotIndex = isNew ? idx - existingPlots.length : idx;

      // Show update button for existing plots
      if (!isNew && plot.id) {
        document.getElementById('updateBtn').style.display = 'inline-block';
        document.getElementById('addBtn').style.display = 'none';
      } else if (isNew) {
        document.getElementById('updateBtn').style.display = 'inline-block';
        document.getElementById('addBtn').style.display = 'none';
      } else {
        document.getElementById('updateBtn').style.display = 'none';
        document.getElementById('addBtn').style.display = 'inline-block';
      }

      // Show selection on map
      const rect = image.getBoundingClientRect();
      const scaleX = rect.width / imageWidth;
      const scaleY = rect.height / imageHeight;
      selectionRect.style.display = 'flex';
      selectionRect.style.left = (plot.x * scaleX) + 'px';
      selectionRect.style.top = (plot.y * scaleY) + 'px';
      selectionRect.style.width = (plot.width * scaleX) + 'px';
      selectionRect.style.height = (plot.height * scaleY) + 'px';

      // Show sidebar on mobile
      document.getElementById('sidebarContent').classList.add('show');
    }

    // Remove new (unsaved) plot
    function removeNewPlot(idx) {
      if (confirm('Remove this new plot?')) {
        newPlots.splice(idx, 1);
        clearForm();
        renderPlots();
      }
    }

    // Delete existing plot from server
    async function deletePlot(plotId, isNew) {
      if (!confirm('Delete this plot permanently?')) return;

      const token = getToken();
      if (!token) {
        alert('No auth token found. Please login again.');
        return;
      }

      try {
        const response = await fetch('/api/plots/' + plotId, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await response.json();
        if (data.success) {
          alert('Plot deleted successfully!');
          // Remove from existingPlots array
          const idx = existingPlots.findIndex(p => p.id === plotId);
          if (idx > -1) existingPlots.splice(idx, 1);
          clearForm();
          renderPlots();
        } else {
          alert('Error: ' + data.message);
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    // Update existing plot
    async function updatePlot() {
      const plotNumber = document.getElementById('plotNumber').value;
      const x = parseInt(document.getElementById('plotX').value);
      const y = parseInt(document.getElementById('plotY').value);
      const width = parseInt(document.getElementById('plotWidth').value);
      const height = parseInt(document.getElementById('plotHeight').value);

      if (!plotNumber) {
        alert('Please enter plot number');
        return;
      }

      const updatedData = {
        plotNumber,
        x, y, width, height,
        status: document.getElementById('plotStatus').value,
        price: parseFloat(document.getElementById('plotPrice').value) || null,
        size: document.getElementById('plotSize').value || null,
        facing: document.getElementById('plotFacing').value || null
      };

      // If it's a new plot (not saved yet), update locally
      if (selectedPlotIsNew) {
        newPlots[selectedPlotIndex] = updatedData;
        clearForm();
        renderPlots();
        alert('Plot updated locally. Save to server to persist.');
        return;
      }

      // Update existing plot on server
      const token = getToken();
      if (!token) {
        alert('No auth token found. Please login again.');
        return;
      }

      try {
        const response = await fetch('/api/plots/' + selectedPlotId, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(updatedData)
        });

        const data = await response.json();
        if (data.success) {
          alert('Plot updated successfully!');
          // Update in existingPlots array
          const idx = existingPlots.findIndex(p => p.id === selectedPlotId);
          if (idx > -1) {
            existingPlots[idx] = { ...existingPlots[idx], ...updatedData };
          }
          clearForm();
          renderPlots();
        } else {
          alert('Error: ' + data.message);
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function exportJSON() {
      const json = {
        layoutId: layoutId,
        plots: newPlots
      };
      document.getElementById('jsonOutput').value = JSON.stringify(json, null, 2);
    }

    async function saveToServer() {
      if (newPlots.length === 0) {
        alert('No new plots to save');
        return;
      }

      const token = getToken();
      if (!token) {
        alert('No auth token found. Please login again.');
        return;
      }

      try {
        const response = await fetch('/api/plots/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ layoutId, plots: newPlots })
        });

        const data = await response.json();
        if (data.success) {
          alert('Saved ' + data.data.length + ' plots successfully!');
          location.reload();
        } else {
          alert('Error: ' + data.message);
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
    
    function updateSelectionRect() {
      const x = parseInt(document.getElementById('plotX').value);
      const y = parseInt(document.getElementById('plotY').value);
      const w = parseInt(document.getElementById('plotWidth').value);
      const h = parseInt(document.getElementById('plotHeight').value);
      if (x && y && w && h) {
        const rect = image.getBoundingClientRect();
        const scaleX = rect.width / imageWidth;
        const scaleY = rect.height / imageHeight;
        selectionRect.style.left = (x * scaleX) + 'px';
        selectionRect.style.top = (y * scaleY) + 'px';
        selectionRect.style.width = (w * scaleX) + 'px';
        selectionRect.style.height = (h * scaleY) + 'px';
      }
    }

    image.onload = renderPlots;
    window.addEventListener('resize', () => { renderPlots(); updateSelectionRect(); });
    renderPlots();
  </script>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Admin tool error:', error);
    res.status(500).json({ success: false, message: 'Error loading admin tool' });
  }
};

module.exports = { getPlotDrawingTool };

