# Part 4 - Scosha AI Shopping Assistant exhaustive

| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AI-0001 | Chrome | Open header AI | Storefront | AI button | Opens |  |
| AI-0002 | Chrome | Open floating | Storefront | Floating | Opens |  |
| AI-0003 | Chrome | Open /ai-scan CTA | Storefront | /ai-scan Open AI Assistant | Opens |  |
| AI-0004 | Chrome | Open mobile nav AI | Storefront | AI Scan | Opens |  |
| AI-0005 | Chrome | Open home banner | Storefront | AI size banner | Opens |  |
| AI-0006 | Chrome | Close | Storefront | X | Closes |  |
| AI-0007 | Chrome | Back | Storefront | Back | Prev |  |
| AI-0008 | Chrome | Route change closes | Storefront | Navigate | Closes |  |
| AI-0009 | Mode | Scan Face | AI home | Click Scan Face | Enters flow |  |
| AI-0010 | Mode | Scan Body | AI home | Click Scan Body | Enters flow |  |
| AI-0011 | Mode | Scan Furniture | AI home | Click Scan Furniture | Enters flow |  |
| AI-0012 | Mode | Smart Upload | AI home | Click Smart Upload | Enters flow |  |
| AI-0013 | Body area | Full body | Body capture | Select Full body | Selected |  |
| AI-0014 | Body area | Upper / arms | Body capture | Select Upper / arms | Selected |  |
| AI-0015 | Body area | Legs | Body capture | Select Legs | Selected |  |
| AI-0016 | Body area | Shoes | Body capture | Select Shoes | Selected |  |
| AI-0017 | Capture | Camera allow | Capture | Allow Capture | Photo |  |
| AI-0018 | Capture | Camera deny | Capture | Deny | Graceful error |  |
| AI-0019 | Capture | Upload JPG/PNG/WEBP | Capture | Upload | Advances |  |
| AI-0020 | Capture | Reject bad file | Capture | .txt / huge | Rejected |  |
| AI-0021 | Measurements | Gender Women | Measurements | Select Women | Selected |  |
| AI-0022 | Measurements | Gender Men | Measurements | Select Men | Selected |  |
| AI-0023 | Measurements | Unit cm  -  kg | Measurements | Select cm  -  kg | Units update |  |
| AI-0024 | Measurements | Unit in  -  lb | Measurements | Select in  -  lb | Units update |  |
| AI-0025 | Measurements | Fill Age | Measurements | Enter Age | Accepted |  |
| AI-0026 | Measurements | Validate Age | Required path | Clear; analyze | Validation or optional |  |
| AI-0027 | Measurements | Fill Height | Measurements | Enter Height | Accepted |  |
| AI-0028 | Measurements | Validate Height | Required path | Clear; analyze | Validation or optional |  |
| AI-0029 | Measurements | Fill Weight | Measurements | Enter Weight | Accepted |  |
| AI-0030 | Measurements | Validate Weight | Required path | Clear; analyze | Validation or optional |  |
| AI-0031 | Measurements | Fill Shoe size | Measurements | Enter Shoe size | Accepted |  |
| AI-0032 | Measurements | Validate Shoe size | Required path | Clear; analyze | Validation or optional |  |
| AI-0033 | Flow | Analyze face CTA | AI | Analyze my face | POST analyze |  |
| AI-0034 | Flow | Outfit matches CTA | AI | Find my outfit matches | POST analyze |  |
| AI-0035 | Flow | Clarify gender/mode | AI | Clarify options | Continues |  |
| AI-0036 | Flow | Retake / switch mode | AI | Suggestions | Works |  |
| AI-0037 | Flow | Results cards | AI | Success | Up to 5 recs |  |
| AI-0038 | Flow | Open product | AI | Click | PDP |  |
| AI-0039 | Flow | Size notes | AI | Inspect | Shown |  |
| AI-0040 | Flow | Add to bag from AI | AI | Add | Cart |  |
| AI-0041 | Flow | Try on | AI | Try on | POST try-on |  |
| AI-0042 | Flow | GET status | AI | Network | GET /ai-assistant/status |  |
| AI-0043 | Flow | Rate limit | AI | Rapid guest | Limited; no 500 |  |
| AI-0044 | Flow | API down | AI | Stop API | Error recoverable |  |
| AI-0045 | Flow | Gemini/Perfect Corp missing | AI | Keys off | Clear degradation |  |
| AI-0046 | E2E | face happy path | Sample photo | Complete face | Results or clear blocked |  |
| AI-0047 | E2E | face cancel | In face | Close | Clean reopen |  |
| AI-0048 | E2E | face mobile | 375px | Run face | Usable |  |
| AI-0049 | E2E | face slow network | Slow 3G | Run face | Loader then result/error; no hang |  |
| AI-0050 | E2E | face double analyze | Ready | Double-click analyze | One request or safe debounce |  |
| AI-0051 | E2E | body happy path | Sample photo | Complete body | Results or clear blocked |  |
| AI-0052 | E2E | body cancel | In body | Close | Clean reopen |  |
| AI-0053 | E2E | body mobile | 375px | Run body | Usable |  |
| AI-0054 | E2E | body slow network | Slow 3G | Run body | Loader then result/error; no hang |  |
| AI-0055 | E2E | body double analyze | Ready | Double-click analyze | One request or safe debounce |  |
| AI-0056 | E2E | furniture happy path | Sample photo | Complete furniture | Results or clear blocked |  |
| AI-0057 | E2E | furniture cancel | In furniture | Close | Clean reopen |  |
| AI-0058 | E2E | furniture mobile | 375px | Run furniture | Usable |  |
| AI-0059 | E2E | furniture slow network | Slow 3G | Run furniture | Loader then result/error; no hang |  |
| AI-0060 | E2E | furniture double analyze | Ready | Double-click analyze | One request or safe debounce |  |
| AI-0061 | E2E | auto happy path | Sample photo | Complete auto | Results or clear blocked |  |
| AI-0062 | E2E | auto cancel | In auto | Close | Clean reopen |  |
| AI-0063 | E2E | auto mobile | 375px | Run auto | Usable |  |
| AI-0064 | E2E | auto slow network | Slow 3G | Run auto | Loader then result/error; no hang |  |
| AI-0065 | E2E | auto double analyze | Ready | Double-click analyze | One request or safe debounce |  |
| AI-0066 | Edge | Skin analysis route | AI | If /api/ai-skin-analysis used | POST via UI path |  |
| AI-0067 | Edge | Furniture empty catalog | AI | No furniture match | Complete furniture |  |
| AI-0068 | Edge | Face no skincare stock | AI | Face mode | Complete face |  |
| AI-0069 | Edge | Privacy camera indicator | AI | Capture | Inspect |  |
| AI-0070 | Edge | Consent/copy | AI | AI home | Read copy |  |
