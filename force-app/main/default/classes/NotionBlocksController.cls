public with sharing class NotionBlocksController {

    private static final String NC = 'callout:Notion';
    private static String cachedAuthHeader;

    private static String getAuthHeader() {
        if (cachedAuthHeader != null) return cachedAuthHeader;
        Security_Token__mdt config = [SELECT API_Token__c FROM Security_Token__mdt WHERE DeveloperName = 'API_Token' LIMIT 1];
        String token = config != null ? String.valueOf(config.API_Token__c) : null;
        if (String.isBlank(token)) {
            throw new AuraHandledException('Notion API token is not configured');
        }
        if (!token.toLowerCase().startsWith('bearer ')) {
            token = 'Bearer ' + token;
        }
        cachedAuthHeader = token;
        return cachedAuthHeader;
    }

    @AuraEnabled
    public static void appendBlockChildren(String blockId, String childrenBodyJson) {
        if (String.isBlank(blockId)) {
            throw new AuraHandledException('Block id is required');
        }
        if (String.isBlank(childrenBodyJson)) {
            throw new AuraHandledException('Children payload is required');
        }

        NotionConfig.Cfg cfg = NotionConfig.get();

        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint(NC + '/v1/blocks/' + blockId + '/children');
        req.setMethod('PATCH');
        req.setTimeout(120000);
        req.setHeader('Notion-Version', cfg.apiVersion);
        req.setHeader('Authorization', getAuthHeader());
        req.setHeader('Content-Type', 'application/json');
        req.setBody(childrenBodyJson);

        try {
            HttpResponse res = http.send(req);
            if (res.getStatusCode() >= 300) {
                throw new AuraHandledException('Failed to append blocks');
            }
        } catch (Exception e) {
            throw new AuraHandledException('Failed to append blocks');
        }
    }
}

