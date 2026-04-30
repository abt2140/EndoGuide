import { useState } from 'react';

const SYSTEM_PROMPT = `You are EndoGuide, an AI-powered shared decision-making tool for endocrine surgical disease built by an endocrine surgery team. Your role is strictly a DECISION SUPPORT AID. You are NOT diagnostic. You do NOT recommend specific surgeons or medications.

KNOWLEDGE BASE — reason exclusively from these guidelines:
1. DIFFERENTIATED THYROID CANCER: 2025 ATA DTC Guidelines (Ringel, Sosa et al. Thyroid 2025;35(8):841-985). 4-tier ROR: low/low-intermediate/intermediate-high/high. Lobectomy acceptable <=4cm low-risk. Active surveillance for eligible microcarcinoma. All inputs PRE-OPERATIVE — ETE and margin not available.
2. HYPERTHYROIDISM / GRAVES' / TOXIC MNG / TOXIC ADENOMA: 2016 ATA Guidelines (Ross DS, Burch HB et al. Thyroid 2016;26(10):1343-1421). ATD/RAI/surgery equally recommended for Graves' absent contraindications. RAI contraindicated in moderate-severe active GO. Total thyroidectomy standard for Graves' surgery. RFA endorsed for AFTN (2023 ATA Ablation Statement).
3. THYROID NODULES / BENIGN GOITER: 2015 ATA Nodule Guidelines (Haugen BR et al. Thyroid 2016;26(1):1-133) + 2014 ATA Goiter Statement + 2023 ATA Ablation Statement (Sinclair CF et al. Thyroid 2023;33(10):1150-1170). RFA/ablation valid for symptomatic confirmed-benign nodules and goiter. Ethanol ablation first-line for cystic nodules.
4. GRAVES' OPHTHALMOPATHY: ATA/ETA 2022 Consensus. RAI absolutely contraindicated in moderate-severe active GO.

PREFERENCE-SENSITIVE ZONES:
ZONE 1: Active Surveillance vs Surgery — low-risk PTC microcarcinoma
ZONE 2: Lobectomy vs Total Thyroidectomy — when both guideline-concordant
ZONE 3: RAI for low-intermediate risk DTC — conditional recommendation
ZONE 4: Surveillance intensity/de-escalation — low-risk DTC
ZONE 5: Treatment modality for Graves' — ATD vs RAI vs Surgery (no absolute contraindication)
ZONE 6: RAI vs Surgery vs Ablation — TMNG/AFTN
ZONE 7: Indeterminate cytology (Bethesda III/IV) — management approach
ZONE 8: Surgery vs RFA/Ablation — symptomatic benign nodule or goiter
ZONE 11: ATD vs Surgery — moderate-severe active GO (RAI excluded)

REASONING STEPS:
1. Verify completeness — if critical variables missing, list them and stop
2. Determine guideline-concordant options (Strong/Conditional)
3. Identify applicable preference-sensitive zone(s)
4. Interpret preference scores: 1-2=low priority, 3=neutral, 4-5=high priority
5. Flag preference-guideline tensions explicitly — never suppress them
6. Generate four-component output

OUTPUT FORMAT — always use exactly this structure:

━━━ COMPONENT 1: GUIDELINE-CONCORDANT RECOMMENDATION ━━━
[2-4 sentences. Cite guideline. State recommendation strength STRONG/CONDITIONAL. List 1-3 driving variables. Label PREFERENCE-SENSITIVE if applicable.]

━━━ COMPONENT 2: HOW YOUR PREFERENCES FACTOR IN ━━━
[Map scores to options with reasoning. Flag conflicts. State overall direction.]

━━━ COMPONENT 3: YOUR PERSONALIZED SUMMARY ━━━
[3-5 sentences, plain language, warm, you/your. Name tensions compassionately.]

━━━ COMPONENT 4: QUESTIONS TO ASK YOUR SURGEON ━━━
1. [tailored to scenario] 2. [preference conflicts] 3. [relevant risks] 4. [alternatives] 5. [recovery/surveillance]

HARD RULES: Never diagnose. Never recommend specific surgeons/medications. Never suppress tensions. Never guess missing variables. No survival stats. No unqualified "cure". Warm patient-centered tone.`;

const API_KEY = import.meta.env.VITE_API_KEY as string;

const STEPS = ["welcome","disease","clinical","clinical2","nodes_mets","molecular","universal_prefs","disease_prefs","review","result"];

// ─── Reusable UI Components ───────────────────────────────────────────────

const SC = ({ label, sublabel, selected, onClick }: any) => (
  <button onClick={onClick} style={{display:"block",width:"100%",textAlign:"left",padding:"12px 16px",marginBottom:7,background:selected?"#EFF6FF":"white",border:selected?"2px solid #3B82F6":"1px solid #E5E7EB",borderRadius:8,cursor:"pointer"}}>
    <div style={{fontWeight:500,fontSize:14,color:selected?"#1D4ED8":"#111827"}}>{label}</div>
    {sublabel&&<div style={{fontSize:12,color:selected?"#3B82F6":"#6B7280",marginTop:2}}>{sublabel}</div>}
  </button>
);

const Scale = ({ q, sub, value, onChange, lo, hi }: any) => (
  <div style={{marginBottom:24}}>
    <div style={{fontWeight:500,fontSize:14,color:"#111827",marginBottom:3}}>{q}</div>
    {sub&&<div style={{fontSize:12,color:"#6B7280",marginBottom:10}}>{sub}</div>}
    <div style={{display:"flex",gap:7}}>
      {[1,2,3,4,5].map((n:number)=>(<button key={n} onClick={()=>onChange(n)} style={{width:46,height:46,borderRadius:8,border:value===n?"2px solid #3B82F6":"1px solid #E5E7EB",background:value===n?"#EFF6FF":"white",color:value===n?"#1D4ED8":"#374151",fontWeight:value===n?600:400,fontSize:17,cursor:"pointer"}}>{n}</button>))}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
      <span style={{fontSize:11,color:"#9CA3AF"}}>{lo}</span>
      <span style={{fontSize:11,color:"#9CA3AF"}}>{hi}</span>
    </div>
  </div>
);

const YN = ({ q, sub, value, onChange }: any) => (
  <div style={{marginBottom:22}}>
    <div style={{fontWeight:500,fontSize:14,color:"#111827",marginBottom:3}}>{q}</div>
    {sub&&<div style={{fontSize:12,color:"#6B7280",marginBottom:9}}>{sub}</div>}
    <div style={{display:"flex",gap:8}}>
      {["Yes","No"].map((o:string)=>(<button key={o} onClick={()=>onChange(o)} style={{padding:"9px 26px",borderRadius:8,border:value===o?"2px solid #3B82F6":"1px solid #E5E7EB",background:value===o?"#EFF6FF":"white",color:value===o?"#1D4ED8":"#374151",fontWeight:value===o?600:400,fontSize:14,cursor:"pointer"}}>{o}</button>))}
    </div>
  </div>
);

const TI = ({ label, sub, value, onChange, ph }: any) => (
  <div style={{marginBottom:18}}>
    {label&&<label style={{display:"block",fontWeight:500,fontSize:13,color:"#111827",marginBottom:3}}>{label}</label>}
    {sub&&<div style={{fontSize:12,color:"#6B7280",marginBottom:5}}>{sub}</div>}
    <input value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={ph||""} style={{width:"100%",boxSizing:"border-box" as any,padding:"9px 11px",fontSize:14,borderRadius:8,border:"1px solid #E5E7EB",color:"#111827"}}/>
  </div>
);

