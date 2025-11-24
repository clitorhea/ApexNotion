import { LightningElement, track } from 'lwc';
import initiateImport from '@salesforce/apex/ImportWizardController.initiateImport';
import getJobStatus from '@salesforce/apex/ImportWizardController.getJobStatus';
import getPreview from '@salesforce/apex/ImportWizardController.getPreview';
import saveQA from '@salesforce/apex/ImportWizardController.saveQA';

export default class ImportWizard extends LightningElement {
  // Upload state
  fileBlob;
  fileName;
  isUploading = false;

  // Job state
  hasUpload = false;
  jobId;
  jobStatus;
  jobMessage;
  jobError;
  pollHandle;
  isPolling = false;

  // Preview grid
  @track rows = [];
  draftValues = [];
  selectedRowIds = [];
  quizName = '';

  get isDisabled() {
        // Disable if isUploading is true OR fileBlob is truthy (exists)
        return this.isUploading || !!this.fileBlob;
  }
  get isButtonDisabled() {
        // Disable if no rows are selected
        return this.selectedRowIds.length === 0;
  }

  get isSaveDisabled(){
      return this.isPersisting || this.rows.length===0
  }
  get isComplete() { return this.jobStatus === 'Complete'; }
  get isError() { return this.jobStatus === 'Error'; }
  get statusClass() {
    if (this.isError) return 'slds-text-color_error';
    if (this.isComplete) return 'slds-text-color_success';
    return 'slds-text-color_default';
  }

  columns = [
    { label: 'Order', fieldName: 'order', type: 'number', editable: true, initialWidth: 90 },
    { label: 'Question', fieldName: 'question', type: 'text', editable: true, wrapText: true },
    { label: 'Answer', fieldName: 'answer', type: 'text', editable: true, wrapText: true }
  ];

  // Step 1: select + upload
  handleFileChange = (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      // very light guard
      // eslint-disable-next-line no-alert
      alert('Please choose a PDF file.');
      evt.target.value = null;
      return;
    }
    this.fileBlob = file;
    this.fileName = file.name;
  };

  handleUpload = async () => {
    if (!this.fileBlob) return;
    this.isUploading = true;
    try {
      const base64 = await this.readFileAsBase64(this.fileBlob);
      const result = await initiateImport({ fileName: this.fileName, base64Pdf: base64 });
      this.hasUpload = true;
      this.jobId = result.jobId;
      this.jobStatus = result.status;
      this.jobMessage = 'Processing started…';
      this.startPolling();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Upload failed: ' + (e?.body?.message || e.message));
    } finally {
      this.isUploading = false;
    }
  };

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File read error'));
      reader.onload = () => {
        const dataUrl = reader.result; // "data:application/pdf;base64,XXXX"
        const base64 = dataUrl.split('base64,')[1];
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  // Step 2: poll job
  startPolling() {
    if (this.pollHandle) window.clearInterval(this.pollHandle);
    this.isPolling = true;
    this.pollHandle = window.setInterval(async () => {
      try {
        const statusRes = await getJobStatus({ jobId: this.jobId });
        this.jobStatus = statusRes.status;
        this.jobMessage = statusRes.message;
        if (statusRes.status === 'Complete') {
          this.stopPolling();
          await this.fetchPreview();
        } else if (statusRes.status === 'Error') {
          this.stopPolling();
          this.jobError = statusRes.errorMessage || 'Unknown error';
        }
      } catch (e) {
        this.stopPolling();
        this.jobError = e?.body?.message || e.message;
        this.jobStatus = 'Error';
      }
    }, 2000);
  }
  stopPolling() {
    if (this.pollHandle) {
      window.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.isPolling = false;
  }

  async fetchPreview() {
    const res = await getPreview({ jobId: this.jobId });
    // Expected: [{order:1,question:'...',answer:'...'}, ...]
    // make sure each has an id for datatable
    this.rows = (res || []).map((r, idx) => ({
      id: r.id || String(idx + 1),
      order: r.order ?? idx + 1,
      question: r.question || '',
      answer: r.answer || ''
    }));
  }

  // Grid interactions
  handleSaveDraft(evt) {
    const updates = evt.detail.draftValues || [];
    this.rows = this.rows.map(r => {
      const patch = updates.find(u => u.id === r.id);
      return patch ? { ...r, ...patch } : r;
    });
    this.draftValues = [];
  }
  handleRowSelection(evt) {
    this.selectedRowIds = (evt.detail?.selectedRows || []).map(r => r.id);
  }
  handleAddRow = () => {
    const nextOrder = (this.rows[this.rows.length - 1]?.order || 0) + 1;
    const newId = crypto.randomUUID ? crypto.randomUUID() : 'row_' + Math.random().toString(36).slice(2);
    this.rows = [...this.rows, { id: newId, order: nextOrder, question: '', answer: '' }];
  };
  handleDeleteSelected = () => {
    if (!this.selectedRowIds.length) return;
    const setIds = new Set(this.selectedRowIds);
    this.rows = this.rows.filter(r => !setIds.has(r.id));
    this.selectedRowIds = [];
  };
  handleQuizNameChange(evt) {
    this.quizName = evt.target.value || '';
  }

  // Step 4: persist
  isPersisting = false;
  async handlePersist() {
    this.isPersisting = true;
    try {
      // Sort by order before saving
      const body = [...this.rows].sort((a, b) => (a.order || 0) - (b.order || 0));
      const result = await saveQA({
        jobId: this.jobId,
        quizName: this.quizName || null,
        rowsJson: JSON.stringify(body)
      });
      // eslint-disable-next-line no-alert
      alert(`Saved! Created ${result.questionsCreated} questions` + (result.quizId ? ` under Quiz ${result.quizName}` : ''));
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Save failed: ' + (e?.body?.message || e.message));
    } finally {
      this.isPersisting = false;
    }
  }
}
