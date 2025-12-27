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
    video2: document.getElementById('video-layer-2'),
    chart: document.getElementById('chart-layer'),
    sequence: document.getElementById('sequence-layer')
};

// 3. Lógica de Capas Globales
function switchGlobalLayer(name) {
    Object.keys(layers).forEach(key => {
        const layer = layers[key];
        if (layer) {
            if (key === name) {
                layer.classList.add('is-active');
                gsap.to(layer, { opacity: 1, duration: 0.5 });
            } else {
                layer.classList.remove('is-active');
                gsap.to(layer, { opacity: 0, duration: 0.5 });
            }
        }
    });
}

// 4. Configuración de Animaciones (GSAP)
function setupAnimations() {
    // Aseguramos que el plugin esté registrado
    gsap.registerPlugin(ScrollTrigger);

    // --- ANIMACIÓN STEP 2: GRID SPLIT ---
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

    // --- ANIMACIÓN STEP 3: SECUENCIA CHART ---
    const isDesktop = window.innerWidth > 900;
    const targetX = isDesktop ? -40 : 0;

    // Setup inicial para todos los elementos de texto
    gsap.set(['.exp-1', '.exp-2', '.chart-impact'], { 
        opacity: 0, 
        x: isDesktop ? -180 : -80 
    });

    const tl3 = gsap.timeline({
        scrollTrigger: {
            trigger: ".step[data-step='3']",
            start: "top top",
            end: "bottom bottom",
            scrub: 1
        }
    });

    tl3
        // 1. Gráfico aparece
        .to('.chart-container', { opacity: 1, y: 0, duration: 1 })
        
        // 2. ENTRADA EXPLICACIÓN 1
        .to('.exp-1', { opacity: 1, x: targetX, duration: 2.5, ease: "power2.out" });

        // Paneo de gráfica (solo escritorio) sincronizado con la primera entrada
        if (isDesktop) {
            tl3.to('.chart-container', { x: "22%", duration: 2.5, ease: "power2.inOut" }, "-=2.5");
        }

    tl3
        // 3. RELEVO: SALE EXPLICACIÓN 1 -> ENTRA EXPLICACIÓN 2
        .to('.exp-1', { opacity: 0, x: 100, duration: 1.5, delay: 2 })
        .to('.exp-2', { opacity: 1, x: targetX, duration: 2.5, ease: "power2.out" })

        // 4. RELEVO: SALE EXPLICACIÓN 2 -> ENTRA IMPACTO
        .to('.exp-2', { opacity: 0, x: 100, duration: 1.5, delay: 2 })
        .fromTo('.chart-impact', 
            { opacity: 0, x: isDesktop ? -180 : -80 },
            { opacity: 1, x: targetX, duration: 2.5, ease: "power2.out" }
        )
        
        // 5. Salida Final
        .to(['.chart-impact', '.chart-container'], { opacity: 0, duration: 1, delay: 2 });

    // --- ANIMACIÓN STEP 4: SECUENCIA Y FADE IN-SITU ---
    const sequenceYears = [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];
    const stepDuration = 2; 

    const tlImages = gsap.timeline({
        scrollTrigger: {
            trigger: ".step[data-step='4']",
            start: "top top",
            end: "bottom bottom",
            scrub: true, 
            pin: true,
            anticipatePin: 1
        }
    });

    // Anclaje inicial de años
    tlImages.set('#year-marker', { textContent: sequenceYears[0] }, 0);

    // Salida de la cortina de contexto inicial
    tlImages.to(".intro-full-width-bg", { autoAlpha: 0, duration: 2 });


    sequenceYears.forEach((year, i) => {
        const timeBase = (i * stepDuration) + 2; 

        // Cambiamos el año usando textContent
        tlImages.set('#year-marker', { textContent: year }, timeBase);

        // Animación de las imágenes de fondo
        if (i < sequenceYears.length - 1) {
            tlImages.to(`#img-seq-${year}`, { opacity: 0, duration: stepDuration }, timeBase)
                    .to(`#img-seq-${sequenceYears[i+1]}`, { opacity: 1, duration: stepDuration }, timeBase);
        }

        // Animación de los párrafos: Entrada y Salida sincronizada
        if ([2000, 2010, 2025].includes(year)) {
            const target = `#text-${year}`;
            tlImages.to(target, { autoAlpha: 1, duration: 1 }, timeBase)
                    .to(target, { autoAlpha: 0, duration: 1 }, timeBase + stepDuration);
        }
    });

    // Espacio de lectura
    tlImages.to({}, { duration: 0.5 });

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
            switchGlobalLayer('none'); 
            break;
        case '3':
            switchGlobalLayer('chart');
            break;
        case '4':
            switchGlobalLayer('sequence');
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
    initPopulationChart();
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

// 6. POPULATION CHART LOGIC
let populationData = [];

function initPopulationChart() {
    const container = document.querySelector('#populationGrowthChart');
    if (!container) return;

    d3.csv("data/poblacion-valores.csv")
        .then(function(csvData) {
            populationData = csvData.map(d => {
                return {
                    year: +d.Año,
                    benitoJuarez: parseNumber(d['Población Benito Juárez']),
                    mexico: parseNumber(d['Poblacion México']),
                    mundo: parseNumber(d['Poblacion Mundo']),
                    qrooTotal: parseNumber(d['Población Todo de Quintana Roo'])
                };
            }).filter(d => d.year && !isNaN(d.year) && d.year <= 2020);

            createDataSelector();
            createChart('benito');
        })
        .catch(err => console.error("Error cargando datos:", err));
}

const palette = {
    benito: { start: '#FFB703', end: '#FB8500' },
    mexico: { start: '#8ECAE6', end: '#219EBC' },
    mundo: { start: '#A2D2FF', end: '#023047' },
    qroo: { start: '#48CAE4', end: '#0077B6' }
};

function getColorByType(type, pos) {
    return palette[type] ? palette[type][pos] : palette['benito'][pos];
}

function parseNumber(str) {
    if (!str || str.trim() === '') return null;
    return +str.replace(/\./g, '');
}

function createDataSelector() {
    const container = document.querySelector('#populationGrowthChart');
    if (!container) return;
    
    // Evitar duplicados si se llama varias veces
    if (container.querySelector('.data-selector')) return;

    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'data-selector';
    selectorDiv.style.marginBottom = '15px';
    selectorDiv.style.textAlign = 'center';

    const options = [
        { value: 'benito', label: 'Cancún' },
        { value: 'qroo', label: 'Quintana Roo' },
        { value: 'mexico', label: 'México' },
        { value: 'mundo', label: 'Mundo' }
    ];

    options.forEach(opt => {
        const label = document.createElement('label');
        label.style.color = opt.value === 'benito' ? '#FB8500' : '#023047';
        label.style.fontWeight = opt.value === 'benito' ? '700' : '600';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'dataType';
        radio.value = opt.value;
        radio.checked = opt.value === 'benito';
        
        radio.addEventListener('change', (e) => {
            selectorDiv.querySelectorAll('label').forEach(l => {
                const r = l.querySelector('input');
                l.style.color = r.checked ? '#FB8500' : '#023047';
                l.style.fontWeight = r.checked ? '700' : '600';
            });
            createChart(e.target.value);
        });

        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt.label));
        selectorDiv.appendChild(label);
    });

    container.prepend(selectorDiv);
}

