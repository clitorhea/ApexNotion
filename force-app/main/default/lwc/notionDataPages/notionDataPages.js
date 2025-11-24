import queryPages from '@salesforce/apex/NotionDataSourceService.queryPages';
import retrieveBlockChildren from '@salesforce/apex/NotionDataSourceService.retrieveBlockChildren';
import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class NotionDataPages extends LightningElement {
    _recordId;
    @track pages = [];
    @track loading = false;
    @track error;
    @track showModal = false;
    @track selectedPage = null;
    @track blocks = [];
    @track blocksLoading = false;
    @track blocksError;

    @api
    get recordId() {
        return this._recordId;
    }

    set recordId(value) {
        // Only fetch if value changed
        if (this._recordId !== value) {
            this._recordId = value;
            if (value) {
                this.fetchNotionData(value);
            } else {
                this.pages = []; // Fixed variable name
            }
        }
    }

    async fetchNotionData(id) {
        this.loading = true; // Fixed: use 'loading' instead of 'isLoading'
        this.error = null;
        
        try {
            const result = await queryPages({ dataSourceId: id });
            this.pages = result;
        } catch (error) {
            this.error = error;
            this.pages = [];
            console.error('Error fetching Notion data', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to load Notion pages',
                    variant: 'error'
                })
            );
        } finally {
            this.loading = false; // Ensure loading stops in all cases
        }
    }

    get hasPages() {
        return this.pages && this.pages.length > 0;
    }

    get computedTitle() {
        if (this.loading) {
            return 'Related Notion Pages (Loading...)';
        }
        const count = this.pages ? this.pages.length : 0;
        return count > 0 ? `Related Notion Pages (${count})` : 'Related Notion Pages';
    }

    handleRefresh() {
        if (!this._recordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'No record',
                    message: 'No record context to refresh.',
                    variant: 'warning'
                })
            );
            return;
        }
        this.fetchNotionData(this._recordId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Refreshed',
                        message: 'Related Notion pages updated.',
                        variant: 'success'
                    })
                );
            })
            .catch(() => {
                // Error case is already handled in fetchNotionData
            });
    }

    handleOpen(event) {
        const url = event.currentTarget?.dataset?.url;
        if (url) {
            window.open(url, '_blank');
        }
    }

    async handleCopyLink(event) {
        const url = event.currentTarget?.dataset?.url;
        if (!url) return;
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Link copied',
                    message: 'Notion link copied to clipboard.',
                    variant: 'success'
                })
            );
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Copy failed',
                    message: 'Could not copy the link.',
                    variant: 'error'
                })
            );
        }
    }

    handlePageTitleClick(event) {
        const id = event.currentTarget?.dataset?.id;
        if (!id) return;
        const page = (this.pages || []).find(p => p.id === id);
        if (page) {
            this.selectedPage = page;
            this.showModal = true;
            this.loadBlocks(page.id);
        }
    }

    closeModal() {
        this.showModal = false;
        this.selectedPage = null;
    }

    openSelectedPage() {
        if (this.selectedPage && this.selectedPage.url) {
            window.open(this.selectedPage.url, '_blank');
        }
    }

    async loadBlocks(pageId) {
        this.blocksLoading = true;
        this.blocksError = null;
        this.blocks = [];
        try {
            const result = await retrieveBlockChildren({ pageId });
            this.blocks = result || [];
        } catch (e) {
            this.blocksError = e;
        } finally {
            this.blocksLoading = false;
        }
    }
}
