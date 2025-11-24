import { LightningElement, api } from 'lwc';
export default class QuizTimer extends LightningElement {
  _seconds = 0; intervalId;
  @api set seconds(v){ this._seconds = Number(v)||0; this.resetInterval(); }
  get seconds(){ return this._seconds; }

  connectedCallback(){ this.resetInterval(); }
  disconnectedCallback(){ clearInterval(this.intervalId); }

  resetInterval(){
    clearInterval(this.intervalId);
    this.intervalId = setInterval(()=>{
      if (this.seconds<=0){ this.dispatchEvent(new CustomEvent('expired')); clearInterval(this.intervalId); return; }
      this._seconds -= 1;
      this.dispatchEvent(new CustomEvent('tick'));
    },1000);
  }

  get mm(){ return String(Math.floor(this.seconds/60)).padStart(2,'0'); }
  get ss(){ return String(this.seconds%60).padStart(2,'0'); }
}
