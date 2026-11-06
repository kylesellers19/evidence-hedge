// ─────────────────────────────────────────────────────────────────────────────
// Claim-function cues: what a sentence DOES in the document. Checked in order
// method → recommendation → own-result → interpretation → background; the
// first that matches wins, else `other`. PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

const PROC = 'recruited|enrolled|randomi[sz]ed|assigned|measured|collected|conducted|surveyed|interviewed|administered|analy[sz]ed|used|employed|performed|calculated|computed|estimated|modell?ed|tested|examined|assessed|evaluated|designed|developed|obtained|selected|excluded|included|coded|recorded|monitored|adjusted|fielded|weighted|asked|exposed|simulated|applied|sampled|blinded|controlled|compared|followed|identified|categori[sz]ed|classified|transcribed|piloted|distributed|scored|standardi[sz]ed|quantified|captured|logged|defined|operationali[sz]ed|derived|stratified|matched|reviewed|searched|screened|extracted'

const SETUP = 'given|installed|placed|initiated|built|instructed|allowed|permitted|added|injected|introduced|presented|repeated|programmed|scheduled|calibrated|corrected|blank-corrected|normali[sz]ed|labell?ed|located|positioned|mounted|sealed|set\\s+(?:up|to|at)|carried\\s+out|conducted|run|held|kept|seated|housed|blinded|counterbalanced|randomi[sz]ed|approved|reviewed|ceded|exempted|consented|debriefed|trained|tested'

// What the study did — never flagged.
export const METHOD = [
  '^(?:Methods?|Design|Setting|Participants|Materials\\s+and\\s+methods|Study\\s+design|Approach)\\s*:',
  `\\b(?:was|were)\\s+(?:\\w+ly\\s+)?(?:not\\s+)?(?:${SETUP})\\b`,
  '\\b(?:participants|subjects|respondents|volunteers|workers|occupants)\\s+(?:\\w+\\s+){0,2}(?:spent|received|completed|underwent|took|arrived|left|wore|sat|answered|filled|signed|provided|gave|were\\s+asked)\\b',
  '\\b(?:the|each|both)\\s+(?:rooms?|chambers?|offices?|lab|laboratory|software|test|tool|instrument|sensors?|monitors?|stations?|diffusers?|platform|questionnaire|survey|scale)\\s+(?:\\w+\\s+){0,2}(?:are|were|is|was|allows?|allowed|measures?|measured|consists?|consisted|contains?|has|have|had)\\b(?![^.]*\\b(?:higher|lower|better|worse|significant))',
  '\\b(?:no\\s+deviations?\\s+from\\s+(?:the\\s+)?protocol|the\\s+protocol\\s+was|IRB|institutional\\s+review\\s+board|informed\\s+consent)\\b',
  `\\b(?:we|I)\\s+(?:\\w+ly\\s+)?(?:${PROC})\\b`,
  `\\b(?:participants|subjects|respondents|workers|occupants|patients|employees|volunteers|students|samples?|buildings|offices|data|surveys?|questionnaires?|interviews?|measurements?|scores?|responses?|analyses|models?|sessions?|tests?)\\s+(?:\\w+\\s+){0,4}(?:was|were)\\s+(?:\\w+ly\\s+)?(?:${PROC}|given|paid|compensated|instructed|required|informed|provided|told|housed|placed|seated|kept|held|run|carried\\s+out)\\b`,
  `\\b(?:was|were)\\s+(?:\\w+ly\\s+)?(?:${PROC})\\s+(?:using|with|by|via|through|from|at|in|for|on|according|as|every|each|before|after|over|during|to|between|across|among)\\b`,
  '\\b(?:the|this|our)\\s+(?:survey|study|experiment|analysis|sample|questionnaire|interviews?|protocol|design|methodology|data\\s*set|panel|fieldwork)\\s+(?:was|were|consisted|comprised|included|involved|used|uses|is\\s+based|was\\s+based|draws|drew|covered|covers|ran|took\\s+place)\\b',
  '^(?:This|The\\s+present|The\\s+current|Our|In\\s+this)\\s+(?:study|paper|report|analysis|survey|research|article|review|pilot)\\s+(?:aims?|aimed|seeks?|sought|examines?|examined|investigates?|investigated|explores?|explored|describes?|presents?|uses?|draws?|assesses|assessed|evaluates?|evaluated|tests?|tested|reviews?|reviewed|synthesi[sz]es?)\\b',
  '\\b(?:margin\\s+of\\s+(?:sampling\\s+)?error|weighted\\s+to\\s+be\\s+representative|was\\s+fielded|were\\s+fielded|response\\s+rate\\s+(?:was|of))\\b',
  '\\b(?:double-blind(?:ed)?|single-blind(?:ed)?|randomi[sz]ed|crossover|within-subjects?|between-subjects?|counterbalanced)\\b(?:\\s+\\w+){0,4}\\s+(?:design|study|trial|experiment|order)\\b',
  '\\b(?:statistical\\s+analys[ie]s|mixed[- ]effects?\\s+models?|regression\\s+models?|generali[sz]ed\\s+estimating)\\b',
  '\\b(?:the|a|an|each)\\s+(?:\\w+\\s+){0,3}(?:survey|questionnaire|scale|instrument|test|battery)\\s+(?:consists?|consisted|contains?|contained|measures?|measured|assesses|assessed)\\b',
]

