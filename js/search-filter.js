const SearchFilter = {
    clearAllFilters() {
        State.filters = {};
        State.columnFilters = {};
        State.searchResults = [];
        State.updateFilteredData([...State.combinedData]);

        
        State.elements.globalSearchInput.value = '';
        State.elements.clearFiltersBtn.style.display = 'none';

        document.querySelectorAll('.filter-input')
            .forEach(input => input.value = '');

        this.applyFilters();
        Utils.showAlert('All filters cleared', 'success');
    },

    applyAllFilters() {
        const filterInputs = document.querySelectorAll('.filter-input[data-column]');
        State.columnFilters = {};

        filterInputs.forEach(input => {
            const column = input.dataset.column;
            const value = input.value.trim();
            if (value) {
                State.columnFilters[column] = value;
            }
        });

        const globalSearchTerm = State.elements.globalSearchInput.value.trim();
        if (globalSearchTerm) {
            State.filters.globalSearch = globalSearchTerm;
            this.handleGlobalSearch();
        } else {
            this.applyFilters();
        }

        State.elements.clearFiltersBtn.style.display = 'inline-flex';
    },

    async handleGlobalSearch() {
        const searchTerm = State.elements.globalSearchInput.value.trim();
        if (!searchTerm) return;

        Utils.setLoading(true, 'Searching...');
        try {
            const results = await API.searchData(searchTerm, State.fuzzySearch);
            State.searchResults = results;
            State.filters.globalSearch = searchTerm;
            this.applyFilters();
            Utils.showAlert(`Found ${results.length} results for "${searchTerm}"`, 'info');
        } catch (error) {
            Utils.showAlert('Search error: ' + error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    },

    applyFilters() {
        let data = State.searchResults.length
            ? State.searchResults
            : State.combinedData;

        Object.entries(State.columnFilters).forEach(([column, filterValue]) => {
            const regex = new RegExp(`\\b${filterValue}`, 'i');

            data = data.filter(row => {
                const cellValue = String(row[column] || '');
                return regex.test(cellValue);
            });
        });

        State.updateFilteredData(data);
        State.currentPage = 1;

        UI.updateViewMode();
        UI.renderTable();
        UI.updateStats();
        UI.updateVisualizations();
    }
};
