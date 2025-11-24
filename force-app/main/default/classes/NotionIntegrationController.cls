public with sharing class NotionIntegrationController {

    private static final String NAMED_CREDENTIAL = 'callout:Notion';
    // private static final String NOTION_VERSION = '2025-09-03';
    // private static final String dbid = '2a74c28eb0db8015a460e1dc2172dba8'; 
    
    /**
     * Wrapper class for Notion page creation response
     */
    public class NotionResponse {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public String pageId;
        @AuraEnabled public String pageUrl;
    }
    
    /**
     * Get list of databases accessible by the integration
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getDatabases() {
        Security_Token__mdt config = [
            SELECT API_Token__c 
            FROM Security_Token__mdt 
            WHERE DeveloperName = 'API_Token' 
            LIMIT 1
        ];

        // Use the token
        String token = config.API_Token__c;
        NotionConfig.Cfg cfg = NotionConfig.get();

        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint(NAMED_CREDENTIAL + '/v1/databases/'+ cfg.defaultDbId);
            req.setMethod('GET');
            req.setHeader('Authorization', token); 
            req.setHeader('Notion-Version', cfg.apiVersion);
            
            Map<String, String> info = new Map<String, String>();

            Http http = new Http();
            HttpResponse res = http.send(req);

            if (res.getStatusCode() == 200) {
                NotionDatabaseResponse result = (NotionDatabaseResponse) JSON.deserialize(res.getBody(), NotionDatabaseResponse.class);
                System.debug('List DataSource: '+result.data_sources); 
                for(NotionDatabaseResponse.DataSource ds : result.data_sources) {
                    info.put(ds.id, ds.name);
                }
                return info;

            } else {
                throw new AuraHandledException('Failed to fetch databases: ' + res.getBody());
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching databases: ' + e.getMessage());
        }
    }
    
    
    /**
     * Log Notion activity (optional - can be saved to custom object)
     */
    private static void logNotionActivity(String status, String databaseId, String title, String details) {
        System.debug('Notion Activity - Status: ' + status + 
                     ', Database: ' + databaseId + 
                     ', Title: ' + title + 
                     ', Details: ' + details);
        // Optionally save to a custom object for audit trail
    }
    
    /**
     * Test connection to Notion API
     */
    @AuraEnabled
    public static NotionResponse testConnection() {
        NotionResponse response = new NotionResponse();

        Security_Token__mdt config = [
            SELECT API_Token__c 
            FROM Security_Token__mdt 
            WHERE DeveloperName = 'API_Token' 
            LIMIT 1
        ];

        // Use the token
        String token = config.API_Token__c;

        NotionConfig.Cfg cfg = NotionConfig.get();
        
        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint(NAMED_CREDENTIAL + '/v1/users/me');
            req.setMethod('GET');
            req.setHeader('Notion-Version', cfg.apiVersion);
            req.setHeader('Authorization', token); 
            Http http = new Http();
            HttpResponse res = http.send(req);
            
            if (res.getStatusCode() == 200) {
                response.success = true;
                response.message = 'Connection successful!';
            } else {
                response.success = false;
                response.message = 'Connection failed: ' + res.getStatus();
            }
        } catch (Exception e) {
            response.success = false;
            response.message = 'Connection error: ' + e.getMessage();
        }
        
        return response;
    }

    @AuraEnabled
    public static String createPage(String title, String bodyContent) {
        try {

            NotionPageWrapper newPage = new NotionPageWrapper();            
            NotionConfig.Cfg cfg = NotionConfig.get(); 

            // 1. Parent
            newPage.parent = new NotionPageWrapper.Parent();
            newPage.parent.database_id = cfg.defaultDbId;

            // 2. Properties (Title)
            newPage.properties = new Map<String, NotionPageWrapper.Property>();
            NotionPageWrapper.Property titleProp = new NotionPageWrapper.Property();
            titleProp.title = new List<NotionPageWrapper.RichText>{ 
                new NotionPageWrapper.RichText(title) 
            };
            newPage.properties.put('Name', titleProp);

            // 3. Children (Content)
            newPage.children = new List<NotionPageWrapper.Block>();
            
            if (String.isNotBlank(bodyContent)) {
                NotionPageWrapper.Block pBlock = new NotionPageWrapper.Block('paragraph');
                pBlock.paragraph = new NotionPageWrapper.TextContent();
                pBlock.paragraph.rich_text = new List<NotionPageWrapper.RichText>{
                    new NotionPageWrapper.RichText(bodyContent)
                };
                newPage.children.add(pBlock);
            }

            // --- SERIALIZATION & FIX ---
            // Serialize to JSON, suppressing nulls to keep payload clean
            String jsonPayload = JSON.serialize(newPage, true);
            
            // Fix 1: Replace Apex-safe 'object_type' with API-required 'object'
            jsonPayload = jsonPayload.replace('"object_type":', '"object":');

            return sendRequest(jsonPayload);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    private static String sendRequest(String jsonBody) {
        NotionConfig.Cfg cfg = NotionConfig.get(); 
        Security_Token__mdt config = [
            SELECT API_Token__c 
            FROM Security_Token__mdt 
            WHERE DeveloperName = 'API_Token' 
            LIMIT 1
        ];

        // Use the token
        String token = config.API_Token__c;

        HttpRequest req = new HttpRequest();
        req.setEndpoint(NAMED_CREDENTIAL+'/v1/pages');
        req.setMethod('POST');
        req.setHeader('Authorization', token);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Notion-Version', cfg.apiVersion);
        req.setBody(jsonBody);

        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            throw new CalloutException(res.getBody());
        }
        return res.getBody();
    }

}