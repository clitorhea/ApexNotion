import { LightningElement, api } from 'lwc';
export default class QuizProgress extends LightningElement {
  @api current = 1; @api total = 1;
  get widthStyle(){ return `width:${(this.current/Math.max(this.total,1))*100}%`; }
}
