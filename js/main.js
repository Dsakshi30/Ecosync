// Main Entry Point
const DataLoader = {
    // Test server connection
    async testServerConnection() {
        Utils.setLoading(true, 'Testing connection...');
        
        try {
            const result = await API.testConnection();
            
            if (result.success) {
                State.serverAvailable = true;
                State.elements.connectionStatus.className = 'connection-status status-connected';
                State.elements.connectionStatus.innerHTML = `
                    <span class="status-dot"></span>
                    <span>Connected to server (port ${result.port})</span>
                `;
                
                Utils.showAlert(`Connected to server on port ${result.port}`, 'success');
                
                // Load data immediately after connection
                setTimeout(() => this.loadInitialData(), 500);
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            State.serverAvailable = false;
            State.elements.connectionStatus.className = 'connection-status status-disconnected';
            State.elements.connectionStatus.innerHTML = `
                <span class="status-dot"></span>
                <span>Disconnected: ${error.message}</span>
            `;
            
            Utils.showAlert(`Server connection failed: ${error.message}`, 'error');
            UI.updateEmptyStateForDisconnection();
        } finally {
            Utils.setLoading(false);
        }
    },
    
    // Load initial data
    async loadInitialData() {
        if (!State.serverAvailable) {
            Utils.showAlert('Please connect to server first', 'warning');
            return;
        }
        
        Utils.setLoading(true, 'Loading data...');
        
        try {
            const [datasets, combinedData] = await Promise.all([
                API.fetchDatasets(),
                API.fetchCombinedData()
            ]);
            
            State.datasets = datasets;
            State.combinedData = combinedData;
            State.updateFilteredData([...combinedData]);
            
            UI.updateUI();
            Utils.showAlert(`Data loaded: ${combinedData.length} rows, ${datasets.length} datasets`, 'success');
            
        } catch (error) {
            console.error('Error in loadInitialData:', error);
            Utils.showAlert('Error loading data: ' + error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    },
    
    // Handle file upload
    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        Utils.setLoading(true, 'Uploading files...');
        let successCount = 0;
        
        for (const file of files) {
            try {
                const result = await API.uploadFile(file);
                successCount++;
                Utils.showAlert(`Uploaded: ${result.dataset_name} (${result.rows} rows)`, 'success');
            } catch (error) {
                Utils.showAlert(`Failed to upload ${file.name}: ${error.message}`, 'error');
            }
        }
        
        // Refresh data
        await this.loadInitialData();
        
        // Reset file input
        event.target.value = '';
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize state and UI
    State.init();
    UI.init();
    Visualizations.init();
    Events.init();
    
    // Try to auto-connect on load
    setTimeout(() => DataLoader.testServerConnection(), 1000);
});

// Make modules globally available
window.State = State;
window.UI = UI;
window.SearchFilter = SearchFilter;
window.EditMode = EditMode;
window.Table = Table;
window.DataLoader = DataLoader;
window.Utils = Utils;