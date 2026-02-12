// Constants
const MARGIN = { top: 20, right: 30, bottom: 40, left: 60 };
const COLORS = {
    primary: '#38bdf8',
    secondary: '#818cf8',
    smoker: '#ef4444',
    nonSmoker: '#22c55e',
    tooltipBg: '#0f172a'
};

// Global Data State
let state = {
    data: [],
    width: 0,
    height: 0
};

// Initialize Dashboard
async function initDashboard() {
    try {
        const rawData = await d3.csv('medical-charges.csv');
        
        // Process data
        state.data = rawData.map(d => ({
            ...d,
            age: +d.age,
            bmi: +d.bmi,
            children: +d.children,
            charges: +d.charges,
            isSmoker: d.smoker === 'yes'
        }));

        console.log("Data loaded:", state.data.length, "records");

        updateMetrics();
        initAnimations();
        renderCharts();

        // Handle resize
        window.addEventListener('resize', () => {
             // Simple debounce could be added here
             renderCharts();
        });

    } catch (error) {
        console.error("Error loading data:", error);
        alert("Failed to load medical-charges.csv. Please ensure the file is present.");
    }
}

// Update Summary Metrics with Animation
function updateMetrics() {
    const totalPatients = state.data.length;
    const avgCharge = d3.mean(state.data, d => d.charges);
    const avgBMI = d3.mean(state.data, d => d.bmi);
    const smokerCount = state.data.filter(d => d.isSmoker).length;
    const smokerPercent = (smokerCount / totalPatients) * 100;

    // Use Anime.js for number counting
    const metrics = [
        { id: '#total-patients', value: totalPatients, format: d3.format(",") },
        { id: '#avg-charge', value: avgCharge, format: d3.format("$,.2f") },
        { id: '#avg-bmi', value: avgBMI, format: d3.format(".1f") },
        { id: '#smoker-percent', value: smokerPercent, format: d => d3.format(".1f")(d) + "%" }
    ];

    metrics.forEach(metric => {
        const el = document.querySelector(metric.id);
        const obj = { value: 0 };
        
        anime({
            targets: obj,
            value: metric.value,
            round: 10,
            duration: 2000,
            easing: 'easeOutExpo',
            update: () => {
                el.innerText = metric.format(obj.value);
            }
        });
    });
}

// Render All Charts
function renderCharts() {
    renderScatterPlot();
    renderRegionChart();
    renderAgeChart();
}

// Chart 1: BMI vs Charges Scatter Plot
function renderScatterPlot() {
    const container = document.getElementById('scatter-plot');
    container.innerHTML = '';
    const { width, height } = container.getBoundingClientRect();
    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select('#scatter-plot')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Tools
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Scales
    const x = d3.scaleLinear()
        .domain(d3.extent(state.data, d => d.bmi))
        .range([0, plotWidth]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(state.data, d => d.charges)])
        .range([plotHeight, 0]);

    // Color scale for smoker
    const color = d3.scaleOrdinal()
        .domain([true, false])
        .range([COLORS.smoker, COLORS.nonSmoker]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x).ticks(5))
        .call(g => g.append("text")
            .attr("x", plotWidth)
            .attr("y", -5)
            .attr("fill", "#ccc")
            .attr("text-anchor", "end")
            .text("BMI"));

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format("$.0s")))
        .call(g => g.append("text")
            .attr("x", 5)
            .attr("y", 5)
            .attr("fill", "#ccc")
            .attr("text-anchor", "start")
            .text("Charges"));

    // Points
    const circles = svg.selectAll("circle")
        .data(state.data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.bmi))
        .attr("cy", d => y(d.charges))
        .attr("r", 4)
        .attr("fill", d => color(d.isSmoker))
        .attr("opacity", 0.7)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>BMI:</strong> ${d.bmi.toFixed(1)}<br/>
                <strong>Charges:</strong> ${d3.format("$,.2f")(d.charges)}<br/>
                <strong>Smoker:</strong> ${d.isSmoker ? "Yes" : "No"}<br/>
                <strong>Age:</strong> ${d.age}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
            
            d3.select(event.target).attr("r", 8).attr("opacity", 1);
        })
        .on("mouseout", (event) => {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(event.target).attr("r", 4).attr("opacity", 0.7);
        });

    // Legend
    const legendContainer = document.getElementById('scatter-legend');
    legendContainer.innerHTML = `
        <div class="legend-item"><div class="legend-dot" style="background:${COLORS.smoker}"></div>Smoker</div>
        <div class="legend-item"><div class="legend-dot" style="background:${COLORS.nonSmoker}"></div>Non-Smoker</div>
    `;

    // Animation with Anime.js
    anime({
        targets: '#scatter-plot circle',
        scale: [0, 1],
        opacity: [0, 0.7],
        easing: 'easeOutElastic(1, .8)',
        duration: 800,
        delay: anime.stagger(1) // stagger each dot slightly
    });
}