// The document's own empirical result (or the result it reports): quantified
// outcomes, "we found", "the study found", survey shares.
export const OWN_RESULT = [
  '^(?:Results?|Findings?|Key\\s+findings?)\\s*:',
  '\\b(?:statistically\\s+)?significant(?:ly)?\\s+(?:\\w+\\s+)?(?:higher|lower|greater|better|worse|more|less|increases?|decreases?|improvements?|decrements?|differences?|associations?|predictors?|reductions?|effects?)\\b',
  '\\b(?:participants|respondents|workers|employees|occupants|subjects|people|adults|students)\\s+(?:\\w+\\s+){0,3}(?:scored|performed|reported|rated|showed|had|experienced|felt|were)\\s+(?:\\w+ly\\s+)?(?:higher|lower|better|worse|more|less|\\d)',
  '\\b(?:concentrations?|levels?|scores?|rates?)\\s+(?:\\w+\\s+){0,2}(?:were|was|remained|stayed)\\s+(?:\\w+ly\\s+)?(?:constant|stable|unchanged|similar|consistent|below|above|within|at\\s+[<>≤≥]?\\s?\\d)',
  '\\b(?:we|I)\\s+(?:also\\s+)?(?:found|find|observed|observe|identified|detected|saw|discovered|showed|show|demonstrated|demonstrate|report|reported|noted)\\b',
  '\\b(?:our|the|this|these|study|survey|report)\\s*(?:\'s)?\\s+(?:results?|findings?|data|analys[ie]s|survey|study|research|experiment|trial)\\s+(?:also\\s+)?(?:show|showed|shows|shown|reveal|revealed|reveals|found|finds|demonstrate|demonstrated|demonstrates|confirm|confirmed|confirms|identified|documented|uncovered)\\b',
  '\\b(?:researchers|investigators|the\\s+authors|scientists|the\\s+team|the\\s+study\\s+authors)\\s+(?:also\\s+)?(?:found|observed|discovered|reported|showed|demonstrated|measured|recorded|documented)\\b',
  '\\b(?:the\\s+(?:study|survey|report|research|analysis|experiment|data))\\s+(?:found|finds|shows|showed|revealed|reveals|demonstrates|demonstrated|confirms|indicates|indicated)\\b',
  '\\b\\d+(?:\\.\\d+)?\\s?%\\s+(?:of\\s+)?(?:[\\w-]+\\s+){0,4}(?:workers|respondents|participants|employees|adults|people|americans|students|occupants|patients|users|those|them|us|staff|members|leaders|organizations|companies|firms|offices|buildings)\\b',
  '\\b(?:respondents|participants|workers|employees|occupants|patients|subjects)\\b(?:\\s+[\\w-]+){0,8}\\s+(?:were|are|was)\\s+(?:\\w+ly\\s+)?(?:more|less|\\d|twice|half)',
  '\\bp\\s*[<=>≤]\\s*0?\\.\\d|\\b(?:odds\\s+ratio|hazard\\s+ratio|confidence\\s+interval|95%\\s*CI|r\\s*=\\s*-?0?\\.\\d|β\\s*=)',
  '\\b(?:scores?|performance|rates?|levels?|outcomes?|productivity|concentrations?|ratings?|function(?:ing)?|satisfaction|wellbeing|well-being)\\s+(?:\\w+\\s+){0,3}(?:were|was|are|is|rose|fell|increased|decreased|improved|declined|dropped|doubled)\\s+(?:\\w+\\s+){0,2}(?:\\d+(?:\\.\\d+)?\\s?%|higher|lower|greater|better|worse|significantly|on\\s+average|by\\s+\\d)',
  '\\b(?:say|says|said|report|reports|reported|agree|agreed|believe|feel|felt|prefer|preferred|rate|rated)\\b[^.]{0,80}\\b\\d+(?:\\.\\d+)?\\s?%|\\b\\d+(?:\\.\\d+)?\\s?%[^.]{0,80}\\b(?:say|said|report|reported|agree|agreed|believe|feel|felt|prefer|preferred|rate|rated)\\b',
  '\\b(?:compared\\s+(?:with|to)|relative\\s+to|than\\s+(?:those|in|the|conventional|baseline|control))\\b[^.]{0,80}\\b\\d+(?:\\.\\d+)?\\s?%',
]

