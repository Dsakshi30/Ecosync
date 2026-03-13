// Chart Utilities - NLP and data processing functions
const ChartUtils = {
    // Process data for Venn diagram
    processVennData(data) {
        if (!data || data.length === 0) {
            return {
                sources: {},
                overlaps: {},
                uniqueCompanies: 0,
                totalCompanies: 0
            };
        }
        
        // Group companies by source
        const sourceMap = {};
        const companyToSources = {};
        
        data.forEach(row => {
            if (row['Exhibitors Name'] && row._source) {
                const company = row['Exhibitors Name'].toString().trim();
                const source = row._source.toString().trim();
                
                if (!companyToSources[company]) {
                    companyToSources[company] = new Set();
                }
                companyToSources[company].add(source);
                
                if (!sourceMap[source]) {
                    sourceMap[source] = new Set();
                }
                sourceMap[source].add(company);
            }
        });
        
        // Convert sets to arrays
        const sources = {};
        Object.keys(sourceMap).forEach(source => {
            sources[source] = Array.from(sourceMap[source]);
        });
        
        // Calculate overlaps
        const sourceKeys = Object.keys(sources);
        const overlaps = {};
        
        // Calculate pairwise overlaps
        for (let i = 0; i < sourceKeys.length; i++) {
            for (let j = i + 1; j < sourceKeys.length; j++) {
                const source1 = sourceKeys[i];
                const source2 = sourceKeys[j];
                const key = [source1, source2].sort().join('∩');
                
                const overlap = sources[source1].filter(company => 
                    sources[source2].includes(company)
                );
                
                if (overlap.length > 0) {
                    overlaps[key] = overlap;
                }
            }
        }
        
        // Calculate three-way overlaps if we have 3+ sources
        if (sourceKeys.length >= 3) {
            for (let i = 0; i < sourceKeys.length; i++) {
                for (let j = i + 1; j < sourceKeys.length; j++) {
                    for (let k = j + 1; k < sourceKeys.length; k++) {
                        const source1 = sourceKeys[i];
                        const source2 = sourceKeys[j];
                        const source3 = sourceKeys[k];
                        const key = [source1, source2, source3].sort().join('∩');

                        const overlap = sources[source1].filter(company =>
                            sources[source2].includes(company) &&
                            sources[source3].includes(company)
                        );

                        if (overlap.length > 0) {
                            overlaps[key] = overlap;
                        }
                    }
                }
            }
        }

        // Calculate four-way overlaps if we have 4+ sources
        if (sourceKeys.length >= 4) {
            for (let i = 0; i < sourceKeys.length; i++) {
                for (let j = i + 1; j < sourceKeys.length; j++) {
                    for (let k = j + 1; k < sourceKeys.length; k++) {
                        for (let l = k + 1; l < sourceKeys.length; l++) {
                            const source1 = sourceKeys[i];
                            const source2 = sourceKeys[j];
                            const source3 = sourceKeys[k];
                            const source4 = sourceKeys[l];
                            const key = [source1, source2, source3, source4].sort().join('∩');

                            const overlap = sources[source1].filter(company =>
                                sources[source2].includes(company) &&
                                sources[source3].includes(company) &&
                                sources[source4].includes(company)
                            );

                            if (overlap.length > 0) {
                                overlaps[key] = overlap;
                            }
                        }
                    }
                }
            }
        }
        
        // Calculate unique companies across all sources
        const allCompanies = new Set();
        Object.values(sources).forEach(companies => {
            companies.forEach(company => allCompanies.add(company));
        });
        
        return {
            sources,
            overlaps,
            uniqueCompanies: allCompanies.size,
            totalCompanies: data.filter(row => row['Exhibitors Name']).length,
            sourceCount: sourceKeys.length
        };
    },

    // Calculate optimal Venn diagram positions
    calculateVennPositions(sources) {
        const sourceKeys = Object.keys(sources);
        const positions = [];
        
        if (sourceKeys.length === 1) {
            positions.push({ x: 150, y: 150, radius: 120 });
        } else if (sourceKeys.length === 2) {
            positions.push({ x: 100, y: 150, radius: 100 });
            positions.push({ x: 200, y: 150, radius: 100 });
        } else if (sourceKeys.length === 3) {
            positions.push({ x: 150, y: 100, radius: 90 });
            positions.push({ x: 100, y: 180, radius: 90 });
            positions.push({ x: 200, y: 180, radius: 90 });
        } else if (sourceKeys.length === 4) {
            positions.push({ x: 120, y: 120, radius: 80 });
            positions.push({ x: 180, y: 120, radius: 80 });
            positions.push({ x: 120, y: 180, radius: 80 });
            positions.push({ x: 180, y: 180, radius: 80 });
        } else {
            // For more than 4 sources, use a circular layout
            const centerX = 150;
            const centerY = 150;
            const radius = 120;
            const angleStep = (2 * Math.PI) / sourceKeys.length;
            
            sourceKeys.forEach((_, index) => {
                const angle = index * angleStep;
                positions.push({
                    x: centerX + radius * Math.cos(angle) * 0.7,
                    y: centerY + radius * Math.sin(angle) * 0.7,
                    radius: 70
                });
            });
        }
        
        return positions;
    },

    // Get colors for Venn diagram
    getVennColors(count) {
        const vennColors = [
            'rgba(79, 70, 229, 0.7)',   // Indigo
            'rgba(16, 185, 129, 0.7)',  // Emerald
            'rgba(245, 158, 11, 0.7)',  // Amber
            'rgba(239, 68, 68, 0.7)',   // Red
            'rgba(139, 92, 246, 0.7)',  // Violet
            'rgba(20, 184, 166, 0.7)',  // Teal
            'rgba(249, 115, 22, 0.7)',  // Orange
            'rgba(131, 56, 236, 0.7)'   // Purple
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(vennColors[i % vennColors.length]);
        }
        return colors;
    },

    // Generate tooltip content for Venn diagram
    generateVennTooltip(section, companies, sourceNames) {
        let tooltip = `<strong>${section}</strong><br>`;
        tooltip += `Count: <strong>${companies.length}</strong><br><br>`;
        
        if (companies.length <= 10) {
            tooltip += 'Companies:<br>';
            companies.slice(0, 10).forEach(company => {
                tooltip += `• ${company}<br>`;
            });
        } else {
            tooltip += `Sample companies (${companies.length} total):<br>`;
            companies.slice(0, 5).forEach(company => {
                tooltip += `• ${company}<br>`;
            });
            tooltip += `... and ${companies.length - 5} more`;
        }
        
        return tooltip;
    },

    // Country detection using NLP-like approach
    detectCountry(text) {
        if (!text || typeof text !== 'string') return 'Unknown';
        
        const lowerText = text.toLowerCase().trim();
        
        // Country mappings with common variations
        const countryPatterns = {
            'India': ['india', 'indian', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ind'],
            'United States': ['usa', 'us', 'united states', 'america', 'american', 'new york', 'california', 'texas', 'florida', 'chicago', 'los angeles'],
            'United Kingdom': ['uk', 'united kingdom', 'britain', 'british', 'london', 'england', 'scotland', 'wales'],
            'Canada': ['canada', 'canadian', 'toronto', 'vancouver', 'montreal'],
            'Australia': ['australia', 'australian', 'sydney', 'melbourne'],
            'Germany': ['germany', 'german', 'berlin', 'munich', 'frankfurt'],
            'France': ['france', 'french', 'paris'],
            'Japan': ['japan', 'japanese', 'tokyo', 'osaka'],
            'China': ['china', 'chinese', 'beijing', 'shanghai'],
            'Singapore': ['singapore', 'singaporean'],
            'United Arab Emirates': ['uae', 'dubai', 'abu dhabi', 'emirates'],
            'Brazil': ['brazil', 'brazilian', 'sao paulo', 'rio de janeiro'],
            'Russia': ['russia', 'russian', 'moscow'],
            'South Korea': ['south korea', 'korea', 'korean', 'seoul'],
            'Netherlands': ['netherlands', 'dutch', 'amsterdam'],
            'Switzerland': ['switzerland', 'swiss', 'zurich', 'geneva'],
            'Sweden': ['sweden', 'swedish', 'stockholm'],
            'Italy': ['italy', 'italian', 'rome', 'milan'],
            'Spain': ['spain', 'spanish', 'madrid', 'barcelona'],
            'Mexico': ['mexico', 'mexican']
        };
        
        // Check for exact matches first
        for (const [country, patterns] of Object.entries(countryPatterns)) {
            for (const pattern of patterns) {
                if (lowerText.includes(pattern)) {
                    return country;
                }
            }
        }
        
        // Check for country codes (2-3 letters)
        const countryCodePattern = /\b([A-Z]{2,3})\b/;
        const codeMatch = lowerText.match(countryCodePattern);
        if (codeMatch) {
            const code = codeMatch[1].toUpperCase();
            const codeToCountry = {
                'IN': 'India',
                'US': 'United States',
                'USA': 'United States',
                'UK': 'United Kingdom',
                'CA': 'Canada',
                'AU': 'Australia',
                'DE': 'Germany',
                'FR': 'France',
                'JP': 'Japan',
                'CN': 'China',
                'SG': 'Singapore',
                'AE': 'United Arab Emirates',
                'BR': 'Brazil',
                'RU': 'Russia',
                'KR': 'South Korea',
                'NL': 'Netherlands',
                'CH': 'Switzerland',
                'SE': 'Sweden',
                'IT': 'Italy',
                'ES': 'Spain',
                'MX': 'Mexico'
            };
            
            if (codeToCountry[code]) {
                return codeToCountry[code];
            }
        }
        
        return 'Other';
    },
    
    // Process HQ column data
    processHQData(data) {
        const countryCounts = {};
        
        data.forEach(row => {
            if (row.HQ) {
                const country = this.detectCountry(row.HQ);
                countryCounts[country] = (countryCounts[country] || 0) + 1;
            }
        });
        
        // Sort by count
        const sortedCountries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1]);
        
        // Prepare data for chart - top 2 + rest as "Rest of World"
        let topCountries = [];
        let restOfWorld = 0;
        
        sortedCountries.forEach(([country, count], index) => {
            if (index < 2) {
                topCountries.push({ country, count });
            } else {
                restOfWorld += count;
            }
        });
        
        // Add "Rest of World" if there are other countries
        if (restOfWorld > 0) {
            topCountries.push({ country: 'Rest of World', count: restOfWorld });
        }
        
        return {
            chartData: topCountries,
            rawData: sortedCountries,
            totalCompanies: data.filter(row => row.HQ).length,
            uniqueCountries: sortedCountries.length
        };
    },
    
    // Get random colors for charts
    getChartColors(count) {
        const baseColors = [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    },
    
    // Format number with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};