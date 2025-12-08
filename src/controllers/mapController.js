const { Layout, Plot } = require('../models');
const path = require('path');

// Status colors for plots
const STATUS_COLORS = {
  available: { fill: '#22c55e', stroke: '#16a34a', label: 'Available' },  // Green
  hold: { fill: '#eab308', stroke: '#ca8a04', label: 'On Hold' },         // Yellow
  booked: { fill: '#ef4444', stroke: '#dc2626', label: 'Booked' }         // Red
};

/**
 * Generate complete SVG map with interactive plots
 * Frontend just embeds this SVG directly
 */
const generateSVGMap = async (req, res) => {
  try {
    const { id } = req.params;
    const { showLabels = 'true', showLegend = 'true', opacity = '0.6' } = req.query;

    const layout = await Layout.findByPk(id, {
      include: [{ model: Plot, as: 'plots' }]
    });

    if (!layout) {
      return res.status(404).json({ success: false, message: 'Layout not found' });
    }

    const plots = layout.plots || [];
    const plotOpacity = parseFloat(opacity);

    // Build SVG content
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${layout.imageWidth} ${layout.imageHeight}"
     width="100%" height="100%"
     style="max-width: ${layout.imageWidth}px;">
  
  <!-- Background Layout Image -->
  <image href="${req.protocol}://${req.get('host')}${layout.imageUrl}" 
         width="${layout.imageWidth}" height="${layout.imageHeight}" />
  
  <!-- Plot Areas -->
  <g id="plots">
`;

    // Add each plot as a clickable rectangle
    plots.forEach(plot => {
      const color = STATUS_COLORS[plot.status] || STATUS_COLORS.available;
      
      svg += `    <g class="plot" data-plot-id="${plot.id}" data-status="${plot.status}">
      <rect 
        x="${plot.x}" y="${plot.y}" 
        width="${plot.width}" height="${plot.height}"
        fill="${color.fill}" fill-opacity="${plotOpacity}"
        stroke="${color.stroke}" stroke-width="2"
        style="cursor: pointer;"
        onclick="window.onPlotClick && window.onPlotClick('${plot.id}', '${plot.plotNumber}', '${plot.status}')"
        onmouseover="this.style.fillOpacity='0.8'"
        onmouseout="this.style.fillOpacity='${plotOpacity}'"
      />
`;
      
      // Add plot number label if enabled
      if (showLabels === 'true') {
        const labelX = plot.x + plot.width / 2;
        const labelY = plot.y + plot.height / 2;
        const fontSize = Math.min(plot.width, plot.height) * 0.4;
        
        svg += `      <text 
        x="${labelX}" y="${labelY}" 
        text-anchor="middle" dominant-baseline="middle"
        font-size="${fontSize}px" font-weight="bold" 
        fill="#ffffff" stroke="#000000" stroke-width="0.5"
        style="pointer-events: none;">
        ${plot.plotNumber}
      </text>
`;
      }
      
      svg += `    </g>\n`;
    });

    svg += `  </g>\n`;

    // Add legend if enabled
    if (showLegend === 'true') {
      svg += `
  <!-- Legend -->
  <g id="legend" transform="translate(10, 10)">
    <rect x="0" y="0" width="120" height="90" fill="white" fill-opacity="0.9" rx="5"/>
    <text x="10" y="20" font-size="12" font-weight="bold">Legend</text>
    
    <rect x="10" y="30" width="20" height="15" fill="${STATUS_COLORS.available.fill}"/>
    <text x="35" y="42" font-size="11">Available</text>
    
    <rect x="10" y="50" width="20" height="15" fill="${STATUS_COLORS.hold.fill}"/>
    <text x="35" y="62" font-size="11">On Hold</text>
    
    <rect x="10" y="70" width="20" height="15" fill="${STATUS_COLORS.booked.fill}"/>
    <text x="35" y="82" font-size="11">Booked</text>
  </g>
`;
    }

    svg += `</svg>`;

    res.set('Content-Type', 'image/svg+xml');
    res.send(svg);

  } catch (error) {
    console.error('Generate SVG map error:', error);
    res.status(500).json({ success: false, message: 'Error generating map' });
  }
};

/**
 * Generate complete HTML page with interactive map
 * Can be embedded in iframe or used standalone
 */
const generateHTMLMap = async (req, res) => {
  try {
    const { id } = req.params;
    const { callback = 'onPlotClick' } = req.query;

    const layout = await Layout.findByPk(id, {
      include: [{ model: Plot, as: 'plots' }]
    });

    if (!layout) {
      return res.status(404).json({ success: false, message: 'Layout not found' });
    }

    const plots = layout.plots || [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${layout.name} - Interactive Map</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #1a1a1a; }
    
    .map-container {
      position: relative;
      width: 100%;
      max-width: ${layout.imageWidth}px;
      margin: 0 auto;
      overflow: hidden;
    }
    
    .map-wrapper {
      position: relative;
      width: 100%;
      cursor: grab;
    }
    
    .map-wrapper.dragging { cursor: grabbing; }
    
    .layout-image {
      width: 100%;
      display: block;
      user-select: none;
      -webkit-user-drag: none;
    }
    
    .plots-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .plot {
      position: absolute;
      border: 2px solid;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      color: white;
      text-shadow: 1px 1px 2px black;
      transition: all 0.2s ease;
    }
    
    .plot:hover {
      transform: scale(1.05);
      z-index: 100;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    
    .plot.available { background: rgba(34, 197, 94, 0.6); border-color: #16a34a; }
    .plot.hold { background: rgba(234, 179, 8, 0.6); border-color: #ca8a04; }
    .plot.booked { background: rgba(239, 68, 68, 0.6); border-color: #dc2626; }
    
    .legend {
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
    }
    
    .legend h4 { margin-bottom: 10px; }
    .legend-item { display: flex; align-items: center; margin: 5px 0; }
    .legend-color { width: 20px; height: 20px; margin-right: 8px; border-radius: 3px; }
    
    .plot-tooltip {
      display: none;
      position: fixed;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 2000;
      min-width: 200px;
    }
    
    .plot-tooltip.visible { display: block; }
    .plot-tooltip h3 { margin-bottom: 10px; color: #333; }
    .plot-tooltip p { margin: 5px 0; color: #666; font-size: 14px; }
    .plot-tooltip .status { padding: 3px 8px; border-radius: 4px; color: white; font-size: 12px; }
    
    .controls {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      z-index: 1000;
    }
    
    .controls button {
      width: 40px;
      height: 40px;
      border: none;
      background: white;
      border-radius: 5px;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .controls button:hover { background: #f0f0f0; }
  </style>
</head>
<body>
  <div class="map-container" id="mapContainer">
    <div class="map-wrapper" id="mapWrapper">
      <img src="${baseUrl}${layout.imageUrl}" alt="${layout.name}" class="layout-image" id="layoutImage">
      <div class="plots-overlay" id="plotsOverlay"></div>
    </div>
  </div>
  
  <div class="legend">
    <h4>Legend</h4>
    <div class="legend-item"><div class="legend-color" style="background:#22c55e"></div> Available</div>
    <div class="legend-item"><div class="legend-color" style="background:#eab308"></div> On Hold</div>
    <div class="legend-item"><div class="legend-color" style="background:#ef4444"></div> Booked</div>
  </div>
  
  <div class="plot-tooltip" id="tooltip"></div>
  
  <div class="controls">
    <button onclick="zoomIn()">+</button>
    <button onclick="zoomOut()">−</button>
    <button onclick="resetZoom()">⟲</button>
  </div>

  <script>
    const plots = ${JSON.stringify(plots.map(p => ({
      id: p.id,
      plotNumber: p.plotNumber,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      status: p.status,
      price: p.price,
      size: p.size,
      facing: p.facing,
      description: p.description
    })))};
    
    const imageWidth = ${layout.imageWidth};
    const imageHeight = ${layout.imageHeight};
    let scale = 1;
    
    const overlay = document.getElementById('plotsOverlay');
    const tooltip = document.getElementById('tooltip');
    const wrapper = document.getElementById('mapWrapper');
    
    function renderPlots() {
      overlay.innerHTML = '';
      plots.forEach(plot => {
        const div = document.createElement('div');
        div.className = 'plot ' + plot.status;
        div.style.left = (plot.x / imageWidth * 100) + '%';
        div.style.top = (plot.y / imageHeight * 100) + '%';
        div.style.width = (plot.width / imageWidth * 100) + '%';
        div.style.height = (plot.height / imageHeight * 100) + '%';
        div.textContent = plot.plotNumber;
        div.onclick = (e) => showTooltip(e, plot);
        overlay.appendChild(div);
      });
    }
    
    function showTooltip(e, plot) {
      const statusColors = { available: '#22c55e', hold: '#eab308', booked: '#ef4444' };
      tooltip.innerHTML = \`
        <h3>Plot \${plot.plotNumber}</h3>
        <p><strong>Status:</strong> <span class="status" style="background:\${statusColors[plot.status]}">\${plot.status.toUpperCase()}</span></p>
        \${plot.size ? '<p><strong>Size:</strong> ' + plot.size + '</p>' : ''}
        \${plot.facing ? '<p><strong>Facing:</strong> ' + plot.facing + '</p>' : ''}
        \${plot.price ? '<p><strong>Price:</strong> ₹' + Number(plot.price).toLocaleString() + '</p>' : ''}
        \${plot.description ? '<p><strong>Info:</strong> ' + plot.description + '</p>' : ''}
      \`;
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY + 10) + 'px';
      tooltip.classList.add('visible');
      
      // Send to parent if in iframe
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'plotClick', plot: plot }, '*');
      }
      
      // Call callback if defined
      if (typeof window.${callback} === 'function') {
        window.${callback}(plot);
      }
    }
    
    document.addEventListener('click', (e) => {
      if (!e.target.classList.contains('plot')) {
        tooltip.classList.remove('visible');
      }
    });
    
    function zoomIn() { scale = Math.min(scale * 1.2, 5); applyZoom(); }
    function zoomOut() { scale = Math.max(scale / 1.2, 0.5); applyZoom(); }
    function resetZoom() { scale = 1; applyZoom(); }
    function applyZoom() { wrapper.style.transform = 'scale(' + scale + ')'; }
    
    renderPlots();
  </script>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Generate HTML map error:', error);
    res.status(500).json({ success: false, message: 'Error generating map' });
  }
};

/**
 * Get map data as JSON (for custom frontend rendering)
 */
const getMapData = async (req, res) => {
  try {
    const { id } = req.params;

    const layout = await Layout.findByPk(id, {
      include: [{ model: Plot, as: 'plots' }]
    });

    if (!layout) {
      return res.status(404).json({ success: false, message: 'Layout not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      data: {
        layout: {
          id: layout.id,
          name: layout.name,
          location: layout.location,
          description: layout.description,
          imageUrl: `${baseUrl}${layout.imageUrl}`,
          width: layout.imageWidth,
          height: layout.imageHeight
        },
        plots: layout.plots.map(p => ({
          id: p.id,
          plotNumber: p.plotNumber,
          coordinates: { x: p.x, y: p.y, width: p.width, height: p.height },
          percentages: {
            left: (p.x / layout.imageWidth * 100).toFixed(2) + '%',
            top: (p.y / layout.imageHeight * 100).toFixed(2) + '%',
            width: (p.width / layout.imageWidth * 100).toFixed(2) + '%',
            height: (p.height / layout.imageHeight * 100).toFixed(2) + '%'
          },
          status: p.status,
          price: p.price,
          size: p.size,
          facing: p.facing,
          description: p.description
        })),
        stats: {
          total: layout.plots.length,
          available: layout.plots.filter(p => p.status === 'available').length,
          hold: layout.plots.filter(p => p.status === 'hold').length,
          booked: layout.plots.filter(p => p.status === 'booked').length
        },
        statusColors: STATUS_COLORS
      }
    });

  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({ success: false, message: 'Error fetching map data' });
  }
};

module.exports = {
  generateSVGMap,
  generateHTMLMap,
  getMapData
};

