// Global State Management
const State = {
    combinedData: [],
    datasets: [],
    filteredData: [],
    displayedData: [],
    searchResults: [],
    editMode: false,
    editingRow: null,
    filters: {},
    sortColumn: null,
    sortDirection: 'asc',
    currentPage: 1,
    pageSize: 25,
    totalPages: 1,
    fuzzySearch: true,
    isLoading: false,
    serverAvailable: false,
    viewMode: 'paged',
    columnFilters: {},
    searchFilterCollapsed: true,
    datasetsCollapsed: false,
    
    // DOM Elements cache
    elements: {},
    
    // Initialize state
    init() {
        // Cache DOM elements
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            startConnectionBtn: document.getElementById('startConnectionBtn'),
            fileInput: document.getElementById('fileInput'),
            uploadBtn: document.getElementById('uploadBtn'),
            exportBtn: document.getElementById('exportBtn'),
            refreshBtn: document.getElementById('refreshBtn'),
            globalSearchInput: document.getElementById('globalSearchInput'),
            applyFiltersBtn: document.getElementById('applyFiltersBtn'),
            clearFiltersBtn: document.getElementById('clearFiltersBtn'),
            fuzzyToggle: document.getElementById('fuzzyToggle'),
            columnFilters: document.getElementById('columnFilters'),
            editModeToggle: document.getElementById('editModeToggle'),
            editModeButtons: document.getElementById('editModeButtons'),
            saveEditBtn: document.getElementById('saveEditBtn'),
            cancelEditBtn: document.getElementById('cancelEditBtn'),
            deleteAllBtn: document.getElementById('deleteAllBtn'),
            tableContainer: document.getElementById('tableContainer'),
            emptyState: document.getElementById('emptyState'),
            tableWrapper: document.getElementById('tableWrapper'),
            tableTitle: document.getElementById('tableTitle'),
            searchInfo: document.getElementById('searchInfo'),
            searchResultsCount: document.getElementById('searchResultsCount'),
            datasetsSection: document.getElementById('datasetsSection'),
            datasetsList: document.getElementById('datasetsList'),
            statsSection: document.getElementById('statsSection'),
            totalRows: document.getElementById('totalRows'),
            totalColumns: document.getElementById('totalColumns'),
            totalDatasets: document.getElementById('totalDatasets'),
            filteredRows: document.getElementById('filteredRows'),
            alertContainer: document.getElementById('alertContainer'),
            prevPageBtn: document.getElementById('prevPageBtn'),
            nextPageBtn: document.getElementById('nextPageBtn'),
            pageInfo: document.getElementById('pageInfo'),
            pageSizeSelect: document.getElementById('pageSizeSelect'),
            paginationControls: document.getElementById('paginationControls'),
            rowCount: document.getElementById('rowCount'),
            searchFilterGroup: document.getElementById('searchFilterGroup'),
            searchFilterContent: document.getElementById('searchFilterContent'),
            searchFilterIcon: document.getElementById('searchFilterIcon'),
            datasetsContent: document.getElementById('datasetsContent'),
            datasetsChevronIcon: document.getElementById('datasetsChevronIcon')
        };
    },
    
    // Reset state
    reset() {
        this.combinedData = [];
        this.filteredData = [];
        this.displayedData = [];
        this.searchResults = [];
        this.editMode = false;
        this.editingRow = null;
        this.filters = {};
        this.columnFilters = {};
        this.currentPage = 1;
        this.fuzzySearch = true;
    },
    
    // Update filtered data
    updateFilteredData(data) {
        this.filteredData = data;
        this.updateDisplayedData();
    },
    
    // Update displayed data based on view mode
    updateDisplayedData() {
        if (this.viewMode === 'all') {
            this.displayedData = [...this.filteredData];
        } else {
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            this.displayedData = this.filteredData.slice(startIndex, endIndex);
        }
    },
    
    // Get all unique columns from data
    getUniqueColumns() {
        const columns = new Set();
        this.combinedData.forEach(row => {
            if (row) {
                Object.keys(row).forEach(col => {
                    if (!['_source', '_id'].includes(col)) columns.add(col);
                });
            }
        });
        return Array.from(columns);
    }
};