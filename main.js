// --- CONFIGURACIÓN ---
mapboxgl.accessToken = 'pk.eyJ1IjoiMHhqZmVyIiwiYSI6ImNtZjRjNjczdTA0MGsya3Bwb3B3YWw4ejgifQ.8IZ5PTYktl5ss1gREda3fg';

// 1. Inicializar Mapa
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11', 
    center: [-86.85, 21.16], 
    zoom: 10,
    interactive: true,
    scrollZoom: false,      
    dragPan: true,          
    doubleClickZoom: true,  
    touchZoomRotate: false, 
    dragRotate: false       
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

map.on('load', () => {
    // 1. FUENTE
    map.addSource('src-cambio-poblacional', {
        type: 'geojson',
        data: 'data/cambio-poblacional.geojson' 
    });

    // 2. CAPA BASE
    map.addLayer({
        id: 'layer-cambio-poblacional',
        type: 'fill',
        source: 'src-cambio-poblacional',
        layout: { 'visibility': 'visible' },
        paint: {
            'fill-color': [
                'step',
                ['coalesce', ['to-number', ['get', 'p100_dife_pob']], 0],
                '#f7fcf5', -75, '#e5f5e0', -50, '#c7e9c0', -25, '#a1d99b',
                0, '#74c476', 25, '#41ab5d', 50, '#238b45', 75, '#006d2c', 100, '#00441b'
            ],
            'fill-opacity': 0,
            'fill-outline-color': '#ffffff'
        }
    });

    // 3. HUELLA URBANA
    map.addSource('src-geo', { type: 'geojson', data: 'data/geo.json' });
    map.addLayer({
        id: 'layer-geo',
        type: 'fill',
        source: 'src-geo',
        layout: { 'visibility': 'visible' },
        paint: { 'fill-color': '#023047', 'fill-opacity': 0 }
    });

    // 4. INTERACCIÓN (Hover)
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 20 });

    map.on('mousemove', 'layer-cambio-poblacional', (e) => {
        const opacity = map.getPaintProperty('layer-cambio-poblacional', 'fill-opacity');
        if (opacity < 0.1 || !e.features.length) return;

        map.getCanvas().style.cursor = 'pointer';
        const props = e.features[0].properties;
        const pob2020 = Number(props.POBTOT || props.Pob2020 || 0);
        const pob2010 = Number(props.Pob2010 || 0);
        const difPct = Number(props.p100_dife_pob || ((pob2010 !== 0) ? ((pob2020 - pob2010) / pob2010) * 100 : 0));
        const colorPct = difPct >= 0 ? '#238b45' : '#C1121F';

        const html = `
            <div class="popup-header">AGEB ${props.CVE_AGEB || props.cvegeo || ''}</div>
            <div class="popup-data" style="color: ${colorPct}">${difPct > 0 ? '+' : ''}${difPct.toFixed(1)}%</div>
            <div class="popup-label">Cambio 2010-2020</div>
            <div style="margin-top: 8px; font-size: 11px; color: #555; border-top: 1px solid #eee; padding-top: 4px;">
                <strong>2010:</strong> ${pob2010.toLocaleString()}<br>
                <strong>2020:</strong> ${pob2020.toLocaleString()}
            </div>
        `;
        popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    map.on('mouseleave', 'layer-cambio-poblacional', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });
});

// 2. Configuración y Selectores
const layers = {
    cover: document.getElementById('cover-layer'),
    map: document.getElementById('map-layer'),
    video2: document.getElementById('video-layer-2')
};

// 3. Lógica de Capas Globales
function switchGlobalLayer(name) {
    // Apaga todas las capas
    Object.values(layers).forEach(el => el.classList.remove('is-active'));
    // Enciende solo la solicitada
    if (layers[name]) layers[name].classList.add('is-active');
}

// 4. Configuración de Animaciones (GSAP)
function setupAnimations() {
    // Aseguramos que el plugin esté registrado
    gsap.registerPlugin(ScrollTrigger);

    // Animación específica para el Step 2 (Grid Split)
    // Seleccionamos específicamente el step 2 para animar sus columnas
    gsap.utils.toArray('.step[data-step="2"]').forEach(step => {
        // Seleccionamos los contenidos internos (texto e info-card)
        const contentElements = step.querySelectorAll('.step-content');
        
        gsap.fromTo(contentElements, 
            { 
                y: 50, 
                opacity: 0 
            },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                stagger: 0.3,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: step,
                    start: "top 60%",
                    end: "bottom 40%",
                    toggleActions: "play reverse play reverse"
                }
            }
        );
    });
}

// 5. Scrollama Setup
const scroller = scrollama();

function handleStepEnter(response) {
    const { element } = response;
    const step = element.dataset.step;

    document.querySelectorAll('.step').forEach(s => s.classList.remove('is-active'));
    element.classList.add('is-active');

    // --- LÓGICA DE LA NARRATIVA (Fondos) ---
    switch (step) {
        case '1':
            switchGlobalLayer('cover');
            break;
            
        case '2':
            // Mantenemos la portada de fondo mientras leemos la intro
            switchGlobalLayer('cover'); 
            break;
            
        case '3':
            switchGlobalLayer('map');
            break;

        default:
            switchGlobalLayer('none');
            break;
    }
}

function handleStepProgress(response) {
    const { element, progress } = response;
}

function init() {
    // 1. Inicializar animaciones internas
    setupAnimations();

    // 2. Inicializar Scrollama
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            progress: true,
            debug: false 
        })
        .onStepEnter(handleStepEnter)
        .onStepProgress(handleStepProgress);
        
    window.addEventListener('resize', scroller.resize);
}

// Arrancar
init();