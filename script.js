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

// Styling Function
function style(feature) {
    const val = currentMetric === 'gas' ? feature.properties.p6_gasm3_2023 : feature.properties.p6_kwh_2023;
    return { 
        fillColor: getColor(val, currentMetric), 
        weight: 0.8, 
        opacity: 0.4, 
        color: '#ffffff', 
        fillOpacity: 0.55 
    };
}

// Data Loading
async function loadMap() {
    try {
        const resp = await fetch('alkmaar_energy_map.geojson');
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
            <div class="data-label">Avg. WOZ Valuation</div>
            <div class="data-value">€ ${formatNum(prop.pc6_gemiddelde_woz_waarde_woning * 1000)}</div>
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

// Run
loadMap();