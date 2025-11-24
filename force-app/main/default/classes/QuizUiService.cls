public with sharing class QuizUiService {
    public class QuizQuestion {
        @AuraEnabled public String id;
        @AuraEnabled public String prompt;
        @AuraEnabled public List<String> options;
        @AuraEnabled public Integer correctIndex; // omit in prod if not allowed on client
    }
    
    public class StartPayload { 
        @AuraEnabled public String sessionId; 
        @AuraEnabled public List<QuizQuestion> questions; 
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getCategories() {
        // TODO: replace with callout to middleware
        return new List<String>{'General', 'Salesforce', 'Apex', 'SOQL'};
    }

   @AuraEnabled(cacheable=false)
    public static StartPayload startQuiz(String category, Integer limitQuestions) {
        // TODO: replace with callout; mock data for now
        List<QuizQuestion> qs = new List<QuizQuestion>();
        
        // First question - now properly populated
        QuizQuestion qq = new QuizQuestion();
        qq.id = 'q1';
        qq.prompt = 'What is the default access modifier?';
        qq.options = new List<String>{'Public', 'Private', 'Protected', 'Global'};
        qq.correctIndex = 1;
        qs.add(qq);
        
        // Second question
        QuizQuestion qq2 = new QuizQuestion();
        qq2.id = 'q2';
        qq2.prompt = 'Which is async?';
        qq2.options = new List<String>{'DML','Apex Trigger','Queueable','Validation Rule'};
        qq2.correctIndex = 2;
        qs.add(qq2);

        StartPayload s = new StartPayload();
        s.sessionId = String.valueOf(Crypto.getRandomLong());
        
        // Handle null limitQuestions and ensure valid range
        if (limitQuestions == null || limitQuestions <= 0 || limitQuestions >= qs.size()) {
            s.questions = qs;
        } else {
            List<QuizQuestion> limited = new List<QuizQuestion>();
            for (Integer i = 0; i < limitQuestions && i < qs.size(); i++) {
                limited.add(qs[i]);
            }
            s.questions = limited;
        }
        
        return s;
    }

    public class SubmitResult { 
        @AuraEnabled public Integer correct; 
        @AuraEnabled public Integer total; 
        @AuraEnabled public Decimal score; 
    }

    @AuraEnabled(cacheable=false)
    public static SubmitResult submitAnswers(String sessionId, Map<String,Integer> answers) {
        // TODO: evaluate server-side or forward to middleware
        // Demo scoring assumes ids match mocks in startQuiz
        Integer correct = 0, total = answers.size();
        Map<String,Integer> key = new Map<String,Integer>{ 'q1'=>1, 'q2'=>2 };
        
        for (String qId : answers.keySet()) {
            if (key.containsKey(qId) && key.get(qId) == answers.get(qId)) {
                correct++;
            }
        }
        
        SubmitResult r = new SubmitResult();
        r.correct = correct; 
        r.total = total; 
        r.score = total == 0 ? 0 : (Decimal.valueOf(correct) / total) * 100;
        return r;
    }
}