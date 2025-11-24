public with sharing class PdfTextExtractor {
    
    private static final String AZURE_ENDPOINT = 'https://YOUR_RESOURCE.cognitiveservices.azure.com/';
    private static final String AZURE_API_KEY = 'YOUR_API_KEY'; // 🔒 Store in Custom Metadata or Named Credential
    
    @Future(callout=true)
    public static void extractTextFromContentVersion(Id contentVersionId) {
        // 1. Get PDF as base64
        ContentVersion cv = [SELECT VersionData FROM ContentVersion WHERE Id = :contentVersionId LIMIT 1];
        String base64Pdf = EncodingUtil.base64Encode(cv.VersionData);
        
        // 2. Call Azure Layout API
        HttpRequest req = new HttpRequest();
        req.setEndpoint(AZURE_ENDPOINT + 'formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31');
        req.setMethod('POST');
        req.setHeader('Ocp-Apim-Subscription-Key', AZURE_API_KEY);
        req.setHeader('Content-Type', 'application/pdf');
        req.setBodyAsBlob(EncodingUtil.base64Decode(base64Pdf));
        req.setTimeout(120000); // 2 mins
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 202) {
            // Async job started — get result from operation-location header
            String operationLocation = res.getHeader('Operation-Location');
            // Poll until done (use Queueable or Platform Event for production)
            System.debug('Poll this URL: ' + operationLocation);
        } else {
            System.debug('Error: ' + res.getBody());
        }
    }
}