const Badge = ({ role }: any) => (
  <div style={{display:"inline-block",padding:"2px 9px",borderRadius:6,marginBottom:18,fontSize:11,fontWeight:600,background:role==="clinician"?"#FEF3C7":"#D1FAE5",color:role==="clinician"?"#92400E":"#065F46"}}>
    {role==="clinician"?"Clinician section":"Patient section"}
  </div>
);

const Card = ({ color, title, content }: any) => {
  const s:any={green:{border:"#BBF7D0",bg:"#F0FDF4",tx:"#065F46"},gray:{border:"#E5E7EB",bg:"#F9FAFB",tx:"#374151"},blue:{border:"#BFDBFE",bg:"#EFF6FF",tx:"#1E40AF"},amber:{border:"#FDE68A",bg:"#FFFBEB",tx:"#92400E"}};
  const c=s[color]||s.gray;
  return(<div style={{marginBottom:12,borderRadius:10,border:`1px solid ${c.border}`,overflow:"hidden"}}><div style={{padding:"9px 14px",background:c.bg}}><span style={{fontSize:12,fontWeight:600,color:c.tx}}>{title}</span></div><div style={{padding:"13px 14px",background:"white"}}><div style={{fontSize:13,lineHeight:1.7,color:"#374151"}} dangerouslySetInnerHTML={{__html:content}}/></div></div>);
};

const renderMD = (t:string) => '<p style="margin:0">' + t
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/\*([^*]+?)\*/g,'<em>$1</em>')
  .replace(/^> (.+)$/gm,'<blockquote style="margin:6px 0;padding:4px 12px;border-left:3px solid #E5E7EB;color:#6B7280;font-style:italic">$1</blockquote>')
  .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid #E5E7EB;margin:10px 0"/>')
  .replace(/\n\n/g,'</p><p style="margin:8px 0">')
  .replace(/\n/g,'<br/>') + '</p>';

// ─── Disease config ────────────────────────────────────────────────────────

const DISEASES = [
  {v:"DTC", l:"Differentiated thyroid cancer", s:"PTC, FTC, or OTC — confirmed malignancy"},
  {v:"Graves", l:"Graves' disease", s:"Autoimmune hyperthyroidism"},
  {v:"TMNG", l:"Toxic multinodular goiter (TMNG)", s:"Hyperthyroidism from multiple nodules"},
  {v:"AFTN", l:"Toxic adenoma (AFTN)", s:"Hyperthyroidism from a single hot nodule"},
  {v:"Nodule", l:"Non-functional thyroid nodule", s:"Confirmed benign or indeterminate nodule"},
  {v:"Goiter", l:"Non-functional goiter", s:"Symptomatic or cosmetically concerning goiter"},
];

const isDTC = (d:string) => d==="DTC";
const isHyper = (d:string) => ["Graves","TMNG","AFTN"].includes(d);
const isBenign = (d:string) => ["Nodule","Goiter"].includes(d);

// ─── Main component ────────────────────────────────────────────────────────

