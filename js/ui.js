// UI Rendering Module
const UI = {
    // Initialize UI
    init() {
        this.updateEmptyStateForDisconnection();
    },
    
    // Update empty state for disconnection
    updateEmptyStateForDisconnection() {
        if (!State.serverAvailable) {
            State.elements.emptyState.innerHTML = `
                <i class="fas fa-plug" style="color: #ef4444;"></i>
                <h3>Server Connection Required</h3>
                <p>Please start the Flask server to continue</p>
                <div style="margin-top: 20px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <h4>How to start the server:</h4>
                    <ol style="text-align: left; margin: 10px 0; padding-left: 20px;">
                        <li>Open Command Prompt/Terminal</li>
                        <li>Navigate to your project folder</li>
                        <li>Run: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">python ltts_server.py</code></li>
                        <li>Wait for "Server starting on http://localhost:5000"</li>
                        <li>Click "Connect to Server" button below</li>
                    </ol>
                </div>
                <div style="margin-top: 30px;">
                    <button class="btn btn-primary" id="retryConnectionBtn">
                        <i class="fas fa-redo"></i> Retry Connection
                    </button>
                </div>
            `;
        }
    },
    
    // Toggle search filter collapsible
    toggleSearchFilter() {
        State.searchFilterCollapsed = !State.searchFilterCollapsed;
        if (State.searchFilterCollapsed) {
            State.elements.searchFilterContent.classList.add('collapsed');
            State.elements.searchFilterIcon.classList.remove('fa-chevron-down');
            State.elements.searchFilterIcon.classList.add('fa-chevron-up');
        } else {
            State.elements.searchFilterContent.classList.remove('collapsed');
            State.elements.searchFilterIcon.classList.remove('fa-chevron-up');
            State.elements.searchFilterIcon.classList.add('fa-chevron-down');
        }
    },

    // Toggle datasets section collapsible
    toggleDatasetsSection() {
        State.datasetsCollapsed = !State.datasetsCollapsed;
        if (State.datasetsCollapsed) {
            State.elements.datasetsContent.classList.add('collapsed');
            State.elements.datasetsChevronIcon.classList.remove('fa-chevron-down');
            State.elements.datasetsChevronIcon.classList.add('fa-chevron-up');
        } else {
            State.elements.datasetsContent.classList.remove('collapsed');
            State.elements.datasetsChevronIcon.classList.remove('fa-chevron-up');
            State.elements.datasetsChevronIcon.classList.add('fa-chevron-down');
        }
    },


    
    // Update UI based on data availability
    updateUI() {
        const hasData = State.combinedData.length > 0;
        
        if (hasData) {
            State.elements.emptyState.style.display = 'none';
            State.elements.tableContainer.style.display = 'block';
            State.elements.statsSection.style.display = 'flex';
            State.elements.datasetsSection.style.display = 'block';
            State.elements.deleteAllBtn.style.display = State.datasets.length > 0 ? 'inline-flex' : 'none';
            
            this.createColumnFilters();
            this.updateStats();
            this.updateDatasetsList();
            this.updateViewMode();
            this.updateVisualizations();
            SearchFilter.applyFilters();
        } else {
            State.elements.emptyState.style.display = 'block';
            State.elements.tableContainer.style.display = 'none';
            State.elements.statsSection.style.display = 'none';
            State.elements.datasetsSection.style.display = 'none';
            State.elements.deleteAllBtn.style.display = 'none';
            Visualizations.clear();
            
            if (State.serverAvailable) {
                State.elements.emptyState.innerHTML = `
                    <i class="fas fa-database"></i>
                    <h3>No Data Available</h3>
                    <p>Upload your first dataset to get started</p>
                    <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()" style="margin-top: 20px;">
                        <i class="fas fa-upload"></i> Upload Dataset
                    </button>
                `;
            }
        }
    },
    
    // Create column filters
    createColumnFilters() {
        State.elements.columnFilters.innerHTML = '';
        const columns = State.getUniqueColumns();
        const excludedColumns = ['CEO', 'CTO', 'Networth', 'Sl. Number', 'Contact Person', 'Unnamed', 'Email ID'];

        columns.forEach(column => {
            if (column === '_source' || column === '_id' || excludedColumns.includes(column)) return;

            const filterGroup = document.createElement('div');
            filterGroup.className = 'filter-group';
            filterGroup.innerHTML = `
                <label class="filter-label">${column}</label>
                <input type="text" class="filter-input"
                       data-column="${column}"
                       placeholder="Filter ${column}..."
                       value="${State.columnFilters[column] || ''}">
            `;
            State.elements.columnFilters.appendChild(filterGroup);
        });

        State.elements.columnFilters.style.display = 'grid';
    },
    
    // Update stats
    updateStats() {
        State.elements.totalRows.textContent = State.combinedData.length;
        
        const columns = new Set();
        State.combinedData.forEach(row => {
            Object.keys(row).forEach(col => {
                if (!['_source', '_id'].includes(col)) columns.add(col);
            });
        });
        State.elements.totalColumns.textContent = columns.size;
        
        State.elements.totalDatasets.textContent = State.datasets.length;
        State.elements.filteredRows.textContent = State.filteredData.length;
        
        if (State.searchResults.length > 0) {
            State.elements.tableTitle.textContent = `Search Results (${State.filteredData.length} rows)`;
            State.elements.searchInfo.style.display = 'block';
            State.elements.searchResultsCount.textContent = State.filteredData.length;
        } else if (Object.keys(State.columnFilters).length > 0) {
            State.elements.tableTitle.textContent = `Filtered Data (${State.filteredData.length} rows)`;
            State.elements.searchInfo.style.display = 'none';
        } else {
            State.elements.tableTitle.textContent = `Combined Database (${State.combinedData.length} rows)`;
            State.elements.searchInfo.style.display = 'none';
        }
    },
    
    // Update datasets list
    updateDatasetsList() {
        State.elements.datasetsList.innerHTML = '';

        if (State.datasets.length === 0) {
            State.elements.datasetsList.innerHTML = `
                <div class="no-datasets-message">
                    <i class="fas fa-database" style="font-size: 48px; color: #d1d5db;"></i>
                    <p style="color: #6b7280; font-style: italic; margin-top: 10px;">No datasets loaded</p>
                </div>
            `;
            return;
        }

        State.datasets.forEach(dataset => {
            const div = document.createElement('div');
            div.className = 'dataset-card';
            const fileSizeMB = (dataset.size / (1024 * 1024)).toFixed(2);

            div.innerHTML = `
                <div class="dataset-card-header">
                    <h4 class="dataset-name">${dataset.name}</h4>
                    <div class="dataset-header-info">
                        <span class="dataset-info">${dataset.rows.toLocaleString()} rows, ${dataset.columns} cols, ${fileSizeMB} MB</span>
                    </div>
                    <div class="dataset-actions">
                        <button onclick="event.stopPropagation(); UI.exportDataset('${dataset.name}')" title="Export dataset" class="action-btn export-btn">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="event.stopPropagation(); UI.handleDeleteDataset('${dataset.name}')" title="Delete dataset" class="action-btn delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            State.elements.datasetsList.appendChild(div);
        });
    },
    // Add this method to the UI object in ui.js
    updateVisualizations() {
        if (State.filteredData.length > 0) {
            Visualizations.update(State.filteredData);
        } else {
            Visualizations.clear();
        }
    },
    // Export dataset
    exportDataset(datasetName) {
        try {
            window.open(`${API.baseUrl}/export/dataset/${encodeURIComponent(datasetName)}`, '_blank');
            Utils.showAlert(`Exporting ${datasetName}`, 'info');
        } catch (error) {
            Utils.showAlert('Error exporting dataset: ' + error.message, 'error');
        }
    },
    
    // Handle delete dataset
    async handleDeleteDataset(datasetName) {
        if (!confirm(`Are you sure you want to delete dataset "${datasetName}"?`)) return;
        
        Utils.setLoading(true, 'Deleting dataset...');
        try {
            await API.deleteDataset(datasetName);
            Utils.showAlert(`Dataset "${datasetName}" deleted`, 'success');
            await DataLoader.loadInitialData();
        } catch (error) {
            Utils.showAlert(`Error deleting dataset: ${error.message}`, 'error');
            Utils.setLoading(false);
        }
    },
    
    // Update view mode
    updateViewMode() {
        if (State.viewMode === 'all') {
            State.elements.paginationControls.style.display = 'none';
            State.displayedData = [...State.filteredData];
        } else {
            State.elements.paginationControls.style.display = 'flex';
            this.updatePagination();
        }
        
        State.elements.rowCount.textContent = `Showing ${State.displayedData.length} rows`;
    },
    
    // Update pagination
    updatePagination() {
        State.totalPages = Math.max(1, Math.ceil(State.filteredData.length / State.pageSize));
        
        State.elements.prevPageBtn.disabled = State.currentPage <= 1;
        State.elements.nextPageBtn.disabled = State.currentPage >= State.totalPages;
        State.elements.pageInfo.textContent = `Page ${State.currentPage} of ${State.totalPages}`;
        
        State.updateDisplayedData();
        State.elements.rowCount.textContent = `Showing ${State.displayedData.length} rows (${State.filteredData.length} total)`;
    },
    
    // Render table
    renderTable() {
        if (State.filteredData.length === 0) {
            State.elements.tableWrapper.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; background: transparent; box-shadow: none;">
                    <i class="fas fa-search" style="font-size: 48px;"></i>
                    <h3>No Data Found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }
        
        const columnArray = State.getUniqueColumns();
        
        let html = '<table>';
        
        // Header
        html += '<thead><tr>';
        if (State.editMode) {
            html += '<th class="actions-cell">Actions</th>';
        }
        html += '<th>Source</th>';

        columnArray.forEach(col => {
            html += `<th onclick="Table.sort('${col}')" style="cursor: pointer;">
                ${col}
            </th>`;
        });

        html += '</tr></thead>';
        
        // Body
        html += '<tbody>';
        
        State.displayedData.forEach((row, rowIndex) => {
            if (!row) return;
            
            const absoluteIndex = rowIndex + ((State.currentPage - 1) * State.pageSize);
            const isEditing = State.editingRow === absoluteIndex;
            const rowId = row._id || '';
            
            html += `<tr data-row-index="${absoluteIndex}" data-row-id="${rowId}">`;

            if (State.editMode) {
                // Actions cell first
                html += `<td class="actions-cell">`;

                if (isEditing) {
                    html += `
                        <div class="action-buttons">
                            <button class="action-btn save-btn" onclick="EditMode.saveRow(${absoluteIndex})" title="Save">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn cancel-btn" onclick="EditMode.cancelRowEdit()" title="Cancel">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="EditMode.enableRowEdit(${absoluteIndex})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="EditMode.deleteRow(${absoluteIndex})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }

                html += `</td>`;
            }

            // Source column
            html += `<td>${row._source || ''}</td>`;

            // Data cells
            columnArray.forEach(col => {
                const cellValue = row[col];

                if (isEditing) {
                    html += `<td>
                        <input type="text" class="edit-input"
                               data-column="${col}"
                               value="${cellValue !== null && cellValue !== undefined ? cellValue : ''}">
                    </td>`;
                } else {
                    const displayValue = cellValue !== null && cellValue !== undefined ?
                        cellValue : '<span class="null-value">NULL</span>';
                    html += `<td>${displayValue}</td>`;
                }
            });
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        State.elements.tableWrapper.innerHTML = html;
    }
};

// Table operations
const Table = {
    // Sort table
    sort(column) {
        if (State.sortColumn === column) {
            State.sortDirection = State.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            State.sortColumn = column;
            State.sortDirection = 'asc';
        }
        
        State.filteredData.sort((a, b) => {
            const valA = a[column] || '';
            const valB = b[column] || '';
            
            if (valA < valB) return State.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return State.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        State.currentPage = 1;
        UI.updatePagination();
        UI.renderTable();
    }
};