import { LightningElement, api, track } from 'lwc';
import submitAnswers from '@salesforce/apex/QuizUiService.submitAnswers';

export default class QuizPlayer extends LightningElement {
  @api sessionId;
  @api questions = []; // [{id,prompt,options}]
  @track answers = new Map(); // qId -> selectedIndex
  index = 0;
  timeLeft = 60 * 3; // 3 minutes total for demo

  get total(){ return this.questions?.length || 0; }
  get current(){ return this.questions[this.index]; }
  get isFirst(){ return this.index===0; }
  get isLast(){ return this.index===this.total-1; }
  get indexPlusOne(){ return this.index+1; }
  get selectedIndex(){ return this.answers.get(this.current?.id); }
  get submitLabel(){ return this.isLast ? 'Submit' : 'Save & Next'; }

  get currentOptions() {
    if (!this.current) return [];
    // stable per question: <questionId>-<optionIndex>
    return this.current.options.map((label, idx) => ({
        label,
        idx,
        key: `${this.current.id}-${idx}`
    }));
  }


  select = (evt) => {
    const idx = evt.target.index;
    if (!this.current) return;
    this.answers.set(this.current.id, idx);
    this.answers = new Map(this.answers); // force reactivity
  };

  next = () => { if (!this.isLast) this.index++; };
  prev = () => { if (!this.isFirst) this.index--; };

  handleTick = () => { if (this.timeLeft>0) this.timeLeft--; };

  async submit() {
    // auto-fill unanswered as -1 (or send none)
    const payload = {};
    this.questions.forEach(q => payload[q.id] = this.answers.has(q.id) ? this.answers.get(q.id) : -1);
    try {
      const result = await submitAnswers({ sessionId: this.sessionId, answers: payload });
      this.dispatchEvent(new CustomEvent('finished', { detail: result }));
    } catch (e) {
      // minimal error handling
      // eslint-disable-next-line no-console
      console.error('Submit failed', e);
    }
  }
}
