// Event Listeners Module
const Events = {
    // Initialize all event listeners
    init() {
        this.setupConnectionEvents();
        this.setupFileEvents();
        this.setupButtonEvents();
        this.setupSearchEvents();
        this.setupEditEvents();
        this.setupPaginationEvents();
        this.setupViewModeEvents();
    },
    
    // Connection events
    setupConnectionEvents() {
        State.elements.startConnectionBtn.addEventListener('click', DataLoader.testServerConnection);
    },
    
    // File events
    setupFileEvents() {
        State.elements.uploadBtn.addEventListener('click', () => {
            if (!State.serverAvailable) {
                Utils.showAlert('Please connect to server first', 'warning');
                return;
            }
            State.elements.fileInput.click();
        });
        
        State.elements.fileInput.addEventListener('change', DataLoader.handleFileUpload);
    },
    
    // Button events
    setupButtonEvents() {
        State.elements.exportBtn.addEventListener('click', Utils.exportCombinedData);
        State.elements.refreshBtn.addEventListener('click', DataLoader.loadInitialData);
        State.elements.applyFiltersBtn.addEventListener('click', () => SearchFilter.applyAllFilters());
        State.elements.clearFiltersBtn.addEventListener('click', () => SearchFilter.clearAllFilters());
        State.elements.deleteAllBtn.addEventListener('click', Utils.confirmDeleteAllDatasets);
    },
    
    // Search events
    setupSearchEvents() {
        State.elements.globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') SearchFilter.applyAllFilters();
        });
        
        State.elements.fuzzyToggle.addEventListener('change', (e) => {
            State.fuzzySearch = e.target.checked;
        });
    },
    
    // Edit events
    setupEditEvents() {
        State.elements.editModeToggle.addEventListener('change', () => EditMode.toggleEditMode());
        State.elements.saveEditBtn.addEventListener('click', () => EditMode.saveAllEdits());
        State.elements.cancelEditBtn.addEventListener('click', () => EditMode.cancelEditMode());
    },
    
    // Pagination events
    setupPaginationEvents() {
        State.elements.prevPageBtn.addEventListener('click', () => {
            if (State.currentPage > 1) {
                State.currentPage--;
                UI.updatePagination();
                UI.renderTable();
            }
        });
        
        State.elements.nextPageBtn.addEventListener('click', () => {
            if (State.currentPage < State.totalPages) {
                State.currentPage++;
                UI.updatePagination();
                UI.renderTable();
            }
        });
        
        State.elements.pageSizeSelect.addEventListener('change', (e) => {
            State.pageSize = parseInt(e.target.value);
            State.currentPage = 1;
            UI.updatePagination();
            UI.renderTable();
        });
    },
    
    // View mode events
    setupViewModeEvents() {
        document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                State.viewMode = e.target.value;
                UI.updateViewMode();
                UI.renderTable();
            });
        });
    }
};