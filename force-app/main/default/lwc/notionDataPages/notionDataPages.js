import queryPages from '@salesforce/apex/NotionDataSourceService.queryPages';
import retrieveBlockChildren from '@salesforce/apex/NotionDataSourceService.retrieveBlockChildren';
import appendBlockChildren from '@salesforce/apex/NotionBlocksController.appendBlockChildren';
import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import deletePage from '@salesforce/apex/NotionDataSourceService.deletePage';
import LightningConfirm from 'lightning/confirm';

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
    @track newBlockType = 'paragraph';
    @track newBlockText = '';
    @track newBlockLink = '';
    @track appendLoading = false;
    @track searchTerm = '';
    @track sortBy = 'title_asc';
    refreshKey = 0;

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
            const result = await queryPages({ dataSourceId: id , refreshKey : this.refreshKey });
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

    get hasAnyPages() {
        return (this.pages && this.pages.length > 0) || false;
    }

    get totalCount() {
        return this.pages ? this.pages.length : 0;
    }

    get computedTitle() {
        if (this.loading) {
            return 'Related Notion Pages (Loading...)';
        }
        const total = this.totalCount;
        const filtered = this.filteredPages.length;
        if (this.searchTerm) {
            return total > 0
                ? `Related Notion Pages (${filtered} of ${total})`
                : 'Related Notion Pages';
        }
        return total > 0 ? `Related Notion Pages (${total})` : 'Related Notion Pages';
    }

    get blockTypeOptions() {
        return [
            { label: 'Paragraph', value: 'paragraph' },
            { label: 'Heading 1', value: 'heading_1' },
            { label: 'Heading 2', value: 'heading_2' },
            { label: 'Heading 3', value: 'heading_3' }
        ];
    }

    // Computed view model for nicer rendering
    get viewBlocks() {
        if (!this.blocks) return [];
        return this.blocks.map(b => {
            const map = this.describeBlockType(b.type);
            return {
                id: b.id,
                type: b.type,
                textContent: b.textContent,
                typeLabel: map.label,
                iconName: map.icon,
                textClass: map.textClass,
                wrapperClass: b.type === 'paragraph' ? 'slds-grow' : 'slds-grow slds-truncate',
                isParagraph: b.type === 'paragraph'
            };
        });
    }

    get sortOptions() {
        return [
            { label: 'Title A → Z', value: 'title_asc' },
            { label: 'Title Z → A', value: 'title_desc' }
        ];
    }

    get filteredPages() {
        const list = Array.isArray(this.pages) ? [...this.pages] : [];
        const q = (this.searchTerm || '').trim().toLowerCase();
        const filtered = q
            ? list.filter(p =>
                  (p.title || '').toLowerCase().includes(q) ||
                  (p.url || '').toLowerCase().includes(q)
              )
            : list;
        // sort
        const cmp = (a, b) => {
            const tA = (a.title || '').toLowerCase();
            const tB = (b.title || '').toLowerCase();
            if (tA < tB) return -1;
            if (tA > tB) return 1;
            return 0;
        };
        if (this.sortBy === 'title_desc') {
            return filtered.sort((a, b) => -cmp(a, b));
        }
        // default asc
        return filtered.sort(cmp);
    }

    get hasFilteredPages() {
        return this.filteredPages.length > 0;
    }

    describeBlockType(type) {
        switch (type) {
            case 'heading_1':
                return { label: 'Heading 1', icon: 'utility:headline', textClass: 'slds-text-heading_large' };
            case 'heading_2':
                return { label: 'Heading 2', icon: 'utility:headline', textClass: 'slds-text-heading_medium' };
            case 'heading_3':
                return { label: 'Heading 3', icon: 'utility:headline', textClass: 'slds-text-heading_small' };
            case 'quote':
                return { label: 'Quote', icon: 'utility:quote', textClass: 'slds-text-longform' };
            case 'bulleted_list_item':
                return { label: 'Bullet', icon: 'utility:choice', textClass: 'slds-text-body_regular' };
            case 'numbered_list_item':
                return { label: 'Numbered', icon: 'utility:number_input', textClass: 'slds-text-body_regular' };
            case 'to_do':
                return { label: 'To-do', icon: 'utility:check', textClass: 'slds-text-body_regular' };
            case 'paragraph':
            default:
                return { label: 'Paragraph', icon: 'utility:paragraph', textClass: 'slds-text-body_regular block-paragraph' };
        }
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

    async handleCopyId(event) {
        const id = event.currentTarget?.dataset?.id;
        if (!id) return;
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(id);
            } else {
                const ta = document.createElement('textarea');
                ta.value = id;
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
                    title: 'ID copied',
                    message: 'Notion page ID copied to clipboard.',
                    variant: 'success'
                })
            );
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Copy failed',
                    message: 'Could not copy the ID.',
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

    handleSearchChange(event) {
        this.searchTerm = event.detail.value;
    }

    handleSortChange(event) {
        this.sortBy = event.detail.value;
    }

    // Append form helpers
    get newBlockPlaceholder() {
        switch (this.newBlockType) {
            case 'heading_1':
                return 'Write a Heading 1...';
            case 'heading_2':
                return 'Write a Heading 2...';
            case 'heading_3':
                return 'Write a Heading 3...';
            default:
                return 'Write paragraph text...';
        }
    }

    get newBlockCharCount() {
        return (this.newBlockText || '').length;
    }

    get newBlockPreviewClass() {
        const map = this.describeBlockType(this.newBlockType || 'paragraph');
        return map.textClass;
    }

    get disableAppend() {
        const hasText = (this.newBlockText || '').trim().length > 0;
        return this.appendLoading || !hasText;
    }

    get appendButtonLabel() {
        return this.appendLoading ? 'Appending…' : 'Append Block';
    }

    get quickTypeVariantParagraph() {
        return this.newBlockType === 'paragraph' ? 'brand' : 'neutral';
    }
    get quickTypeVariantH1() {
        return this.newBlockType === 'heading_1' ? 'brand' : 'neutral';
    }
    get quickTypeVariantH2() {
        return this.newBlockType === 'heading_2' ? 'brand' : 'neutral';
    }
    get quickTypeVariantH3() {
        return this.newBlockType === 'heading_3' ? 'brand' : 'neutral';
    }

    handleTypeQuickSelect(event) {
        const t = event.currentTarget?.dataset?.type;
        if (t) {
            this.newBlockType = t;
        }
    }

    handleResetAppend() {
        this.newBlockText = '';
        this.newBlockLink = '';
        this.newBlockType = 'paragraph';
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
            const result = await retrieveBlockChildren({ pageId : pageId , refreshKey : this.refreshKey});
            this.blocks = result || [];
        } catch (e) {
            this.blocksError = e;
        } finally {
            this.blocksLoading = false;
        }
    }

    forceRefresh() {
        this.refreshKey = Date.now(); // or ++this.refreshKey;
    }

    handleRefreshBlocks() {
        if (this.selectedPage && this.selectedPage.id) {
            this.forceRefresh();
            this.loadBlocks(this.selectedPage.id , this.refreshKey);
        }
    }

    handleNewBlockTypeChange(event) {
        this.newBlockType = event.detail.value;
    }

    handleNewBlockTextChange(event) {
        this.newBlockText = event.detail.value;
    }

    handleNewBlockLinkChange(event) {
        this.newBlockLink = event.detail.value;
    }

    async handleAppendBlock() {
        if (!this.selectedPage) return;
        const content = (this.newBlockText || '').trim();
        if (!content) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Validation', message: 'Enter some content to append.', variant: 'warning' }));
            return;
        }
        const type = this.newBlockType || 'paragraph';

        const textObj = { type: 'text', text: { content } };
        const link = (this.newBlockLink || '').trim();
        if (link) {
            textObj.text.link = { url: link };
        }

        let block;
        if (type.startsWith('heading_')) {
            block = { object: 'block', type, [type]: { rich_text: [textObj] } };
        } else {
            // default paragraph
            block = { object: 'block', type: 'paragraph', paragraph: { rich_text: [textObj] } };
        }

        const body = JSON.stringify({ children: [block] });

        this.appendLoading = true;
        try {
            await appendBlockChildren({ blockId: this.selectedPage.id, childrenBodyJson: body });
            this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Block appended.', variant: 'success' }));
            // Reset inputs
            this.newBlockText = '';
            this.newBlockLink = '';
            // Reload blocks
            this.forceRefresh();
            await this.loadBlocks(this.selectedPage.id);
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Append failed', message: 'Could not append block.', variant: 'error' }));
        } finally {
            this.appendLoading = false;
        }
    }

    async handleDeletePage(event){
        const id = event.currentTarget?.dataset?.id;
        const result = await LightningConfirm.open({
            message: 'Are you completely sure to delete this page',
            variant: 'Confirm Delete',
            label: 'Confirm Delete',
            // setting theme would have no effect
        });
        if(result){
            this.loading = true;
            try{
                const isDeleted = await deletePage({pageId : id , refreshKey: this.refreshKey});
                if(isDeleted){
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Deleted',
                            message: 'The page has been deleted',
                            variant: 'success'
                        })
                    );
                    this.forceRefresh();
                    this.handleRefresh();
                }
            }catch(e){
                this.dispatchEvent(new ShowToastEvent({
                    title : 'Delete failed' , 
                    message : 'Could not delete page' , 
                    variant : 'error'
                }))
            }finally{
                this.loading = false;
            }
        }
    }
}
