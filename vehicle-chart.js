// ==========================================
// MÓDULO: GRÁFICO PARQUE VEHICULAR 
// ==========================================

(function() { 
    const TARGET_ID = 'vehicleGrowthChart';
    const DATA_URL = 'data/parque-vehicular.csv'; 

    const state = {
        data: [],
        hasDrawn: false,
        hasLoaded: false,
        tooltip: null,
        resizeObserver: null
    };

    const palette = {
        primary: '#84BFAE', 
        accent: '#d97f5a', 
        text: '#023047',
        grid: 'rgba(2,48,71,0.08)',
        positive: '#4cc9f0', // crecimiento
        negative: '#ef476f'  // decrecimiento
    };

    // --- Parser Autos por Vivienda ---
    function parseCsvRow(row) {
        const toNum = (val) => {
            if (!val) return null;
            const cleaned = String(val).replace(/,/g, '').trim();
            const num = +cleaned;
            return isFinite(num) ? num : null;
        };

        const year = toNum(row.año || row.ano || row.year || row.Año);
        const vehicles = toNum(row.vehiculos || row.vehiculos_totales || row.total);
        const dwellings = toNum(row.viviendas || row.viviendas_totales || row.houses);
        const autosPerDwelling = toNum(row.autos_por_vivienda || row.autos_vivienda); 

        return { year, vehicles, dwellings, autosPerDwelling };
    }

    // --- Helper para formatear Crecimiento ---
    function formatGrowth(val) {
        if (val === null || val === undefined || isNaN(val)) return '<span style="color:#aaa; font-size:0.9em">--</span>';
        const color = val >= 0 ? palette.positive : palette.negative;
        const sign = val > 0 ? '+' : '';
        return `<span style="color:${color}; font-weight:bold; font-size:0.9em">
            ${sign}${val.toFixed(1)}%
        </span> <span style="color:#ccc; font-size:0.8em">vs año ant.</span>`;
    }

    // --- Pre-procesamiento de datos para calcular variaciones ---
    function processData(rows) {
        // Ordenamos por año
        const sorted = rows.sort((a,b) => a.year - b.year);
        
        // Calculamos variaciones
        for (let i = 0; i < sorted.length; i++) {
            const curr = sorted[i];
            const prev = i > 0 ? sorted[i-1] : null;

            // Variación Vehículos
            if (prev && prev.vehicles > 0 && curr.vehicles !== null) {
                curr.vehGrowth = ((curr.vehicles - prev.vehicles) / prev.vehicles) * 100;
            } else {
                curr.vehGrowth = null;
            }

            // Variación Viviendas
            if (prev && prev.dwellings > 0 && curr.dwellings !== null) {
                curr.dwGrowth = ((curr.dwellings - prev.dwellings) / prev.dwellings) * 100;
            } else {
                curr.dwGrowth = null;
            }
        }
        return sorted;
    }

    function getContainerDims() {
        const el = document.getElementById(TARGET_ID);
        if (!el) return { width: 600, height: 400, margin: {top:20, right:20, bottom:20, left:20}, innerW: 560, innerH: 360 };
        
        const rect = el.getBoundingClientRect();
        const margin = { top: 40, right: 60, bottom: 50, left: 60 }; 
        if (rect.width < 500) { margin.left = 45; margin.right = 45; }

        return {
            width: rect.width,
            height: rect.height,
            margin,
            innerW: rect.width - margin.left - margin.right,
            innerH: rect.height - margin.top - margin.bottom
        };
    }

    function ensureTooltip() {
        if (d3.select('.vehicle-tooltip').empty()) {
            state.tooltip = d3.select('body').append('div')
                .attr('class', 'vehicle-tooltip')
                .style('position', 'absolute')
                .style('background', 'rgba(2, 48, 71, 0.95)')
                .style('color', 'white')
                .style('padding', '12px 14px')
                .style('border-radius', '6px')
                .style('font-family', 'sans-serif')
                .style('font-size', '13px')
                .style('line-height', '1.5')
                .style('opacity', 0)
                .style('pointer-events', 'none') 
                .style('z-index', '10000') 
                .style('box-shadow', '0 6px 12px rgba(0,0,0,0.3)');
        } else {
            state.tooltip = d3.select('.vehicle-tooltip');
        }
    }

    function render() {
        const el = document.getElementById(TARGET_ID);
        if (!el || !state.data.length) return;
        
        el.innerHTML = '';
        ensureTooltip();

        const dims = getContainerDims();
        const svg = d3.select(el).append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${dims.width} ${dims.height}`)
            .style('overflow', 'visible');

        const g = svg.append('g')
            .attr('transform', `translate(${dims.margin.left},${dims.margin.top})`);

        // Detectamos móvil solo para saber si agregar <tspan>
        const isMobile = window.innerWidth < 600;

        const titleNode = g.append('text')
            .attr('class', 'chart-title-responsive') 
            .attr('x', dims.innerW / 2) 
            .attr('text-anchor', 'middle');

        if (isMobile) {
            titleNode.append('tspan').text('Crecimiento del Parque Vehicular').attr('x', dims.innerW / 2).attr('dy', '-1.2em');
            titleNode.append('tspan').text('y Viviendas en Cancún, 1980–2025').attr('x', dims.innerW / 2).attr('dy', '1.4em');
        } else {
            titleNode.text('Crecimiento del Parque Vehicular y Viviendas en Cancún, 1980–2025');
        }

        const x = d3.scaleBand()
            .domain(state.data.map(d => d.year))
            .range([0, dims.innerW])
            .padding(0.2);

        // ESCALA FIJA 600k
        const FIXED_MAX = 600000;
        const yLeft = d3.scaleLinear().domain([0, FIXED_MAX]).range([dims.innerH, 0]);
        const yRight = d3.scaleLinear().domain([0, FIXED_MAX]).range([dims.innerH, 0]);

        const xAxis = d3.axisBottom(x)
            .tickValues(x.domain().filter((d,i) => !(i % 3))) 
            .tickFormat(d3.format('d'));
            
        const formatK = d => (d / 1000) + 'k';
        const tickValues = [0, 100000, 200000, 300000, 400000, 500000, 600000];

        

        // Ejes
        const xAxisGroup = g.append('g') //
            .attr('transform', `translate(0,${dims.innerH})`)
            .call(xAxis)
            .style('color', '#666');

        // --- PARCHE DE ROTACIÓN MÓVIL ---
        if (window.innerWidth <= 900) {
            xAxisGroup.selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-90)")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", "-.15em");
        }
        g.append('g').call(d3.axisLeft(yLeft).tickValues(tickValues).tickFormat(formatK)).style('color', palette.primary);
        g.append('g').attr('transform', `translate(${dims.innerW},0)`).call(d3.axisRight(yRight).tickValues(tickValues).tickFormat(formatK)).style('color', palette.accent);

        // Grid
        g.append('g').attr('class', 'grid')
            .call(d3.axisLeft(yLeft).tickValues(tickValues).tickSize(-dims.innerW).tickFormat('')).style('stroke-dasharray', '3 3').style('opacity', 0.1);

        // Labels
        g.append('text').attr('y', -10).attr('x', 0).text('Vehículos').attr('fill', palette.primary).style('font-weight', 'bold');
        g.append('text').attr('y', -10).attr('x', dims.innerW).attr('text-anchor', 'end').text('Viviendas').attr('fill', palette.accent).style('font-weight', 'bold');

        // --- BARRAS (Vehículos) ---
        g.selectAll('.bar')
            .data(state.data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.year))
            .attr('width', x.bandwidth())
            .attr('y', dims.innerH)
            .attr('height', 0)
            .attr('fill', palette.primary)
            .attr('rx', 2)
            .on('mousemove', (evt, d) => {
                // Tooltip BARRAS: Vehículos + Crecimiento
                state.tooltip.style('opacity', 1)
                    .html(`
                        <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2)">${d.year}</div>
                        <div style="margin-bottom:2px">🚗 Vehículos: <strong>${d3.format(',')(d.vehicles)}</strong></div>
                        <div>${formatGrowth(d.vehGrowth)}</div>
                    `)
                    .style('left', (evt.pageX + 15) + 'px')
                    .style('top', (evt.pageY - 15) + 'px');
                d3.select(evt.currentTarget).style('opacity', 0.8);
            })
            .on('mouseleave', (evt) => {
                state.tooltip.style('opacity', 0);
                d3.select(evt.currentTarget).style('opacity', 1);
            })
            .transition().duration(800).delay((d,i) => i * 30)
            .attr('y', d => yLeft(d.vehicles))
            .attr('height', d => dims.innerH - yLeft(d.vehicles));

        // --- LÍNEA (Viviendas) ---
        const line = d3.line()
            .defined(d => d.dwellings != null)
            .x(d => x(d.year) + x.bandwidth()/2)
            .y(d => yRight(d.dwellings))
            .curve(d3.curveMonotoneX);

        const path = g.append('path')
            .datum(state.data.filter(d => d.dwellings))
            .attr('fill', 'none')
            .attr('stroke', palette.accent)
            .attr('stroke-width', 3)
            .attr('d', line);

        const len = path.node().getTotalLength();
        path.attr("stroke-dasharray", len + " " + len).attr("stroke-dashoffset", len)
            .transition().duration(2000).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);

        // --- PUNTOS (Viviendas) ---
        g.selectAll('.dot')
            .data(state.data.filter(d => d.dwellings))
            .enter().append('circle')
            .attr('cx', d => x(d.year) + x.bandwidth()/2)
            .attr('cy', d => yRight(d.dwellings))
            .attr('r', 0)
            .attr('fill', palette.accent)
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .style('pointer-events', 'all')
            .on('mousemove', (evt, d) => {
                // Tooltip PUNTOS: Viviendas + Crecimiento + Autos/Vivienda
                const apdLabel = d.autosPerDwelling 
                    ? `<div style="margin-top:6px; pt-1; border-top:1px solid rgba(255,255,255,0.1)">🚘 Autos x Viv: <strong style="color:#FFD166; font-size:1.1em">${d.autosPerDwelling.toFixed(2)}</strong></div>` 
                    : '';

                state.tooltip.style('opacity', 1)
                    .html(`
                        <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2)">${d.year}</div>
                        <div style="margin-bottom:2px">🏠 Viviendas: <strong>${d3.format(',')(d.dwellings)}</strong></div>
                        <div>${formatGrowth(d.dwGrowth)}</div>
                        ${apdLabel}
                    `)
                    .style('left', (evt.pageX + 15) + 'px')
                    .style('top', (evt.pageY - 15) + 'px');
                d3.select(evt.currentTarget).attr('r', 7);
            })
            .on('mouseleave', (evt) => {
                state.tooltip.style('opacity', 0);
                d3.select(evt.currentTarget).attr('r', 4);
            })
            .transition().delay(1000).duration(500)
            .attr('r', 4);
    }

    function loadData() {
        d3.csv(DATA_URL).then(raw => {
            const rows = raw.map(parseCsvRow).filter(d => d.year && d.vehicles);
            state.data = processData(rows);
            
            state.hasLoaded = true;
            render();
            if (!state.resizeObserver) {
                const el = document.getElementById(TARGET_ID);
                state.resizeObserver = new ResizeObserver(() => render());
                state.resizeObserver.observe(el);
            }
        }).catch(err => console.error("Error:", err));
    }

    window.vehicleChart = {
        init: function() {
            if (!state.hasLoaded) loadData();
            else render();
        }
    };
})();