function createChart(dataType) {
    const container = document.querySelector('#populationGrowthChart');
    if (!container) return;

    // Limpiar SVG previo
    const existingSvg = container.querySelector('svg');
    if (existingSvg) existingSvg.remove();

    // Configuración D3
    const baseWidth = 800;
    const baseHeight = 400;
    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const width = baseWidth - margin.left - margin.right;
    const height = baseHeight - margin.top - margin.bottom;

    const svg = d3.select('#populationGrowthChart')
        .append('svg')
        .attr('viewBox', `0 0 ${baseWidth} ${baseHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', '100%')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradiente
    const gradientId = `bar-gradient-${dataType}`;
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    
    gradient.append('stop').attr('offset', '0%').attr('stop-color', getColorByType(dataType, 'start'));
    gradient.append('stop').attr('offset', '100%').attr('stop-color', getColorByType(dataType, 'end'));

    // Filtrar datos
    const data = populationData.filter(d => {
        if (dataType === 'benito') return d.benitoJuarez !== null;
        if (dataType === 'mexico') return d.mexico !== null;
        if (dataType === 'mundo') return d.mundo !== null;
        if (dataType === 'qroo') return d.qrooTotal !== null;
        return false;
    });

    const getValue = (d) => {
        if (dataType === 'benito') return d.benitoJuarez;
        if (dataType === 'mexico') return d.mexico;
        if (dataType === 'mundo') return d.mundo;
        return d.qrooTotal;
    };

    // Escalas
    const x = d3.scaleBand()
        .domain(data.map(d => d.year))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, getValue) * 1.1])
        .nice()
        .range([height, 0]);

    // Ejes
    svg.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d.toString()));

    svg.append('g')
        .attr('class', 'axis y-axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
            if (d >= 1000000) return (d/1000000).toFixed(1) + 'M';
            if (d >= 1000) return (d/1000).toFixed(0) + 'K';
            return d;
        }));

    // Barras
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.year))
        .attr('width', x.bandwidth())
        .attr('y', height) // Animación desde abajo
        .attr('height', 0)
        .style('fill', `url(#${gradientId})`)
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 0.8);
            const tooltip = d3.select('.chart-container .tooltip');
            const val = getValue(d).toLocaleString();
            tooltip.style('opacity', 1)
                   .html(`<div>Año: ${d.year}</div><div class="value">${val}</div>`)
                   .style('left', (event.pageX - container.getBoundingClientRect().left + 20) + 'px')
                   .style('top', (event.pageY - container.getBoundingClientRect().top - 40) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 1);
            d3.select('.chart-container .tooltip').style('opacity', 0);
        })
        .transition().duration(800)
        .attr('y', d => y(getValue(d)))
        .attr('height', d => height - y(getValue(d)));

    // Etiquetas sobre las barras
    svg.selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('x', d => x(d.year) + x.bandwidth() / 2)
        .attr('y', d => y(getValue(d)) - 5)
        .text(d => {
            const val = getValue(d);
            if (val > 1000000) return (val/1000000).toFixed(1) + 'M';
            if (dataType === 'benito') return (val/1000).toFixed(0) + 'K';
            return val;
        })
        .attr('opacity', 0)
        .transition().delay(500).duration(500).attr('opacity', 1);
}

// Arrancar
init();