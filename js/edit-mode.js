// Edit Mode Module
const EditMode = {
    // Toggle edit mode
    toggleEditMode() {
        State.editMode = State.elements.editModeToggle.checked;
        
        if (State.editMode) {
            State.elements.editModeButtons.style.display = 'flex';
            Utils.showAlert('Edit mode enabled. You can now edit individual cells.', 'info');
        } else {
            State.elements.editModeButtons.style.display = 'none';
            State.editingRow = null;
            Utils.showAlert('Edit mode disabled', 'info');
        }
        
        UI.renderTable();
    },
    
    // Enable row edit
    enableRowEdit(rowIndex) {
        State.editingRow = rowIndex;
        UI.renderTable();
    },
    
    // Save row edit
    async saveRowEdit(rowIndex) {
        const rowElement = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
        if (!rowElement) return;
        
        const inputs = rowElement.querySelectorAll('.edit-input');
        const rowId = State.filteredData[rowIndex]._id;
        const updatedRow = { ...State.filteredData[rowIndex] };
        const updates = {};
        
        inputs.forEach(input => {
            const column = input.dataset.column;
            const newValue = input.value || null;
            updatedRow[column] = newValue;
            updates[column] = newValue;
        });
        
        Utils.setLoading(true, 'Saving changes...');
        try {
            await API.updateRow(rowId, updates);
            
            // Update local state
            State.filteredData[rowIndex] = updatedRow;
            
            // Update in combined data
            const combinedIndex = State.combinedData.findIndex(row => row._id === rowId);
            if (combinedIndex !== -1) {
                State.combinedData[combinedIndex] = updatedRow;
            }
            
            State.editingRow = null;
            Utils.showAlert('Row updated successfully', 'success');
        } catch (error) {
            Utils.showAlert('Error saving row: ' + error.message, 'error');
        } finally {
            Utils.setLoading(false);
            UI.renderTable();
        }
    },
    
    // Cancel row edit
    cancelRowEdit() {
        State.editingRow = null;
        UI.renderTable();
    },
    
    // Save all edits
    async saveAllEdits() {
        Utils.setLoading(true, 'Saving all changes...');
        try {
            await API.saveCombinedData(State.combinedData);
            Utils.showAlert('All changes saved successfully', 'success');
            this.toggleEditMode();
        } catch (error) {
            Utils.showAlert('Error saving changes: ' + error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    },
    
    // Cancel edit mode
    cancelEditMode() {
        DataLoader.loadInitialData();
        State.elements.editModeToggle.checked = false;
        this.toggleEditMode();
    },
    
    // Delete row
    async deleteRow(rowIndex) {
        if (!confirm('Are you sure you want to delete this row?')) return;
        
        const rowToDelete = State.filteredData[rowIndex];
        const rowId = rowToDelete._id;
        
        Utils.setLoading(true, 'Deleting row...');
        try {
            await API.deleteRow(rowId);
            
            // Update local state
            State.filteredData.splice(rowIndex, 1);
            
            const combinedIndex = State.combinedData.findIndex(row => row._id === rowId);
            if (combinedIndex !== -1) {
                State.combinedData.splice(combinedIndex, 1);
            }
            
            Utils.showAlert('Row deleted successfully', 'success');
            UI.updateViewMode();
            UI.renderTable();
            UI.updateStats();
        } catch (error) {
            Utils.showAlert('Error deleting row: ' + error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    }
};