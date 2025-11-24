public with sharing class NotionDataSourceService {

    private static final String NC = 'callout:Notion';
    private static String cachedAuthHeader;

    // Build and cache the Authorization header value
    private static String getAuthHeader() {
        if (cachedAuthHeader != null) return cachedAuthHeader;
        Security_Token__mdt config = [SELECT API_Token__c FROM Security_Token__mdt WHERE DeveloperName = 'API_Token' LIMIT 1];
        String token = config != null ? String.valueOf(config.API_Token__c) : null;
        if (String.isBlank(token)) {
            throw new AuraHandledException('Notion API token is not configured');
        }
        // Ensure Bearer prefix only once
        if (!token.toLowerCase().startsWith('bearer ')) {
            token = 'Bearer ' + token;
        }
        cachedAuthHeader = token;
        return cachedAuthHeader;
    }

    @AuraEnabled(cacheable=false)
    public static List<NotionPage> queryPages(String dataSourceId) {
        NotionConfig.Cfg cfg = NotionConfig.get();
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint(NC + '/v1/data_sources/' + dataSourceId + '/query');
        req.setMethod('POST');
        req.setTimeout(120000);
        req.setHeader('Notion-Version', cfg.apiVersion);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', getAuthHeader());
        // For now no filters/sorts
        req.setBody('{}');

        HttpResponse res = http.send(req);

        if (res.getStatusCode() >= 300) {
            throw new AuraHandledException('Failed to query pages');
        }

        Map<String,Object> parsed = (Map<String,Object>)JSON.deserializeUntyped(res.getBody());
        if (parsed == null) return new List<NotionPage>();
        List<Object> results = (List<Object>)parsed.get('results');
        if (results == null) return new List<NotionPage>();

        List<NotionPage> output = new List<NotionPage>();

        for (Object o : results) {
            Map<String,Object> result = (Map<String,Object>)o;
            if (result == null) continue;

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
        if (page == null) return '';
        Map<String,Object> props = (Map<String,Object>)page.get('properties');
        if (props == null || props.isEmpty()) return '';

        // Find the property whose type == 'title'
        for (String key : props.keySet()) {
            Map<String,Object> prop = (Map<String,Object>)props.get(key);
            if (prop == null) continue;
            String type = (String)prop.get('type');
            if ('title'.equals(type)) {
                List<Object> titleArr = (List<Object>)prop.get('title');
                return joinPlainText(titleArr);
            }
        }
        // Fallback to property named 'Name' if present
        Map<String,Object> nameField = (Map<String,Object>)props.get('Name');
        if (nameField != null) {
            List<Object> titleArr = (List<Object>)nameField.get('title');
            return joinPlainText(titleArr);
        }
        return '';
    }

    // Join plain_text from a Notion rich_text[] array
    private static String joinPlainText(List<Object> arr) {
        if (arr == null || arr.isEmpty()) return '';
        List<String> parts = new List<String>();
        for (Object o : arr) {
            Map<String,Object> item = (Map<String,Object>)o;
            if (item == null) continue;
            String pt = (String)item.get('plain_text');
            if (pt == null) {
                // Some payloads nest text under text.content
                Map<String,Object> text = (Map<String,Object>)item.get('text');
                if (text != null) pt = (String)text.get('content');
            }
            if (pt != null) parts.add(pt);
        }
        return String.join(parts, '');
    }

    public class NotionPage {
        @AuraEnabled public String id;
        @AuraEnabled public String title;
        @AuraEnabled public String url;
    }

    public class NotionBlock{
        @AuraEnabled public String id;
        @AuraEnabled public String type;
        @AuraEnabled public String textContent; 
        @AuraEnabled public Boolean hasChildren;
    }

    public static String extractTextContent(Map<String,Object> block , String type){
        if (block == null || String.isBlank(type)) return '';
        Map<String, Object> propType = (Map<String,Object>) block.get(type);
        if (propType == null) {
            // Special case: child_page has a 'title' field
            if ('child_page' == type) {
                String title = (String)block.get('title');
                if (title == null && block.containsKey('child_page')) {
                    Map<String,Object> cp = (Map<String,Object>)block.get('child_page');
                    if (cp != null) title = (String)cp.get('title');
                }
                return title == null ? '' : title;
            }
            return '';
        }
        List<Object> richText = (List<Object>) propType.get('rich_text');
        return joinPlainText(richText);
    }

    @AuraEnabled(cacheable=true)
    public static List<NotionBlock> retrieveBlockChildren(String pageId){
        if (String.isBlank(pageId)) return new List<NotionBlock>();
        NotionConfig.Cfg cfg = NotionConfig.get();

        Http http = new Http();
        List<NotionBlock> output = new List<NotionBlock>();
        String base = NC + '/v1/blocks/' + pageId + '/children';
        String cursor = null;
        Boolean hasMore = true;

        try {
            while (hasMore) {
                HttpRequest req = new HttpRequest();
                String endpoint = base + (cursor != null ? ('?start_cursor=' + EncodingUtil.urlEncode(cursor, 'UTF-8')) : '');
                req.setEndpoint(endpoint);
                req.setMethod('GET');
                req.setTimeout(120000);
                req.setHeader('Notion-Version', cfg.apiVersion);
                req.setHeader('Authorization', getAuthHeader());

                HttpResponse res = http.send(req);
                if (res.getStatusCode() >= 300) {
                    throw new AuraHandledException('Failed to fetch blocks');
                }

                Map<String,Object> parsed = (Map<String,Object>)JSON.deserializeUntyped(res.getBody());
                if (parsed == null) break;
                List<Object> results = (List<Object>)parsed.get('results');
                if (results != null) {
                    for (Object o : results) {
                        Map<String,Object> result = (Map<String,Object>)o;
                        if (result == null) continue;
                        String id = (String) result.get('id');
                        String type = (String) result.get('type');
                        String textContent = extractTextContent(result, type);
                        Boolean hasChildren = (Boolean)result.get('has_children');

                        NotionBlock nb = new NotionBlock();
                        nb.id = id;
                        nb.type = type;
                        nb.textContent = textContent;
                        nb.hasChildren = hasChildren;

                        output.add(nb);
                    }
                }

                hasMore = (Boolean)parsed.get('has_more');
                if (hasMore == null) hasMore = false;
                cursor = (String)parsed.get('next_cursor');
                if (hasMore && String.isBlank(cursor)) {
                    // Safety: break to avoid infinite loop
                    hasMore = false;
                }
            }

            return output;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to retrieve Notion blocks');
        }
    }
}
