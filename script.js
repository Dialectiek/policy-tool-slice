// Initialize Map
const map = L.map('map', { zoomControl: false }).setView([52.632, 4.753], 13);

L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Add Base Layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    opacity: 0.85
}).addTo(map);

let pc6Layer;
let currentMetric = 'gas';

// Unified Color Logic
function getColor(d, type) {
    if (type === 'gas') {
        return d > 1500 ? '#800026' : d > 1200 ? '#bd0026' : d > 1000 ? '#e31a1c' :
               d > 800  ? '#fc4e2a' : d > 600  ? '#fd8d3c' : d > 400  ? '#feb24c' : '#fed976';
    } else {
        return d > 4000 ? '#084594' : d > 3500 ? '#2171b5' : d > 3000 ? '#4292c6' :
               d > 2500 ? '#6baed6' : d > 2000 ? '#9ecae1' : d > 1500 ? '#c6dbef' : '#deebf7';
    }
}

// // Styling Function
// function style(feature) {
//     const val = currentMetric === 'gas' ? feature.properties.p6_gasm3_2023 : feature.properties.p6_kwh_2023;
//     return { 
//         fillColor: getColor(val, currentMetric), 
//         weight: 0.8, 
//         opacity: 0.4, 
//         color: '#ffffff', 
//         fillOpacity: 0.55 
//     };
// }

// Styling Function
// Function to create a dynamic striped pattern for a specific postcode
function createDynamicPattern(pc, colorActual, colorSim) {
    let defs = document.querySelector('svg defs');
    if (!defs) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("style", "height:0; width:0; position:absolute;");
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.appendChild(defs);
        document.body.insertBefore(svg, document.body.firstChild);
    }

    const patternId = `pattern-${pc.replace(/\s+/g, '')}`;
    let pattern = document.getElementById(patternId);

    // Create or update the pattern
    if (!pattern) {
        pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        pattern.setAttribute("width", "10");
        pattern.setAttribute("height", "10");
        pattern.setAttribute("patternTransform", "rotate(45)");
        defs.appendChild(pattern);
    }

    pattern.innerHTML = `
        <rect width="10" height="10" fill="${colorActual}"></rect>
        <rect width="5" height="10" fill="${colorSim}"></rect>
    `;

    return patternId;
}

// Updated Styling Function
function style(feature) {
    const pc = feature.properties.postcode6;
    const scenario = postcodeScenarios[pc] || { gas: 1.0, pv: 1.0, modified: false };
    
    // 1. Get Actual Value and Color
    const actualVal = currentMetric === 'gas' ? feature.properties.p6_gasm3_2023 : feature.properties.p6_kwh_2023;
    const colorActual = getColor(actualVal, currentMetric);

    // 2. Get Simulated Value and Color
    const simVal = getCalculatedValue(feature, currentMetric);
    const colorSim = getColor(simVal, currentMetric);

    let styleObj = {
        weight: 0.8,
        opacity: 0.4,
        color: '#ffffff',
        fillOpacity: 0.7
    };

    if (scenario.modified) {
        // Create a unique pattern for this specific change
        const patternId = createDynamicPattern(pc, colorActual, colorSim);
        
        styleObj.fillColor = `url(#${patternId})`;
        styleObj.fillOpacity = 1.0; // Pattern needs full opacity to see colors clearly
        styleObj.weight = 2;
        styleObj.color = colorSim; // Border follows the new simulation color
        styleObj.opacity = 1.0;
    } else {
        styleObj.fillColor = colorActual;
    }

    return styleObj;
}

// Data Loading
async function loadMap() {
    try {
        const resp = await fetch('data/alkmaar_energy_map.geojson');
        const data = await resp.json();

        pc6Layer = L.geoJSON(data, {
            style: style,
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => {
                        e.target.setStyle({ weight: 2, color: '#2f3640', fillOpacity: 0.7 });
                    },
                    mouseout: (e) => {
                        pc6Layer.resetStyle(e.target);
                    },
                    click: (e) => {
                        updateSidePanel(feature.properties);
                        map.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 17 });
                    }
                });
            }
        }).addTo(map);

        if (data.features.length > 0) {
            map.fitBounds(pc6Layer.getBounds());
        }
        updateLegend();

    } catch (e) {
        console.error("Data load failed:", e);
    }
}

