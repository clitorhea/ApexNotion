import { LightningElement, api } from 'lwc';
export default class QuizOption extends LightningElement {
  @api label; @api index; @api selectedIndex;
  get classes(){
    const base = 'slds-button slds-button_neutral slds-size_1-of-1';
    return this.index===this.selectedIndex ? `${base} selected` : base;
  }
  click(){ this.dispatchEvent(new CustomEvent('click')); }
}
