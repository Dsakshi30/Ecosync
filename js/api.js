// API Service Module
const API = {
    baseUrl: '',
    
    // Set API base URL
    setBaseUrl(url) {
        this.baseUrl = url;
        window.API_BASE_URL = url;
    },
    
    // Test server connection
    async testConnection() {
        const ports = [5000, 5001, 8080];
        
        for (const port of ports) {
            try {
                const testUrl = `http://localhost:${port}/api/health`;
                const response = await fetch(testUrl, {
                    method: 'GET',
                    mode: 'cors',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (response.ok) {
                    this.setBaseUrl(`http://localhost:${port}/api`);
                    return { success: true, port };
                }
            } catch (error) {
                console.log(`Port ${port} failed:`, error.message);
            }
        }
        
        return { success: false, error: 'Could not connect to server on any port' };
    },
    
    // Fetch datasets
    async fetchDatasets() {
        try {
            const response = await fetch(`${this.baseUrl}/datasets`);
            if (!response.ok) throw new Error(`Failed to fetch datasets: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching datasets:', error);
            throw error;
        }
    },
    
    // Fetch combined data
    async fetchCombinedData() {
        try {
            const response = await fetch(`${this.baseUrl}/combined`);
            
            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`Failed to fetch combined data: ${response.status}`);
            }
            
            const text = await response.text();
            return JSON.parse(text);
        } catch (error) {
            console.error('Error fetching combined data:', error);
            return [];
        }
    },
    
    // Upload file
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseUrl}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        return await response.json();
    },
    
    // Delete dataset
    async deleteDataset(datasetName) {
        const response = await fetch(`${this.baseUrl}/dataset/${encodeURIComponent(datasetName)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Delete failed');
        }
        
        return await response.json();
    },
    
    // Delete all datasets
    async deleteAllDatasets() {
        const response = await fetch(`${this.baseUrl}/datasets/delete-all`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Delete all failed');
        }
        
        return await response.json();
    },
    
    // Search data
    async searchData(searchTerm, fuzzy = true) {
        const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term: searchTerm, fuzzy })
        });
        
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    },
    
    // Save combined data
    async saveCombinedData(data) {
        const response = await fetch(`${this.baseUrl}/combined`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Save failed');
        return await response.json();
    },
    
    // Update row
    async updateRow(rowId, updates) {
        const response = await fetch(`${this.baseUrl}/update-row`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowId, updates })
        });
        
        if (!response.ok) throw new Error('Update failed');
        return await response.json();
    },
    
    // Delete row
    async deleteRow(rowId) {
        const response = await fetch(`${this.baseUrl}/delete-row`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowId })
        });
        
        if (!response.ok) throw new Error('Delete failed');
        return await response.json();
    }
};