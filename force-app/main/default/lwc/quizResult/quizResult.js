import { LightningElement, api } from 'lwc';
export default class QuizResult extends LightningElement {
  @api result;
  restart(){ this.dispatchEvent(new CustomEvent('restart')); }
}
