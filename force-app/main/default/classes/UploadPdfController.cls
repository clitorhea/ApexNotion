public with sharing class UploadPdfController {
    @AuraEnabled
    public static Id createQuizSource() {
        Quiz_Source__c qs = new Quiz_Source__c(
            Name = 'Upload ' + Datetime.now().format('yyyy-MM-dd HH:mm')
        );
        insert qs;
        return qs.Id;
    }
}