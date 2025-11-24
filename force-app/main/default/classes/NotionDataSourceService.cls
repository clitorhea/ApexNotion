public with sharing class NotionDataSourceService {

    private static final String NC = 'callout:Notion';

    @AuraEnabled(cacheable=false)
    public static List<NotionPage> queryPages(String dataSourceId) {
        NotionConfig.Cfg cfg = NotionConfig.get();
        Security_Token__mdt config = [Select API_Token__c from Security_Token__mdt where DeveloperName = 'API_Token' limit 1] ; 
        String token = config.API_Token__c;

        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint(NC + '/v1/data_sources/' + dataSourceId + '/query');
        req.setMethod('POST');
        req.setHeader('Notion-Version', cfg.apiVersion);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', token); 
        // For now no filters/sorts
        req.setBody('{}');
        
        HttpResponse res = http.send(req);
        System.debug('Notion response: ' + res.getBody());

        if (res.getStatusCode() >= 300) {
            throw new AuraHandledException('Notion error: ' + res.getBody());
        }

        Map<String,Object> parsed = (Map<String,Object>)JSON.deserializeUntyped(res.getBody());
        List<Object> results = (List<Object>)parsed.get('results');

        List<NotionPage> output = new List<NotionPage>();

        for (Object o : results) {
            Map<String,Object> result = (Map<String,Object>)o;

            String id = (String)result.get('id');
            String url = (String)result.get('url');

            String title = extractTitle(result);

            NotionPage p = new NotionPage();
            p.id = id;
            p.title = title;
            p.url = url;

            output.add(p);
        }

        return output;
    }

    private static String extractTitle(Map<String,Object> page) {
        Map<String,Object> props = (Map<String,Object>)page.get('properties');
        if (props == null) return '';

        Map<String,Object> nameField = (Map<String,Object>)props.get('Name');
        if (nameField == null) return '';

        List<Object> titleArr = (List<Object>)nameField.get('title');
        if (titleArr.isEmpty()) return '';

        Map<String,Object> text = (Map<String,Object>)titleArr[0];
        return (String)text.get('plain_text');
    }

    public class NotionPage {
        @AuraEnabled public String id;
        @AuraEnabled public String title;
        @AuraEnabled public String url;
    }
}