// Chart 2: Average Charges by Region
function renderRegionChart() {
    const container = document.getElementById('region-chart');
    container.innerHTML = '';
    const { width, height } = container.getBoundingClientRect();
    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select('#region-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Prepare Data
    const regionData = Array.from(d3.group(state.data, d => d.region), ([key, values]) => ({
        region: key,
        value: d3.mean(values, d => d.charges)
    })).sort((a, b) => b.value - a.value);

    // Scales
    const x = d3.scaleBand()
        .range([0, plotWidth])
        .domain(regionData.map(d => d.region))
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(regionData, d => d.value)])
        .range([plotHeight, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format("$.0s")));

    // Bars
    svg.selectAll("rect")
        .data(regionData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.region))
        .attr("y", plotHeight) // Start from bottom for animation
        .attr("width", x.bandwidth())
        .attr("height", 0) // Start with 0 height
        .attr("fill", COLORS.primary)
        .attr("rx", 4);

    // Animate Bars
    anime({
        targets: '#region-chart rect',
        height: d => plotHeight - y(d.__data__.value), // Functional value based on data
        y: d => y(d.__data__.value),
        easing: 'spring(1, 80, 10, 0)',
        duration: 1000,
        delay: anime.stagger(100)
    });
}

// Chart 3: Age Distribution vs Charges (Binning)
function renderAgeChart() {
    const container = document.getElementById('age-chart');
    container.innerHTML = '';
    const { width, height } = container.getBoundingClientRect();
    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select('#age-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Prepare Data - Bin ages into groups (18-25, 26-35, etc)
    const ageBins = d3.bin()
        .value(d => d.age)
        .thresholds([18, 25, 35, 45, 55, 65]);
    
    const bins = ageBins(state.data);
    
    // Calculate avg charges per bin
    const binData = bins.map(bin => ({
        x0: bin.x0,
        x1: bin.x1,
        avgCharge: d3.mean(bin, d => d.charges) || 0
    }));

    // Scales
    const x = d3.scaleLinear()
        .domain([18, 65])
        .range([0, plotWidth]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(binData, d => d.avgCharge)])
        .range([plotHeight, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${plotHeight})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x).ticks(5))
        .append("text")
        .attr("x", plotWidth/2)
        .attr("y", 35)
        .attr("fill", "#ccc")
        .text("Age Groups");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format("$.0s")));

    // Area Generator
    const area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(d => x((d.x0 + d.x1) / 2))
        .y0(plotHeight)
        .y1(d => y(d.avgCharge));

    // Append Path
    const path = svg.append("path")
        .datum(binData)
        .attr("fill", "url(#gradient)")
        .attr("stroke", COLORS.secondary)
        .attr("stroke-width", 2)
        .attr("d", area)
        .attr("opacity", 0.8);

    // Gradient definition
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", COLORS.secondary)
        .attr("stop-opacity", 0.6);
        
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", COLORS.secondary)
        .attr("stop-opacity", 0);

    // Animation (Dash Offset)
    const totalLength = path.node().getTotalLength();
    
    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

    // Animate Area opacity
    path.attr("opacity", 0)
        .transition()
        .delay(500)
        .duration(1000)
        .attr("opacity", 0.8);
}

// Initial Entry Animations
function initAnimations() {
    anime({
        targets: '.enter-animation',
        translateY: [20, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutQuad'
    });
}

// Start
document.addEventListener('DOMContentLoaded', initDashboard);
document.getElementById('refresh-btn').addEventListener('click', initDashboard);
