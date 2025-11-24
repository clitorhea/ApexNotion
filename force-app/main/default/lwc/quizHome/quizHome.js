import { LightningElement, track } from 'lwc';
import getCategories from '@salesforce/apex/QuizUiService.getCategories';
import startQuiz from '@salesforce/apex/QuizUiService.startQuiz';

export default class QuizHome extends LightningElement {
  @track categoryOptions = [];
  category = 'General';
  limit = 5;
  loading = false;

  payload; // { sessionId, questions }
  result;  // { correct, total, score }

  connectedCallback() { this.loadCategories(); }

  async loadCategories() {
    this.loading = true;
    try {
      const cats = await getCategories();
      this.categoryOptions = cats.map(c => ({ label: c, value: c }));
      if (cats?.length) this.category = cats[0];
    } catch (e) { this.toast('Error loading categories', e.body?.message || e.message, 'error'); }
    finally { this.loading = false; }
  }

  handleCategoryChange(e) { this.category = e.detail.value; }
  handleLimitChange(e) { this.limit = parseInt(e.detail.value, 10); }

  async start() {
    this.loading = true; this.result = null; this.payload = null;
    try {
      this.payload = await startQuiz({ category: this.category, limitQuestions: this.limit });
    } catch (e) { this.toast('Start failed', e.body?.message || e.message, 'error'); }
    finally { this.loading = false; }
  }

  handleFinished(event) { this.result = event.detail; }
  reset() { this.payload = null; this.result = null; }

  toast(title, msg, variant='info') {
    // optional: wire ShowToastEvent; keeping lean for brevity
    console.warn(title, msg, variant);
  }
}
