public with sharing class ImportWizardController {
    public class InitResult {
        @AuraEnabled public String jobId;
        @AuraEnabled public String status;
    }
    public class StatusResult {
        @AuraEnabled public String status;
        @AuraEnabled public String message;
        @AuraEnabled public String errorMessage;
    }
    public class SaveResult {
        @AuraEnabled public Integer questionsCreated;
        @AuraEnabled public Id quizId;
        @AuraEnabled public String quizName;
    }

    @AuraEnabled
    public static InitResult initiateImport(String fileName, String base64Pdf) {
        if (String.isBlank(fileName) || String.isBlank(base64Pdf)) {
            throw new AuraHandledException('Missing file input.');
        }
        // Create ContentVersion
        ContentVersion cv = new ContentVersion();
        cv.VersionData = EncodingUtil.base64Decode(base64Pdf);
        cv.Title = fileName.substring(0, Math.min(fileName.length(), 255)).replace('.pdf','');
        cv.PathOnClient = fileName;
        cv.Origin = 'H';
        insert cv;

        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];

        // Create Import_Job__c
        Import_Job__c job = new Import_Job__c(
            Name = 'PDF Import - ' + cv.Id,
            Status__c = 'Processing',
            ContentVersionId__c = cv.Id
        );
        insert job;

        // Enqueue worker
        System.enqueueJob(new ImportJobWorker(job.Id));

        InitResult res = new InitResult();
        res.jobId = job.Id;
        res.status = 'Processing';
        return res;
    }

    @AuraEnabled(cacheable=true)
    public static StatusResult getJobStatus(Id jobId) {
        Import_Job__c job = [
            SELECT Id, Status__c, Message__c, Error__c
            FROM Import_Job__c WHERE Id = :jobId LIMIT 1
        ];
        StatusResult res = new StatusResult();
        res.status = String.valueOf(job.Status__c);
        res.message = job.Message__c;
        res.errorMessage = job.Error__c;
        return res;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getPreview(Id jobId) {
        Import_Job__c job = [
            SELECT Id, PreviewJSON__c FROM Import_Job__c WHERE Id = :jobId LIMIT 1
        ];
        if (String.isBlank(job.PreviewJSON__c)) return new List<Map<String,Object>>();
        return (List<Map<String, Object>>) JSON.deserializeUntyped(job.PreviewJSON__c);
    }

    @AuraEnabled
    public static SaveResult saveQA(Id jobId, String quizName, String rowsJson) {
        if (String.isBlank(rowsJson)) {
            throw new AuraHandledException('Nothing to save.');
        }
        List<Object> raw = (List<Object>) JSON.deserializeUntyped(rowsJson);
        List<Map<String,Object>> rows = new List<Map<String,Object>>();
        for (Object o : raw) rows.add((Map<String,Object>) o);

        Import_Job__c job = [
            SELECT Id, ContentVersionId__c FROM Import_Job__c WHERE Id = :jobId LIMIT 1
        ];

        Id quizId;
        if (!String.isBlank(quizName)) {
            Quiz__c q = new Quiz__c(Name = quizName);
            insert q;
            quizId = q.Id;
        }

        List<QuizQuestion__c> toInsert = new List<QuizQuestion__c>();
        Integer orderIdx = 1;
        for (Map<String,Object> r : rows) {
            String q = (String) r.get('question');
            String a = (String) r.get('answer');
            if (String.isBlank(q) && String.isBlank(a)) continue;

            QuizQuestion__c qq = new QuizQuestion__c();
            qq.Question__c = q;
            qq.Answer__c = a;
            qq.Order__c = (Integer)(r.get('order') == null ? orderIdx : r.get('order'));
            qq.SourceContentVersionId__c = job.ContentVersionId__c;
            if (quizId != null) qq.Quiz__c = quizId;
            toInsert.add(qq);
            orderIdx++;
        }
        if (!toInsert.isEmpty()) {
            insert toInsert;
        }

        SaveResult sr = new SaveResult();
        sr.questionsCreated = toInsert.size();
        sr.quizId = quizId;
        sr.quizName = quizName;
        return sr;
    }
}
