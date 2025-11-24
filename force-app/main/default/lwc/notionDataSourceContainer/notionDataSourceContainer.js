import { LightningElement, track } from 'lwc';

export default class NotionDataSourceContainer extends LightningElement {
    @track passedId;

    handleIdSelected(event) {
        const id = event.detail.selectedId;
        this.passedId = id ; 
        // console.log('handleDataSourceChange '+ this.passedId);
    }
}