// Search Logic
function searchPostcode() {
    const input = document.getElementById('search-input').value.replace(/\s+/g, '').toUpperCase();
    let found = false;

    if (!pc6Layer) return;

    pc6Layer.eachLayer((layer) => {
        const pc = (layer.feature.properties.postcode6 || "").replace(/\s+/g, '').toUpperCase();
        if (pc === input) {
            found = true;
            updateSidePanel(layer.feature.properties);
            map.fitBounds(layer.getBounds(), { padding: [40, 40] });
            layer.setStyle({weight: 3, color: '#1e272e', fillOpacity: 0.8});
        }
    });

    if (!found) alert("Record not found.");
}

// Update Legend
function updateLegend() {
    const existing = document.querySelector('.legend');
    if (existing) existing.remove();

    const legend = L.control({position: 'bottomright'});

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = currentMetric === 'gas' ? [0, 400, 600, 800, 1000, 1200, 1500] : [0, 1500, 2000, 2500, 3000, 3500, 4000];
        const title = currentMetric === 'gas' ? 'GAS (m³)' : 'ELEC (kWh)';
        
        div.innerHTML = `<div style="margin-bottom:8px; font-weight:700; font-size:9px;">${title}</div>`;
        
        grades.forEach((g, i) => {
            div.innerHTML += `<i style="background:${getColor(g + 1, currentMetric)}"></i> ${g}${grades[i+1] ? '&ndash;'+grades[i+1] : '+'}<br>`;
        });
        return div;
    };
    legend.addTo(map);
}

// Update Side Panel
function updateSidePanel(prop) {
    const formatNum = (val) => (val != null) ? Math.round(val).toLocaleString('nl-NL') : 'N/A';
    
    document.getElementById('panel-content').innerHTML = `
        <div class="pc6-header">${prop.postcode6}</div>
        
        <div class="data-group">
            <div class="data-label">Gas Consumption (2023)</div>
            <div class="data-value">${formatNum(prop.p6_gasm3_2023)} m³ / yr</div>
        </div>
        
        <div class="data-group">
            <div class="data-label">Electricity Usage (2023)</div>
            <div class="data-value">${formatNum(prop.p6_kwh_2023)} kWh / yr</div>
        </div>
        
        <div class="data-group">
            <div class="data-label">Avg. Elec. Production (2023)</div>
            <div class="data-value">${formatNum(prop.p6_kwh_productie_2023)} kWh / yr</div>
        </div>

        <div style="margin-top:60px; font-size:9px; color:var(--text-muted); line-height:1.5;">
            <strong>METHODOLOGY</strong><br>
            Geometry: CBS 2021 PC6 Boundaries.<br>
            Energy: VNG (CBS) Energy Statistics 2023.<br>
            Matched per PC6.
        </div>
    `;
}

// Event Listeners
document.getElementById('search-btn').addEventListener('click', searchPostcode);

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPostcode();
});

document.querySelectorAll('input[name="layer"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMetric = e.target.value;
        pc6Layer.setStyle(style);
        updateLegend();
    });
});

// Global object to store local overrides
// Format: { "1811AA": { gas: 0.5, pv: 2.0 }, ... }
let postcodeScenarios = {};

function getCalculatedValue(feature, metric) {
    const pc = feature.properties.postcode6;
    const scenario = postcodeScenarios[pc] || { gas: 1.0, pv: 1.0 };
    
    const origGas = feature.properties.p6_gasm3_2023 || 0;
    const origElec = feature.properties.p6_kwh_2023 || 0;
    const origPV = feature.properties.p6_kwh_productie_2023 || 0;

    if (metric === 'gas') return origGas * scenario.gas;
    
    if (metric === 'pv') return origPV * scenario.pv;

    if (metric === 'elec') {
        const gasSaved = origGas * (1 - scenario.gas);
        return origElec + (gasSaved * 3); // Heat pump transition factor
        // TODO replace func 
    }
}