export default function EndoGuide() {
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [showDetails,setShowDetails]=useState(false);

  // Clinical state
  const [C,setC]=useState({
    // Shared
    disease:"", age:"", priorSurgery:"", comorbidities:"",
    // DTC
    cancerType:"", tumorSize:"", multifocal:"",
    lymphNodes:"", lymphDetails:"", distantMets:"",
    braf:"", tert:"", ras:"", retptc:"", multiGene:"", molOther:"",
    contralateral:"",
    // Graves
    trabStatus:"", ft4Level:"", goiterSize:"", goEyeDisease:"",
    priorATD:"", obstructiveSymptoms:"", suspiciousNodule:"", smoker:"",
    // TMNG/AFTN
    tshLevel:"", noduleSize:"", scintigraphy:"", rfaAvailable:"",
    // Nodule/Goiter
    bethesdaCategory:"", noduleGrowth:"", compressiveSymptoms:"",
    cosmeticConcern:"", substeranalExtension:"", trachealDeviation:"",
    dominantNoduleBethesda:"", goiterVolume:"",
  });

  // Preference state
  const [P,setP]=useState({
    // Universal
    avoidSurgery:0, definitive:0, anxiety:0, preserveThyroid:0, avoidScar:0,
    pregnancy:"", voice:"",
    // DTC zone 1 (AS)
    asComfort:0, asCancerAnxiety:0, asAttend:"",
    // DTC zone 2 (lobe vs total)
    lobeHormones:0, lobeConcern:0, lobeVoice:"",
    // Graves/Hyper
    concernRAI:0, desireDefinitive:0, eyeSymptoms:"",
    // Benign nodule/goiter
    retreatmentConcern:0, recoveryTime:0,
  });

  const sc=(k:string,v:any)=>setC((p:any)=>({...p,[k]:v}));
  const sp=(k:string,v:any)=>setP((p:any)=>({...p,[k]:v}));

  const d = C.disease;

  // ─── Eligibility checks ──────────────────────────────────────────────────
  const asEligible=()=>isDTC(d)&&parseFloat(C.tumorSize)<=1.0&&C.multifocal==="Unifocal"&&(C.lymphNodes==="No suspicious lymphadenopathy"||C.lymphNodes==="Not assessed")&&C.distantMets==="M0";
  const lobeEligible=()=>isDTC(d)&&(C.cancerType==="PTC"||C.cancerType==="FTC")&&parseFloat(C.tumorSize)<=4.0&&C.lymphNodes==="No suspicious lymphadenopathy"&&C.distantMets==="M0"&&C.contralateral!=="Disease requiring surgery";

  // ─── Step navigation ─────────────────────────────────────────────────────
  const getSteps=()=>{
    if(isDTC(d)) return ["welcome","disease","clinical","clinical2","nodes_mets","molecular","universal_prefs","disease_prefs","review","result"];
    if(isHyper(d)) return ["welcome","disease","clinical","universal_prefs","disease_prefs","review","result"];
    if(isBenign(d)) return ["welcome","disease","clinical","universal_prefs","disease_prefs","review","result"];
    return ["welcome","disease","review","result"];
  };

  const currentSteps = getSteps();
  const currentStepName = currentSteps[step] || "welcome";
  const totalClinicalSteps = currentSteps.length - 2; // exclude welcome and result
  const stepNum = Math.max(0, step - 1);
  const pct = step===0||step>=currentSteps.length-1?0:Math.round((stepNum/(totalClinicalSteps))*100);

  const advance=()=>setStep(s=>s+1);
  const back=()=>setStep(s=>Math.max(0,s-1));

  const canNext=():boolean=>{
    const s=currentStepName;
    if(s==="disease") return d!=="";
    if(s==="clinical"){
      if(isDTC(d)) return C.cancerType!=="";
      if(d==="Graves") return C.trabStatus!==""&&C.ft4Level!==""&&C.goEyeDisease!==""&&C.priorATD!=="";
      if(d==="TMNG") return C.tshLevel!==""&&C.goiterSize!==""&&C.scintigraphy!=="";
      if(d==="AFTN") return C.tshLevel!==""&&C.noduleSize!==""&&C.scintigraphy!=="";
      if(d==="Nodule") return C.bethesdaCategory!==""&&C.noduleSize!=="";
      if(d==="Goiter") return C.goiterVolume!==""&&C.compressiveSymptoms!=="";
      return true;
    }
    if(s==="clinical2") return C.tumorSize!==""&&C.multifocal!=="";
    if(s==="nodes_mets") return C.lymphNodes!==""&&C.distantMets!=="";
    if(s==="molecular") return C.age!=="";
    if(s==="universal_prefs") return P.avoidSurgery>0&&P.definitive>0&&P.anxiety>0&&P.preserveThyroid>0&&P.avoidScar>0&&P.pregnancy!=="";
    if(s==="disease_prefs"){
      if(asEligible()&&(P.asComfort===0||P.asCancerAnxiety===0||P.asAttend==="")) return false;
      if(lobeEligible()&&(P.lobeHormones===0||P.lobeConcern===0)) return false;
      return true;
    }
    return true;
  };

  // ─── Build intake text ───────────────────────────────────────────────────
  const buildIntake=()=>{
    const lines:string[]=["PATIENT INTAKE — ENDOCRINE SURGERY DECISION SUPPORT",""];

    if(isDTC(d)){
      lines.push("DISEASE CATEGORY: Differentiated Thyroid Cancer — Confirmed malignancy (Bethesda VI)","","NOTE: All data pre-operative. ETE and margin not available.","--- CLINICAL VARIABLES ---",
        `Cancer type: ${C.cancerType}`,`Tumor size: ${C.tumorSize} cm`,`Multifocality: ${C.multifocal}`,
        `Pre-op lymph nodes (US): ${C.lymphNodes}${C.lymphDetails?" — "+C.lymphDetails:""}`,
        `Distant metastases: ${C.distantMets}`,`Age: ${C.age}`,
        `Prior surgery/radiation: ${C.priorSurgery||"None"}`,
        `Contralateral lobe: ${C.contralateral||"Normal"}`,
        `Comorbidities: ${C.comorbidities||"None"}`,
        "--- MOLECULAR MARKERS ---",
        `BRAF V600E: ${C.braf||"Not tested"}`,`TERT: ${C.tert||"Not tested"}`,
        `RET/PTC: ${C.retptc||"Not tested"}`,`RAS: ${C.ras||"Not tested"}`,
        `Multi-gene panel: ${C.multiGene||"Not performed"}`,
        ...(C.molOther?[`Other: ${C.molOther}`]:[]),
      );
    } else if(d==="Graves"){
      lines.push("DISEASE CATEGORY: Graves' Disease","--- CLINICAL VARIABLES ---",
        `TRAb status: ${C.trabStatus}`,`FT4 level: ${C.ft4Level}`,
        `Goiter size: ${C.goiterSize}`,`Graves ophthalmopathy: ${C.goEyeDisease}`,
        `Prior/current ATD use: ${C.priorATD}`,
        `Obstructive symptoms: ${C.obstructiveSymptoms||"None"}`,
        `Suspicious nodule on US: ${C.suspiciousNodule||"No"}`,
        `Smoker: ${C.smoker||"No"}`,`Age: ${C.age}`,
        `Comorbidities: ${C.comorbidities||"None"}`,
      );
    } else if(d==="TMNG"){
      lines.push("DISEASE CATEGORY: Toxic Multinodular Goiter (TMNG)","--- CLINICAL VARIABLES ---",
        `TSH level: ${C.tshLevel}`,`Goiter size: ${C.goiterSize}`,
        `Scintigraphy: ${C.scintigraphy}`,
        `Obstructive/compressive symptoms: ${C.obstructiveSymptoms||"None"}`,
        `Substernal extension: ${C.substeranalExtension||"No"}`,
        `Age: ${C.age}`,`Comorbidities: ${C.comorbidities||"None"}`,
      );
    } else if(d==="AFTN"){
      lines.push("DISEASE CATEGORY: Toxic Adenoma / AFTN","--- CLINICAL VARIABLES ---",
        `TSH level: ${C.tshLevel}`,`Nodule size: ${C.noduleSize} cm`,
        `Scintigraphy: ${C.scintigraphy}`,
        `RFA available at center: ${C.rfaAvailable||"Unknown"}`,
        `Age: ${C.age}`,`Comorbidities: ${C.comorbidities||"None"}`,
      );
    } else if(d==="Nodule"){
      lines.push("DISEASE CATEGORY: Non-functional Thyroid Nodule","--- CLINICAL VARIABLES ---",
        `Bethesda category: ${C.bethesdaCategory}`,`Nodule size: ${C.noduleSize} cm`,
        `Growth on surveillance: ${C.noduleGrowth||"Stable"}`,
        `Compressive symptoms: ${C.compressiveSymptoms||"None"}`,
        `Cosmetic concern: ${C.cosmeticConcern||"No"}`,
        `Substernal extension: ${C.substeranalExtension||"No"}`,
        `RFA available: ${C.rfaAvailable||"Unknown"}`,
        `Age: ${C.age}`,`Comorbidities: ${C.comorbidities||"None"}`,
      );
    } else if(d==="Goiter"){
      lines.push("DISEASE CATEGORY: Non-functional Goiter (Symptomatic/Cosmetic)","--- CLINICAL VARIABLES ---",
        `Goiter volume/size: ${C.goiterVolume}`,
        `Dominant nodule Bethesda category: ${C.dominantNoduleBethesda||"Not biopsied"}`,
        `Compressive symptoms: ${C.compressiveSymptoms}`,
        `Cosmetic concern: ${C.cosmeticConcern||"No"}`,
        `Substernal extension: ${C.substeranalExtension||"No"}`,
        `Tracheal deviation: ${C.trachealDeviation||"No"}`,
        `RFA available: ${C.rfaAvailable||"Unknown"}`,
        `Age: ${C.age}`,`Comorbidities: ${C.comorbidities||"None"}`,
      );
    }

    lines.push("","--- PATIENT PREFERENCES ---",
      `Avoid surgery (1-5): ${P.avoidSurgery}`,`Definitive treatment (1-5): ${P.definitive}`,
      `Anxiety (1-5): ${P.anxiety}`,`Preserve thyroid (1-5): ${P.preserveThyroid}`,
      `Avoid scar (1-5): ${P.avoidScar}`,`Pregnancy plans 6mo: ${P.pregnancy}`,
      `Voice/lifestyle: ${P.voice||"None"}`,
    );

    if(isDTC(d)){
      if(asEligible()) lines.push(`AS comfort (1-5): ${P.asComfort}`,`AS cancer anxiety (1-5): ${P.asCancerAnxiety}`,`AS attend appointments: ${P.asAttend}`);
      if(lobeEligible()) lines.push(`Lobe avoid hormones (1-5): ${P.lobeHormones}`,`Lobe contralateral concern (1-5): ${P.lobeConcern}`,`Lobe voice: ${P.lobeVoice||"None"}`);
    }
    if(isHyper(d)) lines.push(`Concern about RAI (1-5): ${P.concernRAI}`,`Desire for definitive single treatment (1-5): ${P.desireDefinitive}`,`Eye symptoms present: ${P.eyeSymptoms||"No"}`);
    if(isBenign(d)) lines.push(`Concern about re-treatment if ablation (1-5): ${P.retreatmentConcern}`,`Minimize recovery time priority (1-5): ${P.recoveryTime}`);

    lines.push("",`Date: ${new Date().toLocaleDateString()}`);
    return lines.join("\n");
  };

  // ─── API call ────────────────────────────────────────────────────────────
  const run=async()=>{
    setLoading(true);setError(null);setShowDetails(false);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1800,system:SYSTEM_PROMPT,messages:[{role:"user",content:buildIntake()}]})
      });
      const data=await r.json();
      const t=data.content?.map((b:any)=>b.text||"").join("")||"";
      if(!t)throw new Error("Empty");
      setResult(t);setStep(currentSteps.indexOf("result"));
    }catch(e){setError("Unable to connect. Please check your API key and try again.");}
    setLoading(false);
  };

  const parseResult=(txt:string)=>{
    const parts=txt.split(/━━━\s*(COMPONENT \d+:[^━\n]+)\s*━━━/);
    const out:any[]=[];
    for(let i=1;i<parts.length;i+=2)out.push({title:parts[i].trim(),content:parts[i+1]?.trim()||""});
    return out.length?out:[{title:"Analysis",content:txt}];
  };

  const resetAll=()=>{
    setStep(0);setResult(null);setShowDetails(false);setError(null);
    setC({disease:"",age:"",priorSurgery:"",comorbidities:"",cancerType:"",tumorSize:"",multifocal:"",lymphNodes:"",lymphDetails:"",distantMets:"",braf:"",tert:"",ras:"",retptc:"",multiGene:"",molOther:"",contralateral:"",trabStatus:"",ft4Level:"",goiterSize:"",goEyeDisease:"",priorATD:"",obstructiveSymptoms:"",suspiciousNodule:"",smoker:"",tshLevel:"",noduleSize:"",scintigraphy:"",rfaAvailable:"",bethesdaCategory:"",noduleGrowth:"",compressiveSymptoms:"",cosmeticConcern:"",substeranalExtension:"",trachealDeviation:"",dominantNoduleBethesda:"",goiterVolume:""});
    setP({avoidSurgery:0,definitive:0,anxiety:0,preserveThyroid:0,avoidScar:0,pregnancy:"",voice:"",asComfort:0,asCancerAnxiety:0,asAttend:"",lobeHormones:0,lobeConcern:0,lobeVoice:"",concernRAI:0,desireDefinitive:0,eyeSymptoms:"",retreatmentConcern:0,recoveryTime:0});
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:"2rem 1rem",fontFamily:"system-ui,sans-serif",color:"#111827"}}>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:3}}>
          <span style={{fontSize:20,fontWeight:600}}>EndoGuide</span>
          <span style={{fontSize:12,color:"#6B7280",padding:"2px 7px",border:"1px solid #E5E7EB",borderRadius:6}}>Beta · Thyroid</span>
        </div>
        <p style={{fontSize:13,color:"#6B7280",margin:0}}>Endocrine surgery shared decision support</p>
      </div>

      {/* Progress bar */}
      {step>0&&currentStepName!=="result"&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:11,color:"#9CA3AF"}}>Step {stepNum} of {totalClinicalSteps}</span>
            <span style={{fontSize:11,color:"#9CA3AF"}}>{pct}%</span>
          </div>
          <div style={{height:3,background:"#F3F4F6",borderRadius:2}}>
            <div style={{height:"100%",width:`${pct}%`,background:"#3B82F6",borderRadius:2,transition:"width 0.3s"}}/>
          </div>
        </div>
      )}

      {/* ── WELCOME ── */}
      {currentStepName==="welcome"&&(
        <div>
          <div style={{padding:"18px 20px",background:"#F9FAFB",borderRadius:12,marginBottom:20,border:"1px solid #E5E7EB"}}>
            <p style={{fontSize:14,fontWeight:600,margin:"0 0 8px"}}>How this works</p>
            <p style={{fontSize:13,color:"#6B7280",margin:"0 0 14px",lineHeight:1.65}}>For patients with a confirmed or suspected thyroid/endocrine diagnosis preparing for a surgical consultation. A clinician fills in your medical details first. Then you answer questions about what matters most to you. Together these generate a personalized summary to bring to your surgeon.</p>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,padding:"9px 13px",background:"#FEF3C7",borderRadius:8}}><div style={{fontSize:11,fontWeight:600,color:"#92400E",marginBottom:2}}>Clinician section</div><div style={{fontSize:12,color:"#6B7280"}}>Medical details, imaging, molecular results</div></div>
              <div style={{flex:1,padding:"9px 13px",background:"#D1FAE5",borderRadius:8}}><div style={{fontSize:11,fontWeight:600,color:"#065F46",marginBottom:2}}>Patient section</div><div style={{fontSize:12,color:"#6B7280"}}>Your values and priorities</div></div>
            </div>
          </div>
          <div style={{padding:"12px 14px",background:"#FEF2F2",borderRadius:12,marginBottom:24,border:"1px solid #FECACA"}}>
            <p style={{fontSize:12,color:"#B91C1C",margin:0,lineHeight:1.6}}>Decision support only — does not replace clinical judgment or surgeon consultation. No information stored.</p>
          </div>
          <button onClick={advance} style={{width:"100%",padding:13,fontSize:15,fontWeight:500,borderRadius:10,border:"1px solid #E5E7EB",cursor:"pointer",background:"white"}}>Begin →</button>
        </div>
      )}

      {/* ── DISEASE SELECTION ── */}
      {currentStepName==="disease"&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>What is the diagnosis?</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:18}}>Select the confirmed or working diagnosis for this patient.</p>
          {DISEASES.map((o:any)=>(<SC key={o.v} label={o.l} sublabel={o.s} selected={d===o.v} onClick={()=>sc("disease",o.v)}/>))}
        </div>
      )}

      {/* ── DTC CLINICAL: Cancer type ── */}
      {currentStepName==="clinical"&&isDTC(d)&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Cancer type</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:18}}>Select the confirmed diagnosis. PTC variant is determined on final pathology — not required here.</p>
          {[{v:"PTC",l:"Papillary thyroid carcinoma (PTC)",s:"Confirmed on FNA cytology"},{v:"FTC",l:"Follicular thyroid carcinoma (FTC)",s:""},{v:"OTC",l:"Oncocytic thyroid carcinoma (OTC / Hürthle cell)",s:""}].map((o:any)=>(<SC key={o.v} label={o.l} sublabel={o.s} selected={C.cancerType===o.v} onClick={()=>sc("cancerType",o.v)}/>))}
        </div>
      )}

      {/* ── DTC CLINICAL 2: Tumor characteristics ── */}
      {currentStepName==="clinical2"&&isDTC(d)&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Tumor characteristics</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:18}}>Based on pre-operative ultrasound.</p>
          <TI label="Tumor size (cm)" sub="Largest dimension on ultrasound" value={C.tumorSize} onChange={(v:string)=>sc("tumorSize",v)} ph="e.g. 1.2"/>
          <div style={{marginBottom:18}}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Multifocality on ultrasound</p>
            {[{v:"Unifocal",s:"Single lesion"},{v:"Multifocal — 2 foci",s:"Two separate lesions"},{v:"Multifocal — 3+ foci",s:"Three or more lesions"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.multifocal===o.v} onClick={()=>sc("multifocal",o.v)}/>))}
          </div>
        </div>
      )}

      {/* ── DTC: Lymph nodes & mets ── */}
      {currentStepName==="nodes_mets"&&isDTC(d)&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Lymph node staging & metastases</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:18}}>Based on pre-operative ultrasound neck staging.</p>
          <div style={{marginBottom:18}}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Lymph node status on pre-op ultrasound</p>
            {[{v:"No suspicious lymphadenopathy",s:"No suspicious nodes on staging ultrasound"},{v:"Suspicious central nodes (level VI)",s:"Central compartment"},{v:"Suspicious lateral nodes (levels II–V)",s:"Lateral compartment"},{v:"Suspicious central and lateral nodes",s:"Multilevel"},{v:"Not assessed",s:"Ultrasound not yet performed"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.lymphNodes===o.v} onClick={()=>sc("lymphNodes",o.v)}/>))}
          </div>
          {C.lymphNodes.includes("Suspicious")&&(<TI label="Node details" sub="Size (mm), number, extranodal extension" value={C.lymphDetails} onChange={(v:string)=>sc("lymphDetails",v)} ph="e.g. 2 central nodes, largest 12mm"/>)}
          <div style={{marginBottom:18}}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:3}}>Distant metastases</p>
            <p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>On pre-operative staging imaging</p>
            {[{v:"M0",s:"No distant metastases"},{v:"M1",s:"Distant metastases identified"},{v:"Not staged",s:"Staging imaging not performed"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.distantMets===o.v} onClick={()=>sc("distantMets",o.v)}/>))}
          </div>
        </div>
      )}

      {/* ── DTC: Molecular & patient factors ── */}
      {currentStepName==="molecular"&&isDTC(d)&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Molecular markers & patient factors</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:18}}>From FNA reflex testing or multi-gene panel, if performed.</p>
          {[{k:"braf",l:"BRAF V600E",s:"Often reflexed on PTC FNA"},{k:"tert",l:"TERT promoter mutation",s:"BRAF+TERT co-mutation significantly upgrades risk"},{k:"retptc",l:"RET/PTC rearrangement",s:""},{k:"ras",l:"RAS mutation (NRAS/HRAS/KRAS)",s:""}].map(({k,l,s}:any)=>(<div key={k} style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:3}}>{l}</p>{s&&<p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>{s}</p>}<div style={{display:"flex",gap:7,flexWrap:"wrap" as any}}>{["Positive","Negative","Not tested"].map((v:string)=>(<SC key={v} label={v} selected={(C as any)[k]===v} onClick={()=>sc(k,v)}/>))}</div></div>))}
          <div style={{marginBottom:20}}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:3}}>Multi-gene panel result</p>
            <p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>Afirma GSC, ThyroSeq v3, or similar — if performed</p>
            {[{v:"Not performed",s:""},{v:"Benign / low risk",s:"e.g. Afirma Benign"},{v:"Indeterminate",s:""},{v:"Suspicious / high risk",s:"e.g. Afirma Suspicious, ThyroSeq high-risk mutation"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.multiGene===o.v} onClick={()=>sc("multiGene",o.v)}/>))}
          </div>
          <TI label="Other molecular findings" sub="Leave blank if none" value={C.molOther} onChange={(v:string)=>sc("molOther",v)} ph="e.g. ALK rearrangement"/>
          <div style={{borderTop:"1px solid #E5E7EB",paddingTop:18,marginTop:6}}>
            <TI label="Patient age" value={C.age} onChange={(v:string)=>sc("age",v)} ph="e.g. 42"/>
            <TI label="Prior neck surgery or radiation" sub="Leave blank if none" value={C.priorSurgery} onChange={(v:string)=>sc("priorSurgery",v)} ph="e.g. Prior hemithyroidectomy 2019"/>
            <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Contralateral lobe on ultrasound</p>{["Normal","Benign nodule(s) — Bethesda II","Indeterminate nodule(s) — Bethesda III/IV","Suspicious nodule(s) — Bethesda V/VI","Disease requiring surgery"].map((v:string)=>(<SC key={v} label={v} selected={C.contralateral===v} onClick={()=>sc("contralateral",v)}/>))}</div>
            <TI label="Significant comorbidities" sub="Leave blank if none" value={C.comorbidities} onChange={(v:string)=>sc("comorbidities",v)} ph="e.g. Well-controlled hypertension"/>
          </div>
        </div>
      )}

      {/* ── GRAVES' CLINICAL ── */}
      {currentStepName==="clinical"&&d==="Graves"&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Graves' disease — clinical details</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:18}}>These variables determine which treatment options are guideline-concordant.</p>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>TRAb (TSH receptor antibody) status</p>{[{v:"Positive",s:"Confirms autoimmune etiology"},{v:"Negative",s:""},{v:"Not tested",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.trabStatus===o.v} onClick={()=>sc("trabStatus",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Free T4 level</p>{[{v:"Normal",s:""},{v:"Mildly elevated (1–1.5× ULN)",s:""},{v:"Moderately elevated (1.5–2× ULN)",s:""},{v:"Severely elevated (>2× ULN)",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.ft4Level===o.v} onClick={()=>sc("ft4Level",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Estimated goiter size</p>{[{v:"Small (<30g)",s:""},{v:"Moderate (30–80g)",s:""},{v:"Large (>80g)",s:"May favor surgery over RAI"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.goiterSize===o.v} onClick={()=>sc("goiterSize",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:3}}>Graves' ophthalmopathy (GO)</p><p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>This is the most critical variable — moderate-severe active GO contraindates RAI</p>{[{v:"None",s:""},{v:"Mild inactive",s:""},{v:"Mild active",s:""},{v:"Moderate-severe active",s:"RAI contraindicated — strong ATA recommendation"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.goEyeDisease===o.v} onClick={()=>sc("goEyeDisease",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Prior or current antithyroid drug (ATD) use</p>{[{v:"Never used",s:""},{v:"Currently on ATD — biochemically controlled",s:""},{v:"Currently on ATD — not in remission after 12–18 months",s:""},{v:"Tried ATD — intolerant or side effects",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.priorATD===o.v} onClick={()=>sc("priorATD",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Obstructive symptoms</p>{[{v:"None",s:""},{v:"Mild — globus or occasional dysphagia",s:""},{v:"Moderate-severe — significant dysphagia, positional symptoms",s:"Favors surgery"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.obstructiveSymptoms===o.v} onClick={()=>sc("obstructiveSymptoms",o.v)}/>))}</div>
          <YN q="Suspicious nodule identified on thyroid ultrasound?" value={C.suspiciousNodule} onChange={(v:string)=>sc("suspiciousNodule",v)}/>
          <YN q="Current smoker?" sub="Smoking increases risk of GO worsening after RAI" value={C.smoker} onChange={(v:string)=>sc("smoker",v)}/>
          <TI label="Patient age" value={C.age} onChange={(v:string)=>sc("age",v)} ph="e.g. 44"/>
          <TI label="Significant comorbidities" sub="Leave blank if none" value={C.comorbidities} onChange={(v:string)=>sc("comorbidities",v)} ph="e.g. Atrial fibrillation"/>
        </div>
      )}

      {/* ── TMNG CLINICAL ── */}
      {currentStepName==="clinical"&&d==="TMNG"&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Toxic multinodular goiter — clinical details</h3>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>TSH level</p>{[{v:"Suppressed (<0.1 mIU/L)",s:"Confirms hyperthyroidism"},{v:"Low-normal (0.1–0.5 mIU/L)",s:""},{v:"Normal",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.tshLevel===o.v} onClick={()=>sc("tshLevel",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Goiter size / volume</p>{[{v:"Small (<50g)",s:""},{v:"Moderate (50–100g)",s:""},{v:"Large (>100g)",s:"RAI less likely to be curative; surgery preferred"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.goiterSize===o.v} onClick={()=>sc("goiterSize",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Scintigraphy / nuclear scan</p>{[{v:"Confirmed hyperfunctioning multinodular goiter",s:""},{v:"Not performed",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.scintigraphy===o.v} onClick={()=>sc("scintigraphy",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Compressive / obstructive symptoms</p>{[{v:"None",s:""},{v:"Mild",s:""},{v:"Moderate-severe",s:"Favors surgery"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.obstructiveSymptoms===o.v} onClick={()=>sc("obstructiveSymptoms",o.v)}/>))}</div>
          <YN q="Substernal extension on imaging?" value={C.substeranalExtension} onChange={(v:string)=>sc("substeranalExtension",v)}/>
          <TI label="Patient age" value={C.age} onChange={(v:string)=>sc("age",v)} ph="e.g. 58"/>
          <TI label="Significant comorbidities" sub="Leave blank if none" value={C.comorbidities} onChange={(v:string)=>sc("comorbidities",v)} ph=""/>
        </div>
      )}

      {/* ── AFTN CLINICAL ── */}
      {currentStepName==="clinical"&&d==="AFTN"&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Toxic adenoma (AFTN) — clinical details</h3>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>TSH level</p>{[{v:"Suppressed (<0.1 mIU/L)",s:"Confirms autonomous function"},{v:"Low-normal (0.1–0.5 mIU/L)",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.tshLevel===o.v} onClick={()=>sc("tshLevel",o.v)}/>))}</div>
          <TI label="Nodule size (cm)" sub="Largest dimension on ultrasound" value={C.noduleSize} onChange={(v:string)=>sc("noduleSize",v)} ph="e.g. 2.8"/>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Scintigraphy result</p>{[{v:"Confirmed hot nodule (autonomous function)",s:""},{v:"Not performed",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.scintigraphy===o.v} onClick={()=>sc("scintigraphy",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>RFA / thermal ablation available at your center?</p><p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>Endorsed by 2023 ATA Ablation Statement for AFTN</p>{[{v:"Yes",s:""},{v:"No",s:""},{v:"Unknown",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.rfaAvailable===o.v} onClick={()=>sc("rfaAvailable",o.v)}/>))}</div>
          <TI label="Patient age" value={C.age} onChange={(v:string)=>sc("age",v)} ph="e.g. 45"/>
          <TI label="Significant comorbidities" sub="Leave blank if none" value={C.comorbidities} onChange={(v:string)=>sc("comorbidities",v)} ph=""/>
        </div>
      )}

      {/* ── NON-FUNCTIONAL NODULE CLINICAL ── */}
      {currentStepName==="clinical"&&d==="Nodule"&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Non-functional thyroid nodule — clinical details</h3>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:3}}>Bethesda category</p><p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>From most recent FNA cytology</p>{[{v:"Bethesda II — Benign",s:"Confirmed benign"},{v:"Bethesda III — Atypia of undetermined significance (AUS)",s:"Indeterminate"},{v:"Bethesda IV — Follicular neoplasm",s:"Indeterminate"},{v:"Bethesda V — Suspicious for malignancy",s:""},{v:"Bethesda VI — Malignant",s:"Consider switching to DTC category"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.bethesdaCategory===o.v} onClick={()=>sc("bethesdaCategory",o.v)}/>))}</div>
          <TI label="Nodule size (cm)" sub="Largest dimension on ultrasound" value={C.noduleSize} onChange={(v:string)=>sc("noduleSize",v)} ph="e.g. 3.8"/>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Growth on surveillance ultrasound</p>{[{v:"Stable",s:""},{v:"Growing — <25% volume increase",s:""},{v:"Growing — >25% volume increase",s:"Significant growth"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.noduleGrowth===o.v} onClick={()=>sc("noduleGrowth",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Compressive symptoms</p>{[{v:"None",s:""},{v:"Globus / throat fullness",s:""},{v:"Dysphagia",s:""},{v:"Multiple compressive symptoms",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.compressiveSymptoms===o.v} onClick={()=>sc("compressiveSymptoms",o.v)}/>))}</div>
          <YN q="Cosmetic concern?" value={C.cosmeticConcern} onChange={(v:string)=>sc("cosmeticConcern",v)}/>
          <YN q="Substernal extension on imaging?" value={C.substeranalExtension} onChange={(v:string)=>sc("substeranalExtension",v)}/>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>RFA / thermal ablation available at your center?</p>{[{v:"Yes",s:""},{v:"No",s:""},{v:"Unknown",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.rfaAvailable===o.v} onClick={()=>sc("rfaAvailable",o.v)}/>))}</div>
          <TI label="Patient age" value={C.age} onChange={(v:string)=>sc("age",v)} ph="e.g. 34"/>
          <TI label="Significant comorbidities" sub="Leave blank if none" value={C.comorbidities} onChange={(v:string)=>sc("comorbidities",v)} ph=""/>
        </div>
      )}

      {/* ── NON-FUNCTIONAL GOITER CLINICAL ── */}
      {currentStepName==="clinical"&&d==="Goiter"&&(
        <div>
          <Badge role="clinician"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>Non-functional goiter — clinical details</h3>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Goiter size / volume estimate</p>{[{v:"Small — visible but <50g",s:""},{v:"Moderate — 50–100g",s:""},{v:"Large — >100g",s:""},{v:"Massive — >150g or significant substernal",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.goiterVolume===o.v} onClick={()=>sc("goiterVolume",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Dominant nodule Bethesda category (if biopsied)</p>{[{v:"Not biopsied / no dominant nodule",s:""},{v:"Bethesda II — Benign",s:""},{v:"Bethesda III/IV — Indeterminate",s:""},{v:"Bethesda V/VI — Suspicious or malignant",s:"Consider DTC or nodule pathway"}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.dominantNoduleBethesda===o.v} onClick={()=>sc("dominantNoduleBethesda",o.v)}/>))}</div>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>Compressive symptoms</p>{[{v:"Dysphagia",s:""},{v:"Globus / throat fullness",s:""},{v:"Positional symptoms / orthopnea",s:""},{v:"Multiple symptoms",s:""},{v:"Cosmetic only — no compressive symptoms",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.compressiveSymptoms===o.v} onClick={()=>sc("compressiveSymptoms",o.v)}/>))}</div>
          <YN q="Substernal extension on imaging?" value={C.substeranalExtension} onChange={(v:string)=>sc("substeranalExtension",v)}/>
          <YN q="Tracheal deviation on imaging or exam?" value={C.trachealDeviation} onChange={(v:string)=>sc("trachealDeviation",v)}/>
          <div style={{marginBottom:16}}><p style={{fontSize:13,fontWeight:500,marginBottom:7}}>RFA / thermal ablation available at your center?</p>{[{v:"Yes",s:""},{v:"No",s:""},{v:"Unknown",s:""}].map((o:any)=>(<SC key={o.v} label={o.v} sublabel={o.s} selected={C.rfaAvailable===o.v} onClick={()=>sc("rfaAvailable",o.v)}/>))}</div>
          <TI label="Patient age" value={C.age} onChange={(v:string)=>sc("age",v)} ph="e.g. 52"/>
          <TI label="Significant comorbidities" sub="Leave blank if none" value={C.comorbidities} onChange={(v:string)=>sc("comorbidities",v)} ph=""/>
        </div>
      )}

      {/* ── UNIVERSAL PREFERENCES ── */}
      {currentStepName==="universal_prefs"&&(
        <div>
          <Badge role="patient"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>What matters most to you</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:22,lineHeight:1.65}}>No right or wrong answers. These help us understand your priorities.</p>
          <Scale q="How important is it to avoid surgery if other options exist?" lo="Not important" hi="Extremely important" value={P.avoidSurgery} onChange={(v:number)=>sp("avoidSurgery",v)}/>
          <Scale q="How important is having a definitive, once-and-done treatment rather than ongoing monitoring?" lo="Not important" hi="Extremely important" value={P.definitive} onChange={(v:number)=>sp("definitive",v)}/>
          <Scale q="How anxious are you about your diagnosis day-to-day?" lo="Very low anxiety" hi="Very high anxiety" value={P.anxiety} onChange={(v:number)=>sp("anxiety",v)}/>
          <Scale q="How important is preserving your thyroid and avoiding a daily thyroid hormone pill?" lo="Not important" hi="Extremely important" value={P.preserveThyroid} onChange={(v:number)=>sp("preserveThyroid",v)}/>
          <Scale q="How important is avoiding a visible scar on your neck?" lo="Not important" hi="Extremely important" value={P.avoidScar} onChange={(v:number)=>sp("avoidScar",v)}/>
          <YN q="Are you planning to become pregnant within the next 6 months?" value={P.pregnancy} onChange={(v:string)=>sp("pregnancy",v)}/>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontWeight:500,fontSize:13,color:"#111827",marginBottom:3}}>Do you have any voice-related occupation or professional concerns?</label>
            <p style={{fontSize:12,color:"#6B7280",marginBottom:7}}>e.g. singer, teacher, actor, public speaker — or leave blank</p>
            <textarea value={P.voice} onChange={(e:any)=>sp("voice",e.target.value)} placeholder="Describe here, or leave blank" rows={2} style={{width:"100%",boxSizing:"border-box" as any,padding:"9px 11px",fontSize:13,borderRadius:8,border:"1px solid #E5E7EB",resize:"vertical" as any}}/>
          </div>
        </div>
      )}

      {/* ── DISEASE-SPECIFIC PREFERENCES ── */}
      {currentStepName==="disease_prefs"&&(
        <div>
          <Badge role="patient"/>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:5}}>A few more questions</h3>
          <p style={{fontSize:13,color:"#6B7280",marginBottom:20}}>Based on your medical details, these are specifically relevant to your case.</p>

          {/* DTC — AS eligible */}
          {asEligible()&&(
            <div style={{padding:"15px 17px",background:"#F9FAFB",borderRadius:12,marginBottom:20,border:"1px solid #E5E7EB"}}>
              <p style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:10,marginTop:0}}>About watchful waiting (active surveillance)</p>
              <p style={{fontSize:13,color:"#6B7280",marginBottom:16,lineHeight:1.65}}>Your details suggest you may be eligible to monitor your cancer with regular ultrasounds instead of surgery right away.</p>
              <Scale q="How comfortable are you with not having surgery if monitoring is considered safe?" lo="Very uncomfortable" hi="Very comfortable" value={P.asComfort} onChange={(v:number)=>sp("asComfort",v)}/>
              <Scale q="How concerned are you about living with a known cancer that hasn't been removed?" lo="Not concerned" hi="Very concerned" value={P.asCancerAnxiety} onChange={(v:number)=>sp("asCancerAnxiety",v)}/>
              <YN q="Can you reliably attend regular ultrasound appointments every 6–12 months?" value={P.asAttend} onChange={(v:string)=>sp("asAttend",v)}/>
            </div>
          )}

          {/* DTC — Lobe eligible */}
          {lobeEligible()&&(
            <div style={{padding:"15px 17px",background:"#F9FAFB",borderRadius:12,marginBottom:20,border:"1px solid #E5E7EB"}}>
              <p style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:10,marginTop:0}}>About the extent of surgery</p>
              <p style={{fontSize:13,color:"#6B7280",marginBottom:16,lineHeight:1.65}}>Your details suggest removing only half your thyroid (lobectomy) may be an option rather than the whole gland.</p>
              <Scale q="How important is it to avoid taking a daily thyroid pill for the rest of your life?" sub="Removing only half the thyroid may let the remaining half work on its own." lo="Not important" hi="Extremely important" value={P.lobeHormones} onChange={(v:number)=>sp("lobeHormones",v)}/>
              <Scale q="How concerned are you about cancer potentially coming back on the other side if only half is removed?" lo="Not concerned" hi="Very concerned" value={P.lobeConcern} onChange={(v:number)=>sp("lobeConcern",v)}/>
              <div style={{marginBottom:6}}>
                <label style={{display:"block",fontWeight:500,fontSize:13,color:"#111827",marginBottom:3}}>Voice-related occupation or concerns specific to surgery?</label>
                <textarea value={P.lobeVoice} onChange={(e:any)=>sp("lobeVoice",e.target.value)} placeholder="e.g. Professional singer — or leave blank" rows={2} style={{width:"100%",boxSizing:"border-box" as any,padding:"9px 11px",fontSize:13,borderRadius:8,border:"1px solid #E5E7EB",resize:"vertical" as any}}/>
              </div>
            </div>
          )}

          {/* DTC — neither zone */}
          {isDTC(d)&&!asEligible()&&!lobeEligible()&&(
            <div style={{padding:"14px 16px",background:"#F9FAFB",borderRadius:12,border:"1px solid #E5E7EB"}}>
              <p style={{fontSize:13,color:"#6B7280",margin:0,lineHeight:1.65}}>Based on the clinical details entered, your case will be analyzed using the standard guidelines for your cancer profile. Your preference responses from the previous section are included in full.</p>
            </div>
          )}

          {/* Hyperthyroid diseases */}
          {isHyper(d)&&(
            <div style={{padding:"15px 17px",background:"#F9FAFB",borderRadius:12,marginBottom:20,border:"1px solid #E5E7EB"}}>
              <p style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:10,marginTop:0}}>About your treatment options</p>
              <Scale q="How concerned are you about receiving radioactive iodine (RAI)?" sub="Some patients prefer to avoid radiation treatment." lo="Not concerned" hi="Very concerned" value={P.concernRAI} onChange={(v:number)=>sp("concernRAI",v)}/>
              <Scale q="How important is it to have a single definitive treatment rather than long-term medication?" lo="Not important" hi="Extremely important" value={P.desireDefinitive} onChange={(v:number)=>sp("desireDefinitive",v)}/>
              <YN q="Do you currently have any eye symptoms? (dryness, irritation, bulging, double vision)" value={P.eyeSymptoms} onChange={(v:string)=>sp("eyeSymptoms",v)}/>
            </div>
          )}

          {/* Benign nodule / goiter */}
          {isBenign(d)&&(
            <div style={{padding:"15px 17px",background:"#F9FAFB",borderRadius:12,marginBottom:20,border:"1px solid #E5E7EB"}}>
              <p style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:10,marginTop:0}}>About your treatment options</p>
              <Scale q="How concerned are you about needing a repeat procedure if the first treatment doesn't fully work?" sub="Relevant if ablation is being considered — nodule regrowth may require re-treatment." lo="Not concerned" hi="Very concerned" value={P.retreatmentConcern} onChange={(v:number)=>sp("retreatmentConcern",v)}/>
              <Scale q="How important is minimizing recovery time?" lo="Not important" hi="Extremely important" value={P.recoveryTime} onChange={(v:number)=>sp("recoveryTime",v)}/>
            </div>
          )}
        </div>
      )}

      {/* ── REVIEW ── */}
      {currentStepName==="review"&&(
        <div>
          <h3 style={{fontSize:17,fontWeight:600,marginTop:0,marginBottom:18}}>Ready to generate your summary</h3>
          <div style={{padding:"15px 17px",background:"#F9FAFB",borderRadius:12,marginBottom:18,border:"1px solid #E5E7EB"}}>
            <p style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:12,marginTop:0}}>Clinical summary</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {[
                ["Diagnosis", d],
                ...(isDTC(d)?[["Cancer type",C.cancerType],["Tumor size",`${C.tumorSize} cm`],["Lymph nodes",C.lymphNodes],["BRAF",C.braf||"Not tested"]]:[]),
                ...(d==="Graves"?[["TRAb",C.trabStatus],["GO status",C.goEyeDisease],["Prior ATD",C.priorATD]]:[]),
                ...(d==="TMNG"?[["TSH",C.tshLevel],["Goiter",C.goiterSize],["Obstruction",C.obstructiveSymptoms||"None"]]:[]),
                ...(d==="AFTN"?[["TSH",C.tshLevel],["Nodule size",`${C.noduleSize} cm`],["RFA",C.rfaAvailable||"Unknown"]]:[]),
                ...(d==="Nodule"?[["Bethesda",C.bethesdaCategory],["Size",`${C.noduleSize} cm`],["RFA",C.rfaAvailable||"Unknown"]]:[]),
                ...(d==="Goiter"?[["Goiter size",C.goiterVolume],["Symptoms",C.compressiveSymptoms],["RFA",C.rfaAvailable||"Unknown"]]:[]),
                ["Age",C.age],
              ].map(([k,v]:any)=>(<div key={k} style={{padding:"7px 10px",background:"white",borderRadius:8,border:"1px solid #E5E7EB"}}><div style={{fontSize:10,color:"#9CA3AF",marginBottom:2}}>{k}</div><div style={{fontSize:13,fontWeight:500,wordBreak:"break-word" as any}}>{v||"—"}</div></div>))}
            </div>
            {isDTC(d)&&<div style={{marginTop:10,display:"flex",flexDirection:"column" as any,gap:6}}>
              {asEligible()&&<div style={{padding:"7px 10px",background:"#D1FAE5",borderRadius:8}}><span style={{fontSize:12,color:"#065F46",fontWeight:600}}>Active surveillance eligible — Zone 1 questions included</span></div>}
              {lobeEligible()&&<div style={{padding:"7px 10px",background:"#DBEAFE",borderRadius:8}}><span style={{fontSize:12,color:"#1E40AF",fontWeight:600}}>Lobectomy eligible — Zone 2 questions included</span></div>}
            </div>}
          </div>
          {error&&<div style={{padding:"11px 14px",background:"#FEF2F2",borderRadius:10,marginBottom:14,border:"1px solid #FECACA"}}><p style={{fontSize:13,color:"#B91C1C",margin:0}}>{error}</p></div>}
          <button onClick={run} disabled={loading} style={{width:"100%",padding:14,fontSize:15,fontWeight:500,borderRadius:10,border:"1px solid #E5E7EB",cursor:loading?"wait":"pointer",background:loading?"#F9FAFB":"white",color:loading?"#9CA3AF":"#111827"}}>
            {loading?"Generating your summary…":"Generate summary →"}
          </button>
          <button onClick={back} style={{marginTop:8,width:"100%",padding:11,fontSize:13,borderRadius:10,border:"1px solid #E5E7EB",cursor:"pointer",background:"white",color:"#6B7280"}}>← Back to edit</button>
        </div>
      )}

      {/* ── RESULT ── */}
      {currentStepName==="result"&&result&&(()=>{
        const sections=parseResult(result);
        const comp1=sections.find((s:any)=>s.title.includes('COMPONENT 1'));
        const comp2=sections.find((s:any)=>s.title.includes('COMPONENT 2'));
        const comp3=sections.find((s:any)=>s.title.includes('COMPONENT 3'));
        const comp4=sections.find((s:any)=>s.title.includes('COMPONENT 4'));
        return (
          <div>
            <div style={{marginBottom:18}}>
              <h3 style={{fontSize:17,fontWeight:600,margin:"0 0 4px"}}>Your personalized summary</h3>
              <p style={{fontSize:12,color:"#9CA3AF",margin:0}}>Bring this to your surgeon consultation. Generated {new Date().toLocaleDateString()}.</p>
            </div>
            {comp3&&<Card color="gray" title="Your personalized summary" content={renderMD(comp3.content)}/>}
            {comp4&&<Card color="green" title="Questions to ask your surgeon" content={renderMD(comp4.content)}/>}
            <button onClick={()=>setShowDetails((v:boolean)=>!v)} style={{width:"100%",padding:"11px 14px",marginBottom:showDetails?0:14,borderRadius:10,border:"1px solid #E5E7EB",cursor:"pointer",background:"#F9FAFB",color:"#6B7280",fontSize:13,fontWeight:500,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>How we got here</span>
              <span>{showDetails?"▲":"▼"}</span>
            </button>
            {showDetails&&<div style={{marginBottom:14}}>
              {comp1&&<Card color="blue" title="Guideline-concordant recommendation" content={renderMD(comp1.content)}/>}
              {comp2&&<Card color="amber" title="How your preferences factored in" content={renderMD(comp2.content)}/>}
            </div>}
            <div style={{padding:"12px 14px",background:"#F9FAFB",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:10}}>
              <p style={{fontSize:11,color:"#9CA3AF",margin:0,lineHeight:1.6}}>Generated by EndoGuide using 2025 ATA guidelines. Intended to prepare you for a surgeon consultation — not to replace it.</p>
            </div>
            <button onClick={resetAll} style={{width:"100%",padding:11,fontSize:13,borderRadius:10,border:"1px solid #E5E7EB",cursor:"pointer",background:"white",color:"#9CA3AF"}}>Start a new case</button>
          </div>
        );
      })()}

      {/* ── NAV ── */}
      {!["welcome","review","result"].includes(currentStepName)&&(
        <div style={{display:"flex",gap:10,marginTop:28}}>
          <button onClick={back} style={{flex:1,padding:11,fontSize:13,borderRadius:10,border:"1px solid #E5E7EB",cursor:"pointer",background:"white",color:"#6B7280"}}>← Back</button>
          <button onClick={advance} disabled={!canNext()} style={{flex:2,padding:11,fontSize:14,fontWeight:500,borderRadius:10,border:canNext()?"1px solid #E5E7EB":"1px solid #F3F4F6",cursor:canNext()?"pointer":"not-allowed",background:"white",color:canNext()?"#111827":"#D1D5DB"}}>Continue →</button>
        </div>
      )}
    </div>
  );
}
