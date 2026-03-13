// Visualizations Module
const Visualizations = {
    charts: {},
    vennOverlapFilterActive: false,
    
    // Initialize visualizations
    init() {
        this.createChartSection();
    },
    
    // Create chart section in DOM
    createChartSection() {
        const chartsSection = document.createElement('div');
        chartsSection.className = 'charts-section';
        chartsSection.id = 'chartsSection';
        chartsSection.style.display = 'none';
        chartsSection.innerHTML = `
            <div class="charts-header">
                <h3><i class="fas fa-chart-bar"></i> Data Visualizations <i class="fas fa-chevron-down"></i></h3>
            </div>
            <div class="charts-content collapsible-content" id="chartsContent">
                <div class="charts-grid" id="chartsGrid">
                <!-- HQ Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3><i class="fas fa-globe-americas"></i> Company Headquarters Distribution</h3>
                        <div class="chart-actions">
                            <button class="chart-btn active" data-chart-type="bar" onclick="Visualizations.changeChartType('hqChart', 'bar')">
                                <i class="fas fa-chart-bar"></i> Bar
                            </button>
                            <button class="chart-btn" data-chart-type="pie" onclick="Visualizations.changeChartType('hqChart', 'pie')">
                                <i class="fas fa-chart-pie"></i> Pie
                            </button>
                        </div>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="hqChart"></canvas>
                        <div class="chart-loading" id="hqChartLoading" style="display: none;">
                            <div class="loading"></div>
                            <span>Processing data...</span>
                        </div>
                        <div class="no-chart-data" id="hqChartNoData" style="display: none;">
                            <i class="fas fa-globe"></i>
                            <p>No HQ data available</p>
                        </div>
                    </div>
                    <div class="chart-stats" id="hqChartStats"></div>
                    <div class="chart-legend" id="hqChartLegend"></div>
                </div>

                <!-- Venn Diagram -->
                <div class="chart-container venn-chart-container">
                    <div class="chart-header">
                        <h3><i class="fas fa-project-diagram"></i> Exhibitors Source Overlap</h3>
                        <div class="chart-actions">
                            <button class="chart-btn" onclick="Visualizations.exportVennData()" title="Export overlap data">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                    <div class="venn-chart-wrapper">
                        <div class="venn-diagram-section">
                            <div class="venn-container">
                                <div class="venn-wrapper" id="vennWrapper"></div>
                                <div class="chart-loading" id="vennLoading" style="display: none;">
                                    <div class="loading"></div>
                                    <span>Processing data...</span>
                                </div>
                                <div class="no-chart-data" id="vennNoData" style="display: none;">
                                    <i class="fas fa-project-diagram"></i>
                                    <p>No Exhibitors Name data available</p>
                                </div>
                            </div>
                        </div>
                        <div class="venn-legend-box" id="vennLegendBox">
                            <div class="venn-legend-header">
                                Legend
                                <button class="chart-btn" onclick="Visualizations.clearVennFilters()" title="Clear all Venn filters" style="float: right; padding: 4px 8px; font-size: 11px;">
                                    <i class="fas fa-times"></i> Clear
                                </button>
                            </div>
                            <div class="venn-legend" id="vennLegend"></div>
                        </div>
                    </div>
                    <div class="chart-stats" id="vennStats"></div>
                </div>
            </div>
        `;
        
        // Insert after stats section
        const statsSection = document.getElementById('statsSection');
        statsSection.parentNode.insertBefore(chartsSection, statsSection.nextSibling);
        
        this.cacheElements();
    },
    
    // Cache DOM elements
    cacheElements() {
        this.elements = {
            chartsSection: document.getElementById('chartsSection'),
            chartsContent: document.getElementById('chartsContent'),
            chartsHeader: document.querySelector('.charts-header h3'),
            chartsGrid: document.getElementById('chartsGrid'),
            chartsToggle: document.getElementById('chartsToggle'),
            hqChart: document.getElementById('hqChart'),
            hqChartLoading: document.getElementById('hqChartLoading'),
            hqChartNoData: document.getElementById('hqChartNoData'),
            hqChartStats: document.getElementById('hqChartStats'),
            hqChartLegend: document.getElementById('hqChartLegend'),
            vennWrapper: document.getElementById('vennWrapper'),
            vennLoading: document.getElementById('vennLoading'),
            vennNoData: document.getElementById('vennNoData'),
            vennLegend: document.getElementById('vennLegend'),
            vennLegendBox: document.getElementById('vennLegendBox'),
            vennStats: document.getElementById('vennStats')
        };

        // Add click handler to header
        if (this.elements.chartsHeader) {
            this.elements.chartsHeader.addEventListener('click', () => this.toggleCharts());
            this.elements.chartsHeader.style.cursor = 'pointer';
        }
    },

    // Toggle charts visibility
    toggleCharts() {
        const chartsContent = this.elements.chartsContent;
        const isCollapsed = chartsContent.classList.contains('collapsed');

        if (isCollapsed) {
            chartsContent.classList.remove('collapsed');
            this.elements.chartsHeader.querySelector('i').className = 'fas fa-chevron-down';
            // Re-render charts when expanding if data exists
            if (State.filteredData && State.filteredData.length > 0) {
                this.update(State.filteredData);
            }
        } else {
            chartsContent.classList.add('collapsed');
            this.elements.chartsHeader.querySelector('i').className = 'fas fa-chevron-up';
            // Clear charts when collapsing to prevent strange centering
            this.clearCharts();
        }
    },
    
    // Update visualizations based on current data
    update(data) {
        if (!data || data.length === 0) {
            this.elements.chartsSection.style.display = 'none';
            return;
        }
        
        this.elements.chartsSection.style.display = 'block';
        this.updateHQChart(data);
        this.updateVennDiagram(data);
    },
    
    // ==================== HQ CHART METHODS ====================
    
    // Update HQ distribution chart
    updateHQChart(data) {
        const hqData = data.filter(row => row.HQ);
        
        if (hqData.length === 0) {
            this.elements.hqChart.style.display = 'none';
            this.elements.hqChartNoData.style.display = 'flex';
            this.elements.hqChartLoading.style.display = 'none';
            return;
        }
        
        this.elements.hqChartLoading.style.display = 'flex';
        this.elements.hqChart.style.display = 'none';
        this.elements.hqChartNoData.style.display = 'none';
        
        // Process data in background to prevent UI freeze
        setTimeout(() => {
            const processedData = ChartUtils.processHQData(hqData);
            
            if (processedData.chartData.length === 0) {
                this.elements.hqChartLoading.style.display = 'none';
                this.elements.hqChartNoData.style.display = 'flex';
                return;
            }
            
            this.renderHQChart(processedData);
            this.updateHQStats(processedData);
            this.updateHQLegend(processedData);
            
            this.elements.hqChartLoading.style.display = 'none';
            this.elements.hqChart.style.display = 'block';
        }, 100);
    },
    
    // Render HQ chart
    renderHQChart(processedData) {
        const ctx = this.elements.hqChart.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.hqChart) {
            this.charts.hqChart.destroy();
        }
        
        const labels = processedData.chartData.map(item => item.country);
        const data = processedData.chartData.map(item => item.count);
        const colors = ChartUtils.getChartColors(labels.length);
        
        // Get current chart type or default to bar
        const chartType = this.charts.hqChartType || 'bar';
        
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Number of Companies',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 6 : 0,
                hoverBackgroundColor: colors.map(color => color.replace('0.8', '0.9'))
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = processedData.totalCompanies;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${ChartUtils.formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: chartType === 'bar' ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return ChartUtils.formatNumber(value);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            } : undefined
        };
        
        this.charts.hqChart = new Chart(ctx, {
            type: chartType,
            data: chartData,
            options: options
        });
    },
    
    // Update HQ chart stats
    updateHQStats(processedData) {
        const statsHtml = `
            <div class="stat-item">
                <span class="stat-label">Total Companies</span>
                <span class="stat-value">${ChartUtils.formatNumber(processedData.totalCompanies)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Countries</span>
                <span class="stat-value">${ChartUtils.formatNumber(processedData.uniqueCountries)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Top Country</span>
                <span class="stat-value">${processedData.rawData[0] ? processedData.rawData[0][0] : 'N/A'}</span>
            </div>
            ${processedData.rawData[0] ? `
                <div class="stat-item">
                    <span class="stat-label">Top Country %</span>
                    <span class="stat-value">${((processedData.rawData[0][1] / processedData.totalCompanies) * 100).toFixed(1)}%</span>
                </div>
            ` : ''}
        `;
        
        this.elements.hqChartStats.innerHTML = statsHtml;
    },
    
    // Update HQ chart legend
    updateHQLegend(processedData) {
        const colors = ChartUtils.getChartColors(processedData.chartData.length);
        let legendHtml = '';
        
        processedData.chartData.forEach((item, index) => {
            const percentage = processedData.totalCompanies > 0 
                ? ((item.count / processedData.totalCompanies) * 100).toFixed(1) 
                : 0;
            
            legendHtml += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${colors[index]}"></span>
                    <span>${item.country}</span>
                    <span style="color: #6b7280; font-weight: 500;">
                        ${ChartUtils.formatNumber(item.count)} (${percentage}%)
                    </span>
                </div>
            `;
        });
        
        this.elements.hqChartLegend.innerHTML = legendHtml;
    },
    
    // Change chart type
    changeChartType(chartId, type) {
        if (chartId === 'hqChart') {
            this.charts.hqChartType = type;
            
            // Update active button - FIXED: Get buttons from correct container
            const chartContainer = this.elements.hqChart.closest('.chart-container');
            const buttons = chartContainer.querySelectorAll('.chart-btn');
            buttons.forEach(btn => {
                if (btn.dataset.chartType === type) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Re-render chart
            const hqData = State.filteredData.filter(row => row.HQ);
            if (hqData.length > 0) {
                const processedData = ChartUtils.processHQData(hqData);
                if (processedData.chartData.length > 0) {
                    this.renderHQChart(processedData);
                    
                    // Ensure chart is visible after re-rendering
                    this.elements.hqChart.style.display = 'block';
                    this.elements.hqChartLoading.style.display = 'none';
                    this.elements.hqChartNoData.style.display = 'none';
                }
            }
        }
    },
    
    // ==================== VENN DIAGRAM METHODS ====================
    
    // Update Venn diagram
    updateVennDiagram(data) {
        const exhibitorData = data.filter(row => row['Exhibitors Name']);
        
        if (exhibitorData.length === 0) {
            this.elements.vennWrapper.innerHTML = '';
            this.elements.vennNoData.style.display = 'flex';
            this.elements.vennLoading.style.display = 'none';
            this.elements.vennLegend.innerHTML = '';
            this.elements.vennStats.innerHTML = '';
            return;
        }
        
        this.elements.vennLoading.style.display = 'flex';
        this.elements.vennWrapper.innerHTML = '';
        this.elements.vennNoData.style.display = 'none';
        
        // Process data in background
        setTimeout(() => {
            const vennData = ChartUtils.processVennData(exhibitorData);
            
            if (vennData.sourceCount === 0) {
                this.elements.vennLoading.style.display = 'none';
                this.elements.vennNoData.style.display = 'flex';
                return;
            }
            
            this.renderVennDiagram(vennData);
            this.updateVennStats(vennData);
            
            this.elements.vennLoading.style.display = 'none';
        }, 100);
    },
    
    // Render Venn diagram
    renderVennDiagram(vennData) {
        const { sources, overlaps, sourceCount } = vennData;
        const sourceKeys = Object.keys(sources);

        // Show all sources
        const allSources = sourceKeys;
        const allSourceCount = allSources.length;

        // Include all overlaps
        const allOverlaps = overlaps;

        const colors = ChartUtils.getVennColors(allSourceCount);
        const positions = ChartUtils.calculateVennPositions(sources);

        // Clear previous diagram
        this.elements.vennWrapper.innerHTML = '';

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'venn-tooltip';
        tooltip.style.display = 'none';
        this.elements.vennWrapper.appendChild(tooltip);

        // Draw circles for each source
        allSources.forEach((source, index) => {
            const companyCount = sources[source].length;
            const position = positions[index];
            const color = colors[index];

            // Create circle element
            const circle = document.createElement('div');
            circle.className = 'venn-circle';
            circle.dataset.source = source;
            circle.style.cssText = `
                left: ${position.x - position.radius}px;
                top: ${position.y - position.radius}px;
                width: ${position.radius * 2}px;
                height: ${position.radius * 2}px;
                background-color: ${color};
                box-shadow: 0 4px 12px ${color.replace('0.7', '0.3')};
            `;

            // Add count label
            const countLabel = document.createElement('div');
            countLabel.className = 'venn-count';
            countLabel.textContent = ChartUtils.formatNumber(companyCount);
            countLabel.style.cssText = `
                top: ${position.radius - 10}px;
                left: ${position.radius - 15}px;
            `;
            circle.appendChild(countLabel);

            // Add source label
            const sourceLabel = document.createElement('div');
            sourceLabel.className = 'venn-source-label';
            sourceLabel.textContent = this.truncateText(source, 12);
            sourceLabel.style.cssText = `
                top: ${position.radius + 15}px;
                left: ${position.radius - 35}px;
                width: 70px;
                text-align: center;
                font-size: 11px;
            `;
            circle.appendChild(sourceLabel);

            // Add hover effects
            circle.addEventListener('mouseenter', (e) => {
                const tooltipContent = ChartUtils.generateVennTooltip(
                    source,
                    sources[source],
                    [source]
                );
                this.showVennTooltip(tooltip, e, tooltipContent);
                circle.style.opacity = '0.8';
                circle.style.transform = 'scale(1.02)';
            });

            circle.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
                circle.style.opacity = '0.6';
                circle.style.transform = 'scale(1)';
            });

            // Add click handler for filtering by source
            circle.addEventListener('click', () => {
                this.filterByVennSource(source);
            });

            this.elements.vennWrapper.appendChild(circle);
        });

        // Overlap information is now available in the legend - no center card needed

        // Update legend
        this.updateVennLegend(allSources, sources, colors, allOverlaps);
    },
    
    // Show Venn tooltip
    showVennTooltip(tooltip, event, content) {
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        
        const rect = this.elements.vennWrapper.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y + 10}px`;
        
        // Adjust if tooltip goes out of bounds
        const tooltipRect = tooltip.getBoundingClientRect();
        if (x + tooltipRect.width > rect.width) {
            tooltip.style.left = `${x - tooltipRect.width - 10}px`;
        }
        if (y + tooltipRect.height > rect.height) {
            tooltip.style.top = `${y - tooltipRect.height - 10}px`;
        }
    },
    
    // Update Venn legend
    updateVennLegend(sourceKeys, sources, colors, overlaps) {
        let legendHtml = '';
        
        // Add source items
        sourceKeys.forEach((source, index) => {
            const count = sources[source].length;
            legendHtml += `
                <div class="venn-legend-item" data-source="${source}">
                    <span class="venn-legend-color" style="background-color: ${colors[index]}"></span>
                    <span class="venn-legend-text">${this.truncateText(source, 20)}</span>
                    <span class="venn-legend-count">${ChartUtils.formatNumber(count)}</span>
                </div>
            `;
        });
        
        // Add overlap items
        const overlapEntries = Object.entries(overlaps).sort((a, b) => b[1].length - a[1].length);
        overlapEntries.forEach(([key, companies]) => {
            // Calculate blended color for overlaps
            const overlapSources = key.split('∩');
            const overlapColors = overlapSources.map(source => {
                const sourceIndex = sourceKeys.indexOf(source);
                return sourceIndex >= 0 ? colors[sourceIndex] : '#6b7280';
            });

            // Blend colors by averaging RGB values
            const blendedColor = this.blendColors(overlapColors);
            const readableKey = key.replace(/∩/g, ' & ');

            legendHtml += `
                <div class="venn-legend-item" data-overlap="${key}">
                    <span class="venn-legend-color" style="background-color: ${blendedColor}"></span>
                    <span class="venn-legend-text">${readableKey}</span>
                    <span class="venn-legend-count">${ChartUtils.formatNumber(companies.length)}</span>
                </div>
            `;
        });
        
        this.elements.vennLegend.innerHTML = legendHtml;
        
        // Add click handlers to legend items
        this.elements.vennLegend.querySelectorAll('.venn-legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const source = item.dataset.source;
                const overlap = item.dataset.overlap;

                if (source) {
                    // Filter by source
                    this.filterByVennSource(source);
                } else if (overlap) {
                    // Filter by specific overlap
                    const overlapCompanies = overlaps[overlap];
                    if (overlapCompanies && overlapCompanies.length > 0) {
                        const filteredData = State.filteredData.filter(row =>
                            row['Exhibitors Name'] && overlapCompanies.includes(row['Exhibitors Name'])
                        );
                        State.updateFilteredData(filteredData);
                        this.vennOverlapFilterActive = true;
                        State.currentPage = 1;
                        UI.updateViewMode();
                        UI.renderTable();
                        UI.updateStats();
                        UI.updateVisualizations();
                        Utils.showAlert(`Filtered to show only companies in "${overlap.replace(/∩/g, ' & ')}" (${overlapCompanies.length} companies)`, 'info');
                    }
                }
            });
        });
    },
    
    // Update Venn stats
    updateVennStats(vennData) {
        const { uniqueCompanies, totalCompanies, sourceCount, overlaps } = vennData;
        const overlapCount = Object.values(overlaps).reduce((sum, arr) => sum + arr.length, 0);
        const uniqueOverlapCount = new Set(
            Object.values(overlaps).flatMap(arr => arr)
        ).size;
        
        const overlapPercentage = totalCompanies > 0 
            ? ((uniqueOverlapCount / totalCompanies) * 100).toFixed(1) 
            : 0;
        
        const statsHtml = `
            <div class="stat-item">
                <span class="stat-label">Total Exhibitors</span>
                <span class="stat-value">${ChartUtils.formatNumber(totalCompanies)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Unique Exhibitors</span>
                <span class="stat-value">${ChartUtils.formatNumber(uniqueCompanies)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Data Sources</span>
                <span class="stat-value">${ChartUtils.formatNumber(sourceCount)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Overlap %</span>
                <span class="stat-value">${overlapPercentage}%</span>
            </div>
        `;
        
        this.elements.vennStats.innerHTML = statsHtml;
    },
    
    // Filter by Venn source
    filterByVennSource(source) {
        // Create a filter for companies from this specific source
        const sourceCompanies = State.filteredData.filter(row =>
            row['Exhibitors Name'] && row._source === source
        );

        if (sourceCompanies.length > 0) {
            // Apply the filter by setting column filter
            State.columnFilters['_source'] = source;
            SearchFilter.applyFilters();
            State.currentPage = 1;
            UI.updateViewMode();
            UI.renderTable();
            UI.updateStats();
            UI.updateVisualizations();
            Utils.showAlert(`Filtered to show only companies from "${source}" (${sourceCompanies.length} companies)`, 'info');
        }
    },

    // Filter by Venn overlap
    filterByVennOverlap(overlaps) {
        // Get all companies that appear in any overlap
        const overlapCompanies = new Set();
        Object.values(overlaps).forEach(companies => {
            companies.forEach(company => overlapCompanies.add(company));
        });

        if (overlapCompanies.size > 0) {
            // Create a custom filter for companies in overlaps
            const filteredData = State.filteredData.filter(row =>
                row['Exhibitors Name'] && overlapCompanies.has(row['Exhibitors Name'])
            );

            State.updateFilteredData(filteredData);
            State.currentPage = 1;

            UI.updateViewMode();
            UI.renderTable();
            UI.updateStats();
            UI.updateVisualizations();

            Utils.showAlert(`Filtered to show only overlapping companies (${overlapCompanies.size} companies)`, 'info');
        }
    },

    // Clear Venn filters
    clearVennFilters() {
        let cleared = false;

        // Clear the _source filter if it exists
        if (State.columnFilters['_source']) {
            delete State.columnFilters['_source'];
            cleared = true;
        }

        // Clear overlap filter if active
        if (this.vennOverlapFilterActive) {
            this.vennOverlapFilterActive = false;
            cleared = true;
        }

        // Reapply filters to update the data
        if (cleared) {
            SearchFilter.applyFilters();
            State.currentPage = 1;
            UI.updateViewMode();
            UI.renderTable();
            UI.updateStats();
            UI.updateVisualizations();
            Utils.showAlert('Venn filters cleared', 'info');
        } else {
            Utils.showAlert('No Venn filters to clear', 'info');
        }
    },

    // Export Venn data
    exportVennData() {
        if (!State.filteredData || State.filteredData.length === 0) {
            Utils.showAlert('No data to export', 'warning');
            return;
        }

        const vennData = ChartUtils.processVennData(
            State.filteredData.filter(row => row['Exhibitors Name'])
        );

        if (vennData.sourceCount === 0) {
            Utils.showAlert('No exhibitors data to export', 'warning');
            return;
        }

        // Create CSV content
        let csvContent = "Source Overlap Analysis\n\n";
        csvContent += "Section,Companies Count,Company Names\n";

        // Add sources
        Object.entries(vennData.sources).forEach(([source, companies]) => {
            csvContent += `"${source}",${companies.length},"${companies.join('; ')}"\n`;
        });

        // Add overlaps
        Object.entries(vennData.overlaps).forEach(([overlap, companies]) => {
            csvContent += `"${overlap}",${companies.length},"${companies.join('; ')}"\n`;
        });

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `venn_overlap_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Utils.showAlert('Venn diagram data exported successfully', 'success');
    },
    
    // ==================== UTILITY METHODS ====================
    
    // Blend colors for overlap visualization
    blendColors(colors) {
        if (colors.length === 0) return '#6b7280';
        if (colors.length === 1) return colors[0];

        // Convert rgba to rgb values and average them
        const rgbValues = colors.map(color => {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
            return { r: 107, g: 114, b: 128 }; // Default gray
        });

        const avgR = Math.round(rgbValues.reduce((sum, val) => sum + val.r, 0) / rgbValues.length);
        const avgG = Math.round(rgbValues.reduce((sum, val) => sum + val.g, 0) / rgbValues.length);
        const avgB = Math.round(rgbValues.reduce((sum, val) => sum + val.b, 0) / rgbValues.length);

        return `rgba(${avgR}, ${avgG}, ${avgB}, 0.7)`;
    },

    // Truncate text for labels
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },
    
    // Clear charts without hiding section (for collapse)
    clearCharts() {
        // Clear HQ chart
        if (this.charts.hqChart) {
            this.charts.hqChart.destroy();
            this.charts.hqChart = null;
        }

        // Clear Venn diagram
        this.elements.vennWrapper.innerHTML = '';
        this.elements.vennLegend.innerHTML = '';
        this.elements.vennStats.innerHTML = '';

        // Reset HQ chart elements
        this.elements.hqChartStats.innerHTML = '';
        this.elements.hqChartLegend.innerHTML = '';
        this.elements.hqChart.style.display = 'none';
        this.elements.hqChartNoData.style.display = 'none';
        this.elements.hqChartLoading.style.display = 'none';
    },

    // Clear all charts
    clear() {
        this.clearCharts();
        this.elements.chartsSection.style.display = 'none';
    }
};

// Make methods available globally
window.Visualizations = Visualizations;