function updateSidePanel(prop) {
    const pc = prop.postcode6;
    if (!postcodeScenarios[pc]) {
        postcodeScenarios[pc] = { gas: 1.0, pv: 1.0, modified: false };
    }
    const s = postcodeScenarios[pc];

    const actualGas = prop.p6_gasm3_2023 || 0;
    const actualElec = prop.p6_kwh_2023 || 0;
    const actualPV = prop.p6_kwh_productie_2023 || 0;

    const scenarioGas = getCalculatedValue({properties: prop}, 'gas');
    const scenarioElec = getCalculatedValue({properties: prop}, 'elec');
    const scenarioPV = getCalculatedValue({properties: prop}, 'pv');
    
    const formatNum = (val) => Math.round(val).toLocaleString('nl-NL');

    // Check if this postcode has been modified to show the column immediately
    const simActiveClass = s.modified ? "active" : "";

    document.getElementById('panel-content').innerHTML = `
        <div class="pc6-header">${pc}</div>
        
        <div class="data-grid">
            <div class="data-column">
                <div class="column-header">Actual (2023)</div>
                <div class="data-group">
                    <div class="data-label">Gas</div>
                    <div class="data-value">${formatNum(actualGas)} m³</div>
                </div>
                <div class="data-group">
                    <div class="data-label">Electricity</div>
                    <div class="data-value">${formatNum(actualElec)} kWh</div>
                </div>
                <div class="data-group">
                    <div class="data-label">PV Yield</div>
                    <div class="data-value">${formatNum(actualPV)} kWh</div>
                </div>
            </div>

            <div class="data-column sim-column ${simActiveClass}" id="sim-col">
                <div class="column-header">Simulated</div>
                <div class="data-group">
                    <div class="data-label">Gas</div>
                    <div class="data-value sim-value" id="val-sim-gas">${formatNum(scenarioGas)} m³</div>
                </div>
                <div class="data-group">
                    <div class="data-label">Electricity</div>
                    <div class="data-value sim-value" id="val-sim-elec">${formatNum(scenarioElec)} kWh</div>
                </div>
                <div class="data-group">
                    <div class="data-label">PV Yield</div>
                    <div class="data-value sim-value" id="val-sim-pv">${formatNum(scenarioPV)} kWh</div>
                </div>
            </div>
        </div>

        <div class="sidebar-controls">
            <div class="control-label" style="margin-bottom:15px; color:var(--accent-red)">Local Scenario Parameters</div>
            <div class="slider-unit">
                <div class="slider-header">
                    <span class="slider-label">Gas Demand</span>
                    <span class="slider-pct" id="pct-gas">${Math.round(s.gas * 100)}%</span>
                </div>
                <input type="range" class="side-slider" id="input-gas" min="0" max="100" value="${s.gas * 100}">
            </div>

            <div class="slider-unit">
                <div class="slider-header">
                    <span class="slider-label">PV Adoption</span>
                    <span class="slider-pct" id="pct-pv">${Math.round(s.pv * 100)}%</span>
                </div>
                <input type="range" class="side-slider" id="input-pv" min="100" max="500" value="${s.pv * 100}">
            </div>
        </div>
    `;

    document.getElementById('input-gas').addEventListener('input', (e) => {
        postcodeScenarios[pc].gas = e.target.value / 100;
        postcodeScenarios[pc].modified = true;
        document.getElementById('pct-gas').innerText = e.target.value + "%";
        refreshVisuals(prop);
    });

    document.getElementById('input-pv').addEventListener('input', (e) => {
        postcodeScenarios[pc].pv = e.target.value / 100;
        postcodeScenarios[pc].modified = true;
        document.getElementById('pct-pv').innerText = e.target.value + "%";
        refreshVisuals(prop);
    });
}

function refreshVisuals(originalProps) {
    // This forces Leaflet to re-calculate the styles and patterns
    pc6Layer.setStyle(style); 
    
    // ... update the numeric columns as before ...
    const pc = originalProps.postcode6;
    document.getElementById('sim-col').classList.add('active');
    
    const scenarioGas = getCalculatedValue({properties: originalProps}, 'gas');
    const scenarioElec = getCalculatedValue({properties: originalProps}, 'elec');
    const scenarioPV = getCalculatedValue({properties: originalProps}, 'pv');
    const formatNum = (val) => Math.round(val).toLocaleString('nl-NL');
    
    document.getElementById('val-sim-gas').innerText = formatNum(scenarioGas) + " m³";
    document.getElementById('val-sim-elec').innerText = formatNum(scenarioElec) + " kWh";
    document.getElementById('val-sim-pv').innerText = formatNum(scenarioPV) + " kWh";
}

// Run
loadMap();