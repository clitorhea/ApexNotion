import createQuizSource from '@salesforce/apex/UploadPdfController.createQuizSource';
import { api, LightningElement, track } from 'lwc';

export default class UploadPdfQuiz extends LightningElement {
    @api recordId; 
    @track hasUploaded = false;
    @track error = false;
    @track errorMessage = '';
    @track newRecordId;

    // If no recordId is passed (e.g., on Home tab), create a Quiz_Source__c record first
    connectedCallback() {
        if (!this.recordId) {
            this.createPlaceholderRecord();
        } else {
            // Optional: validate that recordId is for Quiz_Source__c (skip for MVP)
            this.newRecordId = this.recordId;
        }
    }

    createPlaceholderRecord() {
        createQuizSource()
            .then(result => {
                this.newRecordId = result;
            })
            .catch(error => {
                this.handleError('Failed to prepare upload container.');
                console.error('Error creating Quiz_Source__c:', error);
            });
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        if (uploadedFiles && uploadedFiles.length > 0) {
            this.hasUploaded = true;
            this.error = false;
            // Optional: fire event to notify parent component
            this.dispatchEvent(new CustomEvent('pdfuploaded', {
                detail: { contentDocumentId: uploadedFiles[0].documentId }
            }));
        }
    }

    handleViewFile() {
        // Navigate to the file preview (Salesforce standard)
        this.dispatchEvent(
            new CustomEvent('openrecord', {
                detail: { recordId: this.newRecordId }
            })
        );
    }

    handleError(msg) {
        this.error = true;
        this.errorMessage = msg;
        this.hasUploaded = false;
    }
}