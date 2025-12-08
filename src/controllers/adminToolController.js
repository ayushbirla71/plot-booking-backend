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
    .header { background: #16213e; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 18px; }
    .container { display: flex; height: calc(100vh - 60px); }
    .canvas-area { flex: 1; overflow: auto; padding: 20px; background: #0f0f23; }
    .sidebar { width: 350px; background: #16213e; padding: 20px; overflow-y: auto; }
    .canvas-wrapper { position: relative; display: inline-block; cursor: crosshair; }
    .layout-image { display: block; max-width: 100%; }
    .plot-rect { position: absolute; border: 2px solid; background: rgba(34, 197, 94, 0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white; text-shadow: 1px 1px 2px black; }
    .plot-rect.available { background: rgba(34, 197, 94, 0.4); border-color: #16a34a; }
    .plot-rect.hold { background: rgba(234, 179, 8, 0.4); border-color: #ca8a04; }
    .plot-rect.booked { background: rgba(239, 68, 68, 0.4); border-color: #dc2626; }
    .plot-rect.drawing { background: rgba(59, 130, 246, 0.5); border-color: #3b82f6; border-style: dashed; }
    .plot-rect:hover { opacity: 0.8; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-size: 13px; color: #a0a0a0; }
    .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #333; background: #0f0f23; color: white; border-radius: 5px; }
    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 5px; margin-bottom: 5px; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-success { background: #22c55e; color: white; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-secondary { background: #6b7280; color: white; }
    .btn:hover { opacity: 0.9; }
    .plot-list { margin-top: 20px; max-height: 300px; overflow-y: auto; }
    .plot-item { background: #0f0f23; padding: 10px; margin-bottom: 5px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
    .plot-item .info { font-size: 13px; }
    .plot-item .status { font-size: 11px; padding: 2px 6px; border-radius: 3px; }
    .status.available { background: #22c55e; }
    .status.hold { background: #eab308; }
    .status.booked { background: #ef4444; }
    .instructions { background: #0f0f23; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
    .coords { font-family: monospace; background: #0f0f23; padding: 10px; border-radius: 5px; font-size: 12px; margin-top: 10px; }
    #jsonOutput { width: 100%; height: 150px; background: #0f0f23; color: #22c55e; border: 1px solid #333; border-radius: 5px; font-family: monospace; font-size: 11px; padding: 10px; resize: vertical; }
    .tabs { display: flex; margin-bottom: 15px; }
    .tab { padding: 10px 15px; background: #0f0f23; cursor: pointer; border-radius: 5px 5px 0 0; }
    .tab.active { background: #3b82f6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 Plot Drawing Tool: ${layout.name}</h1>
    <div>
      <span id="coordsDisplay">X: 0, Y: 0</span>
      <span style="margin-left: 20px;">Image: ${layout.imageWidth} x ${layout.imageHeight}</span>
    </div>
  </div>
  
  <div class="container">
    <div class="canvas-area">
      <div class="canvas-wrapper" id="canvasWrapper">
        <img src="${baseUrl}${layout.imageUrl}" alt="${layout.name}" class="layout-image" id="layoutImage">
        <div id="plotsContainer"></div>
        <div id="drawingRect" class="plot-rect drawing" style="display:none;"></div>
      </div>
    </div>
    
    <div class="sidebar">
      <div class="instructions">
        <strong>📋 Instructions:</strong><br>
        1. Click and drag on the image to draw a plot<br>
        2. Fill in plot details in the form<br>
        3. Click "Add Plot" to save<br>
        4. Export JSON when done
      </div>
      
      <div class="form-group">
        <label>Plot Number *</label>
        <input type="text" id="plotNumber" placeholder="e.g., 101">
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="form-group">
          <label>X</label>
          <input type="number" id="plotX" readonly>
        </div>
        <div class="form-group">
          <label>Y</label>
          <input type="number" id="plotY" readonly>
        </div>
        <div class="form-group">
          <label>Width</label>
          <input type="number" id="plotWidth" readonly>
        </div>
        <div class="form-group">
          <label>Height</label>
          <input type="number" id="plotHeight" readonly>
        </div>
      </div>
      
      <div class="form-group">
        <label>Status</label>
        <select id="plotStatus">
          <option value="available">Available</option>
          <option value="hold">On Hold</option>
          <option value="booked">Booked</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Price</label>
        <input type="number" id="plotPrice" placeholder="e.g., 500000">
      </div>
      
      <div class="form-group">
        <label>Size</label>
        <input type="text" id="plotSize" placeholder="e.g., 30x40">
      </div>
      
      <div class="form-group">
        <label>Facing</label>
        <select id="plotFacing">
          <option value="">Select</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
          <option value="North-East">North-East</option>
          <option value="North-West">North-West</option>
          <option value="South-East">South-East</option>
          <option value="South-West">South-West</option>
        </select>
      </div>
      
      <div style="margin-bottom: 15px;">
        <button class="btn btn-success" onclick="addPlot()">➕ Add Plot</button>
        <button class="btn btn-secondary" onclick="clearForm()">Clear</button>
      </div>
      
      <hr style="border-color: #333; margin: 20px 0;">
      
      <h3 style="margin-bottom: 10px;">📦 Plots (${plots.length} existing + <span id="newCount">0</span> new)</h3>
      
      <div class="plot-list" id="plotList"></div>
      
      <hr style="border-color: #333; margin: 20px 0;">
      
      <button class="btn btn-primary" onclick="exportJSON()" style="width: 100%;">📋 Export JSON for API</button>
      <textarea id="jsonOutput" style="margin-top: 10px;"></textarea>
      
      <button class="btn btn-success" onclick="saveToServer()" style="width: 100%; margin-top: 10px;">💾 Save All to Server</button>
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
    const plotsContainer = document.getElementById('plotsContainer');
    const coordsDisplay = document.getElementById('coordsDisplay');
    
    function getScaledCoords(e) {
      const rect = image.getBoundingClientRect();
      const scaleX = imageWidth / rect.width;
      const scaleY = imageHeight / rect.height;
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY)
      };
    }
    
    wrapper.addEventListener('mousemove', (e) => {
      const coords = getScaledCoords(e);
      coordsDisplay.textContent = 'X: ' + coords.x + ', Y: ' + coords.y;
      
      if (isDrawing) {
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
    });
    
    wrapper.addEventListener('mousedown', (e) => {
      if (e.target === image || e.target === plotsContainer) {
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
    });
    
    wrapper.addEventListener('mouseup', (e) => {
      if (isDrawing) {
        isDrawing = false;
        const coords = getScaledCoords(e);
        
        const x = Math.min(startX, coords.x);
        const y = Math.min(startY, coords.y);
        const w = Math.abs(coords.x - startX);
        const h = Math.abs(coords.y - startY);
        
        if (w > 5 && h > 5) {
          document.getElementById('plotX').value = x;
          document.getElementById('plotY').value = y;
          document.getElementById('plotWidth').value = w;
          document.getElementById('plotHeight').value = h;
        }
        
        drawingRect.style.display = 'none';
      }
    });
    
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
        div.onclick = () => selectPlot(plot, idx);
        plotsContainer.appendChild(div);
      });
      
      updatePlotList();
    }
    
    function updatePlotList() {
      const list = document.getElementById('plotList');
      list.innerHTML = '';
      
      [...existingPlots, ...newPlots].forEach((plot, idx) => {
        const div = document.createElement('div');
        div.className = 'plot-item';
        div.innerHTML = '<div class="info"><strong>' + plot.plotNumber + '</strong><br>(' + plot.x + ', ' + plot.y + ') ' + plot.width + 'x' + plot.height + '</div><span class="status ' + plot.status + '">' + plot.status + '</span>';
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
    }
    
    function selectPlot(plot, idx) {
      document.getElementById('plotNumber').value = plot.plotNumber;
      document.getElementById('plotX').value = plot.x;
      document.getElementById('plotY').value = plot.y;
      document.getElementById('plotWidth').value = plot.width;
      document.getElementById('plotHeight').value = plot.height;
      document.getElementById('plotStatus').value = plot.status;
      document.getElementById('plotPrice').value = plot.price || '';
      document.getElementById('plotSize').value = plot.size || '';
      document.getElementById('plotFacing').value = plot.facing || '';
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
      
      const token = prompt('Enter your admin JWT token:');
      if (!token) return;
      
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
    
    image.onload = renderPlots;
    window.addEventListener('resize', renderPlots);
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

