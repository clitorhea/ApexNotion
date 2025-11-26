public with sharing class NotionBlock {
    @AuraEnabled public String id;
    @AuraEnabled public String type;
    @AuraEnabled public String textContent;
    @AuraEnabled public Boolean hasChildren;
    @AuraEnabled public String created_time;
    @AuraEnabled public String last_edited_time;
}