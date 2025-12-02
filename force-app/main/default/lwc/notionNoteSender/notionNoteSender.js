import createPage from '@salesforce/apex/NotionIntegrationController.createPage';
import getDatabases from '@salesforce/apex/NotionIntegrationController.getDatabases';
import testConnection from '@salesforce/apex/NotionIntegrationController.testConnection';
import { LightningElement, track } from 'lwc';

export default class NotionNoteSender extends LightningElement {
    @track databaseOptions = [];
    @track selectedId;
    @track noteTitle = '';
    @track noteContent = '';
    @track isLoading = false;
    @track connectionStatus = null;
    @track showSuccess = false;
    @track createdPageUrl = '';

    connectedCallback() {
        this.checkConnection();
        this.loadDatabases();
    }

    async checkConnection() {
        try {
            console.log("check connection... ");
            const result = await testConnection();
            this.connectionStatus = result.success ? 'connected' : 'disconnected';
            console.log("connection status: "+this.connectionStatus);
            if (!result.success) {
                this.showToast('Warning', result.message, 'warning');
            }
        } catch (error) {
            this.connectionStatus = 'disconnected';
            this.showToast('Connection Error', 'error');
        }
    }

    async loadDatabases() {
        try {
            const data = await getDatabases();
            this.databaseOptions = Object.keys(data).map(key => {
                return {
                    label: data[key], 
                    value : key
                }
            })
        } catch (error) {
            this.showToast('Error Loading Databases', 'error');
        }
    }

    handleSelectionChange(event) {
        this.selectedId = event.detail.value;
        this.dispatchEvent(new CustomEvent('idselected', {
                detail: { selectedId: this.selectedId },
                bubbles: true, // Bubbles up to the parent
                composed: true // Allows the event to cross shadow DOM boundary
        }));
        console.log('custome event dispatched'); 
    }

    handleTitleChange(event) {
        this.noteTitle = event.target.value;
        this.showSuccess = false;
    }

    handleContentChange(event) {
        this.noteContent = event.target.value;
        this.showSuccess = false;
    }

    async handleCreate() {
        this.isLoading = true;
        this.showSuccess = false;

        try {
            const result = await createPage({
                title: this.noteTitle, 
                bodyContent: this.noteContent,
            });
            
            if (result) {
                this.showSuccess = true;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Done',
                        variant: 'success'
                    })
                );
                this.resetForm();
            } 
        } catch (error) {
            this.showToast('Error Creating Note', 'error');
            console.log(error);
        } finally {
            this.isLoading = false;
        }
    }

    handleClear() {
        this.resetForm();
        this.showSuccess = false;
    }

    resetForm() {
        this.noteTitle = '';
        this.noteContent = '';
    }

    handleOpenNotion() {
        if (this.createdPageUrl) {
            window.open(this.createdPageUrl, '_blank');
        }
    }


    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: variant === 'error' ? 'sticky' : 'dismissable'
        });
        this.dispatchEvent(event);
    }

    get isFormValid() {
        return this.selectedDbId && this.noteTitle.trim();
    }

    get statusClass() {
        return this.connectionStatus === 'connected' 
            ? 'status-indicator connected' 
            : 'status-indicator disconnected';
    }

    get statusLabel() {
        return this.connectionStatus === 'connected' 
            ? 'Connected to Notion' 
            : 'Not Connected';
    }

    get characterCount() {
        return this.noteContent.length;
    }
}