// What the results mean.
export const INTERPRETATION = [
  '^(?:Conclusions?|Discussion|Interpretation|Implications?)\\s*:',
  '\\b(?:these|our|the|this|such)\\s+(?:results?|findings?|data|evidence|patterns?|observations?|associations?|differences?|effects?)\\s+(?:\\w+\\s+){0,2}(?:suggest|suggests|imply|implies|indicate|indicates|point|points|highlight|highlights|underscore|underscores|support|supports|are\\s+consistent|is\\s+consistent|may|might|could|reflect|reflects|mean|means)\\b',
  '\\b(?:this|which|that|it)\\s+(?:suggests?|implies|indicates?|means|highlights|underscores|points\\s+to|reflects)\\b',
  '\\b(?:likely|probably|possibly|presumably)\\s+(?:because|due|reflects?|explains?|driven|caused)\\b',
  '\\b(?:one|a\\s+possible|a\\s+plausible|an\\s+alternative|another)\\s+explanation\\b',
  '\\bimplications?\\b|\\bin\\s+other\\s+words\\b|\\bthis\\s+means\\b|\\btaken\\s+together\\b|\\boverall,\\b|\\bin\\s+(?:sum|summary|conclusion)\\b',
]

// What others found, or the world as the document's backdrop.
export const BACKGROUND = [
  '\\b(?:previous|prior|earlier|past|existing|other|recent|several|many|numerous|some)\\s+(?:\\w+\\s+)?(?:research|studies|work|literature|reviews?|evidence|findings|reports|investigations|experiments|surveys)\\b',
  '\\b(?:studies|research|evidence|literature|reviews?|scientists|experts)\\s+(?:has|have|had)?\\s*(?:\\w+ly\\s+)?(?:shown|found|suggested|demonstrated|indicated|reported|established|linked|documented|confirmed)\\b',
  `\\b(?:it\\s+is|it['’]s)\\s+(?:well[- ])?(?:known|established|documented|recognized|accepted)\\b`,
  '\\baccording\\s+to\\b|\\bet\\s+al\\.?',
]
