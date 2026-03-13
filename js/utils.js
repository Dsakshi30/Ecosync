// Utility Functions
const Utils = {
    // Set loading state
    setLoading(isLoading, message = '') {
        State.isLoading = isLoading;
        
        if (isLoading) {
            State.elements.refreshBtn.innerHTML = message ? 
                `<span class="loading"></span> ${message}` : 
                '<span class="loading"></span> Loading...';
            State.elements.refreshBtn.disabled = true;
        } else {
            State.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            State.elements.refreshBtn.disabled = false;
        }
    },
    
    // Show alert
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;
        
        State.elements.alertContainer.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.opacity = '0';
                alert.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 300);
            }
        }, 5000);
    },
    
    // Export combined data
    async exportCombinedData() {
        if (!State.serverAvailable) {
            this.showAlert('Please connect to server first', 'warning');
            return;
        }
        
        if (State.combinedData.length === 0) {
            this.showAlert('No data to export', 'warning');
            return;
        }
        
        try {
            window.open(`${API.baseUrl}/export/combined`, '_blank');
            this.showAlert('Export started', 'info');
        } catch (error) {
            this.showAlert('Error exporting data: ' + error.message, 'error');
        }
    },
    
    // Confirm delete all datasets
    async confirmDeleteAllDatasets() {
        const datasetCount = State.datasets.length;
        if (datasetCount === 0) {
            this.showAlert('No datasets to delete', 'warning');
            return;
        }

        const message = `Are you sure you want to delete ALL ${datasetCount} datasets? This action cannot be undone.`;
        if (!confirm(message)) return;

        console.log(`Starting deletion of ${datasetCount} datasets`);
        this.setLoading(true, 'Deleting all datasets...');

        try {
            const response = await API.deleteAllDatasets();
            console.log('Delete all datasets response:', response);

            this.showAlert(`Successfully deleted ${datasetCount} datasets`, 'success');
            await DataLoader.loadInitialData();
        } catch (error) {
            console.error('Error deleting all datasets:', error);
            this.showAlert('Error deleting datasets: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            // Ensure loading state is always reset
            this.setLoading(false);
        }
    }
};