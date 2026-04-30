import { useState } from 'react';

const API_KEY =
  import.meta.env.VITE_API_KEY ||
  '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';

const SYSTEM_PROMPT = `You are EndoGuide, an AI-powered shared decision-making tool for thyroid surgical disease built by an endocrine surgery team. Your role is strictly a DECISION SUPPORT AID. You are NOT diagnostic. You do NOT recommend specific surgeons or medications.

KNOWLEDGE BASE: 2025 ATA DTC Guidelines (Ringel, Sosa et al. Thyroid 2025;35(8):841-985). 4-tier ROR: low/low-intermediate/intermediate-high/high. Separate ROR for PTC vs FTC vs OTC. Lobectomy acceptable <=4cm low-risk. Active surveillance for eligible microcarcinoma. All inputs are PRE-OPERATIVE — ETE and margin not available.

REASONING: STEP 1 verify completeness. STEP 2 determine guideline options (Strong/Conditional). STEP 3 identify zones: ZONE 1 Active Surveillance vs Surgery low-risk PTC microcarcinoma; ZONE 2 Lobectomy vs Total Thyroidectomy; ZONE 3 RAI low-intermediate risk; ZONE 4 surveillance de-escalation. STEP 4 interpret scores 1-2=low, 3=neutral, 4-5=high — flag tensions explicitly. STEP 5 output all four components.

━━━ COMPONENT 1: GUIDELINE-CONCORDANT RECOMMENDATION ━━━
[2-4 sentences. ATA risk tier. Recommendation strength STRONG/CONDITIONAL. 1-3 driving variables. Label PREFERENCE-SENSITIVE if applicable.]

━━━ COMPONENT 2: HOW YOUR PREFERENCES FACTOR IN ━━━
[Map scores to options with reasoning. Flag conflicts. State overall direction.]

━━━ COMPONENT 3: YOUR PERSONALIZED SUMMARY ━━━
[3-5 sentences, plain language, warm, you/your. Name tensions compassionately.]

━━━ COMPONENT 4: QUESTIONS TO ASK YOUR SURGEON ━━━
1. [tailored to scenario] 2. [preference conflicts] 3. [relevant risks] 4. [alternatives] 5. [recovery/surveillance]

HARD RULES: Never diagnose. Never recommend specific surgeons/medications. Never suppress tensions. Never guess missing variables. No survival stats. No unqualified cure. Warm patient-centered tone.`;

('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');
const STEPS = [
  'welcome',
  'cancer_type',
  'tumor_chars',
  'nodes_mets',
  'molecular',
  'universal_prefs',
  'dtc_prefs',
  'review',
  'result',
];

const SC = ({ label, sublabel, selected, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '12px 16px',
      marginBottom: 7,
      background: selected ? '#EFF6FF' : 'white',
      border: selected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
      borderRadius: 8,
      cursor: 'pointer',
    }}
  >
    <div
      style={{
        fontWeight: 500,
        fontSize: 14,
        color: selected ? '#1D4ED8' : '#111827',
      }}
    >
      {label}
    </div>
    {sublabel && (
      <div
        style={{
          fontSize: 12,
          color: selected ? '#3B82F6' : '#6B7280',
          marginTop: 2,
        }}
      >
        {sublabel}
      </div>
    )}
  </button>
);

const Scale = ({ q, sub, value, onChange, lo, hi }: any) => (
  <div style={{ marginBottom: 24 }}>
    <div
      style={{
        fontWeight: 500,
        fontSize: 14,
        color: '#111827',
        marginBottom: 3,
      }}
    >
      {q}
    </div>
    {sub && (
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
        {sub}
      </div>
    )}
    <div style={{ display: 'flex', gap: 7 }}>
      {[1, 2, 3, 4, 5].map((n: number) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 46,
            height: 46,
            borderRadius: 8,
            border: value === n ? '2px solid #3B82F6' : '1px solid #E5E7EB',
            background: value === n ? '#EFF6FF' : 'white',
            color: value === n ? '#1D4ED8' : '#374151',
            fontWeight: value === n ? 600 : 400,
            fontSize: 17,
            cursor: 'pointer',
          }}
        >
          {n}
        </button>
      ))}
    </div>
    <div
      style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}
    >
      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{lo}</span>
      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{hi}</span>
    </div>
  </div>
);

const YN = ({ q, sub, value, onChange }: any) => (
  <div style={{ marginBottom: 22 }}>
    <div
      style={{
        fontWeight: 500,
        fontSize: 14,
        color: '#111827',
        marginBottom: 3,
      }}
    >
      {q}
    </div>
    {sub && (
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 9 }}>
        {sub}
      </div>
    )}
    <div style={{ display: 'flex', gap: 8 }}>
      {['Yes', 'No'].map((o: string) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: '9px 26px',
            borderRadius: 8,
            border: value === o ? '2px solid #3B82F6' : '1px solid #E5E7EB',
            background: value === o ? '#EFF6FF' : 'white',
            color: value === o ? '#1D4ED8' : '#374151',
            fontWeight: value === o ? 600 : 400,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

const TI = ({ label, sub, value, onChange, ph }: any) => (
  <div style={{ marginBottom: 18 }}>
    {label && (
      <label
        style={{
          display: 'block',
          fontWeight: 500,
          fontSize: 13,
          color: '#111827',
          marginBottom: 3,
        }}
      >
        {label}
      </label>
    )}
    {sub && (
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 5 }}>
        {sub}
      </div>
    )}
    <input
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={ph || ''}
      style={{
        width: '100%',
        boxSizing: 'border-box' as any,
        padding: '9px 11px',
        fontSize: 14,
        borderRadius: 8,
        border: '1px solid #E5E7EB',
        color: '#111827',
      }}
    />
  </div>
);

const Badge = ({ role }: any) => (
  <div
    style={{
      display: 'inline-block',
      padding: '2px 9px',
      borderRadius: 6,
      marginBottom: 18,
      fontSize: 11,
      fontWeight: 600,
      background: role === 'clinician' ? '#FEF3C7' : '#D1FAE5',
      color: role === 'clinician' ? '#92400E' : '#065F46',
    }}
  >
    {role === 'clinician' ? 'Clinician section' : 'Patient section'}
  </div>
);

const Card = ({ color, title, content }: any) => {
  const styles: any = {
    green: { border: '#BBF7D0', bg: '#F0FDF4', tx: '#065F46' },
    gray: { border: '#E5E7EB', bg: '#F9FAFB', tx: '#374151' },
    blue: { border: '#BFDBFE', bg: '#EFF6FF', tx: '#1E40AF' },
    amber: { border: '#FDE68A', bg: '#FFFBEB', tx: '#92400E' },
  };
  const s = styles[color] || styles.gray;
  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 10,
        border: `1px solid ${s.border}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '9px 14px', background: s.bg }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: s.tx }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '13px 14px', background: 'white' }}>
        <div
          style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
};

const renderMD = (t: string) =>
  '<p style="margin:0">' +
  t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(
      /^> (.+)$/gm,
      '<blockquote style="margin:6px 0;padding:4px 12px;border-left:3px solid #E5E7EB;color:#6B7280;font-style:italic">$1</blockquote>'
    )
    .replace(
      /^---$/gm,
      '<hr style="border:none;border-top:1px solid #E5E7EB;margin:10px 0"/>'
    )
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br/>') +
  '</p>';

export default function EndoGuide() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [C, setC] = useState({
    cancerType: '',
    tumorSize: '',
    multifocal: '',
    lymphNodes: '',
    lymphDetails: '',
    distantMets: '',
    braf: '',
    tert: '',
    ras: '',
    retptc: '',
    multiGene: '',
    molOther: '',
    age: '',
    priorSurgery: '',
    contralateral: '',
    comorbidities: '',
  });
  const [P, setP] = useState({
    avoidSurgery: 0,
    definitive: 0,
    anxiety: 0,
    preserveThyroid: 0,
    avoidScar: 0,
    pregnancy: '',
    voice: '',
    asComfort: 0,
    asCancerAnxiety: 0,
    asAttend: '',
    lobeHormones: 0,
    lobeConcern: 0,
    lobeVoice: '',
  });
  const sc = (k: string, v: any) => setC((p: any) => ({ ...p, [k]: v }));
  const sp = (k: string, v: any) => setP((p: any) => ({ ...p, [k]: v }));

  const asEligible = () =>
    C.cancerType === 'PTC' &&
    parseFloat(C.tumorSize) <= 1.0 &&
    C.multifocal === 'Unifocal' &&
    (C.lymphNodes === 'No suspicious lymphadenopathy' ||
      C.lymphNodes === 'Not assessed') &&
    C.distantMets === 'M0';
  const lobeEligible = () =>
    (C.cancerType === 'PTC' || C.cancerType === 'FTC') &&
    parseFloat(C.tumorSize) <= 4.0 &&
    C.lymphNodes === 'No suspicious lymphadenopathy' &&
    C.distantMets === 'M0' &&
    C.contralateral !== 'Disease requiring surgery';

  const canNext = () => {
    const s = STEPS[step];
    if (s === 'cancer_type') return C.cancerType !== '';
    if (s === 'tumor_chars') return C.tumorSize !== '' && C.multifocal !== '';
    if (s === 'nodes_mets') return C.lymphNodes !== '' && C.distantMets !== '';
    if (s === 'molecular') return C.age !== '';
    if (s === 'universal_prefs')
      return (
        P.avoidSurgery > 0 &&
        P.definitive > 0 &&
        P.anxiety > 0 &&
        P.preserveThyroid > 0 &&
        P.avoidScar > 0 &&
        P.pregnancy !== ''
      );
    if (s === 'dtc_prefs') {
      if (
        asEligible() &&
        (P.asComfort === 0 || P.asCancerAnxiety === 0 || P.asAttend === '')
      )
        return false;
      if (lobeEligible() && (P.lobeHormones === 0 || P.lobeConcern === 0))
        return false;
      return true;
    }
    return true;
  };

  const buildIntake = () =>
    [
      'PATIENT INTAKE — THYROID DECISION SUPPORT (PRE-OPERATIVE)',
      '',
      'DISEASE: Differentiated Thyroid Cancer — Confirmed malignancy (Bethesda VI)',
      '',
      'NOTE: All data pre-operative. ETE and margin not available.',
      '--- CLINICAL VARIABLES ---',
      `Cancer type: ${C.cancerType}`,
      `Tumor size: ${C.tumorSize} cm`,
      `Multifocality: ${C.multifocal}`,
      `Lymph nodes (pre-op US): ${C.lymphNodes}${
        C.lymphDetails ? ' — ' + C.lymphDetails : ''
      }`,
      `Distant metastases: ${C.distantMets}`,
      `Age: ${C.age}`,
      `Prior surgery/radiation: ${C.priorSurgery || 'None'}`,
      `Contralateral lobe: ${C.contralateral || 'Normal'}`,
      `Comorbidities: ${C.comorbidities || 'None'}`,
      '--- MOLECULAR MARKERS ---',
      `BRAF V600E: ${C.braf || 'Not tested'}`,
      `TERT: ${C.tert || 'Not tested'}`,
      `RET/PTC: ${C.retptc || 'Not tested'}`,
      `RAS: ${C.ras || 'Not tested'}`,
      `Multi-gene panel: ${C.multiGene || 'Not performed'}`,
      C.molOther ? `Other: ${C.molOther}` : null,
      '--- PATIENT PREFERENCES ---',
      `Avoid surgery (1-5): ${P.avoidSurgery}`,
      `Definitive treatment (1-5): ${P.definitive}`,
      `Anxiety (1-5): ${P.anxiety}`,
      `Preserve thyroid (1-5): ${P.preserveThyroid}`,
      `Avoid scar (1-5): ${P.avoidScar}`,
      `Pregnancy plans 6mo: ${P.pregnancy}`,
      `Voice/lifestyle: ${P.voice || 'None'}`,
      ...(asEligible()
        ? [
            `AS comfort (1-5): ${P.asComfort}`,
            `AS cancer anxiety (1-5): ${P.asCancerAnxiety}`,
            `AS attend appointments: ${P.asAttend}`,
          ]
        : []),
      ...(lobeEligible()
        ? [
            `Lobe avoid hormones (1-5): ${P.lobeHormones}`,
            `Lobe contralateral concern (1-5): ${P.lobeConcern}`,
            `Lobe voice: ${P.lobeVoice || 'None'}`,
          ]
        : []),
      '',
      `Date: ${new Date().toLocaleDateString()}`,
    ]
      .filter((l: any) => l !== null)
      .join('\n');

  const run = async () => {
    setLoading(true);
    setError(null);
    setShowDetails(false);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1800,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildIntake() }],
        }),
      });
      const d = await r.json();
      const t = d.content?.map((b: any) => b.text || '').join('') || '';
      if (!t) throw new Error('Empty');
      setResult(t);
      setStep(STEPS.indexOf('result'));
    } catch (e) {
      setError('Unable to connect. Please check your API key and try again.');
    }
    setLoading(false);
  };

  const parseResult = (txt: string) => {
    const parts = txt.split(/━━━\s*(COMPONENT \d+:[^━\n]+)\s*━━━/);
    const out: any[] = [];
    for (let i = 1; i < parts.length; i += 2)
      out.push({ title: parts[i].trim(), content: parts[i + 1]?.trim() || '' });
    return out.length ? out : [{ title: 'Analysis', content: txt }];
  };

  const pct = Math.round((step / 7) * 100);
  const resetAll = () => {
    setStep(0);
    setC({
      cancerType: '',
      tumorSize: '',
      multifocal: '',
      lymphNodes: '',
      lymphDetails: '',
      distantMets: '',
      braf: '',
      tert: '',
      ras: '',
      retptc: '',
      multiGene: '',
      molOther: '',
      age: '',
      priorSurgery: '',
      contralateral: '',
      comorbidities: '',
    });
    setP({
      avoidSurgery: 0,
      definitive: 0,
      anxiety: 0,
      preserveThyroid: 0,
      avoidScar: 0,
      pregnancy: '',
      voice: '',
      asComfort: 0,
      asCancerAnxiety: 0,
      asAttend: '',
      lobeHormones: 0,
      lobeConcern: 0,
      lobeVoice: '',
    });
    setResult(null);
    setShowDetails(false);
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '2rem 1rem',
        fontFamily: 'system-ui,sans-serif',
        color: '#111827',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            marginBottom: 3,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 600 }}>EndoGuide</span>
          <span
            style={{
              fontSize: 12,
              color: '#6B7280',
              padding: '2px 7px',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
            }}
          >
            Beta · Thyroid
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
          Endocrine surgery shared decision support
        </p>
      </div>

      {step > 0 && step < 8 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              Step {step} of 7
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: '#F3F4F6', borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: '#3B82F6',
                borderRadius: 2,
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {STEPS[step] === 'welcome' && (
        <div>
          <div
            style={{
              padding: '18px 20px',
              background: '#F9FAFB',
              borderRadius: 12,
              marginBottom: 20,
              border: '1px solid #E5E7EB',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
              How this works
            </p>
            <p
              style={{
                fontSize: 13,
                color: '#6B7280',
                margin: '0 0 14px',
                lineHeight: 1.65,
              }}
            >
              For patients with a confirmed thyroid cancer diagnosis preparing
              for surgery. A clinician fills in your medical details first. Then
              you answer questions about what matters most to you. Together
              these generate a personalized summary to bring to your surgeon.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  padding: '9px 13px',
                  background: '#FEF3C7',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#92400E',
                    marginBottom: 2,
                  }}
                >
                  Clinician section
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  Medical details, imaging, molecular results
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '9px 13px',
                  background: '#D1FAE5',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#065F46',
                    marginBottom: 2,
                  }}
                >
                  Patient section
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  Your values and priorities
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '12px 14px',
              background: '#FEF2F2',
              borderRadius: 12,
              marginBottom: 24,
              border: '1px solid #FECACA',
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: '#B91C1C',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Decision support only — does not replace clinical judgment or
              surgeon consultation. No information stored.
            </p>
          </div>
          <button
            onClick={() => setStep(1)}
            style={{
              width: '100%',
              padding: 13,
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              background: 'white',
            }}
          >
            Begin →
          </button>
        </div>
      )}

      {STEPS[step] === 'cancer_type' && (
        <div>
          <Badge role="clinician" />
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            Cancer type
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
            Select the confirmed diagnosis. PTC variant is determined on final
            pathology and not required here.
          </p>
          {[
            {
              v: 'PTC',
              l: 'Papillary thyroid carcinoma (PTC)',
              s: 'Confirmed on FNA cytology',
            },
            { v: 'FTC', l: 'Follicular thyroid carcinoma (FTC)', s: '' },
            {
              v: 'OTC',
              l: 'Oncocytic thyroid carcinoma (OTC / Hürthle cell)',
              s: '',
            },
          ].map((o: any) => (
            <SC
              key={o.v}
              label={o.l}
              sublabel={o.s}
              selected={C.cancerType === o.v}
              onClick={() => sc('cancerType', o.v)}
            />
          ))}
        </div>
      )}

      {STEPS[step] === 'tumor_chars' && (
        <div>
          <Badge role="clinician" />
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            Tumor characteristics
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
            Based on pre-operative ultrasound.
          </p>
          <TI
            label="Tumor size (cm)"
            sub="Largest dimension on ultrasound"
            value={C.tumorSize}
            onChange={(v: string) => sc('tumorSize', v)}
            ph="e.g. 1.2"
          />
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 7 }}>
              Multifocality on ultrasound
            </p>
            {[
              { v: 'Unifocal', s: 'Single lesion' },
              { v: 'Multifocal — 2 foci', s: 'Two separate lesions' },
              { v: 'Multifocal — 3+ foci', s: 'Three or more lesions' },
            ].map((o: any) => (
              <SC
                key={o.v}
                label={o.v}
                sublabel={o.s}
                selected={C.multifocal === o.v}
                onClick={() => sc('multifocal', o.v)}
              />
            ))}
          </div>
        </div>
      )}

      {STEPS[step] === 'nodes_mets' && (
        <div>
          <Badge role="clinician" />
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            Lymph node staging & metastases
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
            Based on pre-operative ultrasound neck staging.
          </p>
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 7 }}>
              Lymph node status on pre-op ultrasound
            </p>
            {[
              {
                v: 'No suspicious lymphadenopathy',
                s: 'No suspicious nodes on staging ultrasound',
              },
              {
                v: 'Suspicious central nodes (level VI)',
                s: 'Suspicious nodes in central compartment',
              },
              {
                v: 'Suspicious lateral nodes (levels II–V)',
                s: 'Suspicious nodes in lateral compartment',
              },
              {
                v: 'Suspicious central and lateral nodes',
                s: 'Multilevel suspicious lymphadenopathy',
              },
              { v: 'Not assessed', s: 'Neck ultrasound not yet performed' },
            ].map((o: any) => (
              <SC
                key={o.v}
                label={o.v}
                sublabel={o.s}
                selected={C.lymphNodes === o.v}
                onClick={() => sc('lymphNodes', o.v)}
              />
            ))}
          </div>
          {C.lymphNodes.includes('Suspicious') && (
            <TI
              label="Node details"
              sub="Size (mm), number of nodes, extranodal extension on imaging"
              value={C.lymphDetails}
              onChange={(v: string) => sc('lymphDetails', v)}
              ph="e.g. 2 central nodes, largest 12mm"
            />
          )}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
              Distant metastases
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 7 }}>
              On pre-operative staging imaging
            </p>
            {[
              { v: 'M0', s: 'No distant metastases on staging' },
              { v: 'M1', s: 'Distant metastases identified' },
              { v: 'Not staged', s: 'Staging imaging not yet performed' },
            ].map((o: any) => (
              <SC
                key={o.v}
                label={o.v}
                sublabel={o.s}
                selected={C.distantMets === o.v}
                onClick={() => sc('distantMets', o.v)}
              />
            ))}
          </div>
        </div>
      )}

      {STEPS[step] === 'molecular' && (
        <div>
          <Badge role="clinician" />
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            Molecular markers & patient factors
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
            From FNA reflex testing or multi-gene panel, if performed.
          </p>
          {[
            { k: 'braf', l: 'BRAF V600E', s: 'Often reflexed on PTC FNA' },
            {
              k: 'tert',
              l: 'TERT promoter mutation',
              s: 'BRAF+TERT co-mutation significantly upgrades recurrence risk',
            },
            { k: 'retptc', l: 'RET/PTC rearrangement', s: '' },
            { k: 'ras', l: 'RAS mutation (NRAS/HRAS/KRAS)', s: '' },
          ].map(({ k, l, s }: any) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
                {l}
              </p>
              {s && (
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 7 }}>
                  {s}
                </p>
              )}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as any }}>
                {['Positive', 'Negative', 'Not tested'].map((v: string) => (
                  <SC
                    key={v}
                    label={v}
                    selected={(C as any)[k] === v}
                    onClick={() => sc(k, v)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
              Multi-gene panel result
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 7 }}>
              Afirma GSC, ThyroSeq v3, or similar — if performed
            </p>
            {[
              { v: 'Not performed', s: '' },
              { v: 'Benign / low risk', s: 'e.g. Afirma Benign' },
              { v: 'Indeterminate', s: '' },
              {
                v: 'Suspicious / high risk',
                s: 'e.g. Afirma Suspicious, ThyroSeq high-risk mutation',
              },
            ].map((o: any) => (
              <SC
                key={o.v}
                label={o.v}
                sublabel={o.s}
                selected={C.multiGene === o.v}
                onClick={() => sc('multiGene', o.v)}
              />
            ))}
          </div>
          <TI
            label="Other molecular findings"
            sub="Leave blank if none"
            value={C.molOther}
            onChange={(v: string) => sc('molOther', v)}
            ph="e.g. ALK rearrangement positive"
          />
          <div
            style={{
              borderTop: '1px solid #E5E7EB',
              paddingTop: 18,
              marginTop: 6,
            }}
          >
            <TI
              label="Patient age"
              value={C.age}
              onChange={(v: string) => sc('age', v)}
              ph="e.g. 42"
            />
            <TI
              label="Prior neck surgery or radiation"
              sub="Leave blank if none"
              value={C.priorSurgery}
              onChange={(v: string) => sc('priorSurgery', v)}
              ph="e.g. Prior hemithyroidectomy 2019"
            />
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 7 }}>
                Contralateral lobe on ultrasound
              </p>
              {[
                'Normal',
                'Benign nodule(s) — Bethesda II',
                'Indeterminate nodule(s) — Bethesda III/IV',
                'Suspicious nodule(s) — Bethesda V/VI',
                'Disease requiring surgery',
              ].map((v: string) => (
                <SC
                  key={v}
                  label={v}
                  selected={C.contralateral === v}
                  onClick={() => sc('contralateral', v)}
                />
              ))}
            </div>
            <TI
              label="Significant comorbidities"
              sub="Leave blank if none"
              value={C.comorbidities}
              onChange={(v: string) => sc('comorbidities', v)}
              ph="e.g. Well-controlled hypertension"
            />
          </div>
        </div>
      )}

      {STEPS[step] === 'universal_prefs' && (
        <div>
          <Badge role="patient" />
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            What matters most to you
          </h3>
          <p
            style={{
              fontSize: 13,
              color: '#6B7280',
              marginBottom: 22,
              lineHeight: 1.65,
            }}
          >
            No right or wrong answers. These help us understand your priorities.
          </p>
          <Scale
            q="How important is it to avoid surgery if other options exist?"
            lo="Not important"
            hi="Extremely important"
            value={P.avoidSurgery}
            onChange={(v: number) => sp('avoidSurgery', v)}
          />
          <Scale
            q="How important is having a definitive, once-and-done treatment rather than ongoing monitoring?"
            lo="Not important"
            hi="Extremely important"
            value={P.definitive}
            onChange={(v: number) => sp('definitive', v)}
          />
          <Scale
            q="How anxious are you about your diagnosis day-to-day?"
            lo="Very low anxiety"
            hi="Very high anxiety"
            value={P.anxiety}
            onChange={(v: number) => sp('anxiety', v)}
          />
          <Scale
            q="How important is preserving your thyroid and avoiding a daily thyroid hormone pill?"
            lo="Not important"
            hi="Extremely important"
            value={P.preserveThyroid}
            onChange={(v: number) => sp('preserveThyroid', v)}
          />
          <Scale
            q="How important is avoiding a visible scar on your neck?"
            lo="Not important"
            hi="Extremely important"
            value={P.avoidScar}
            onChange={(v: number) => sp('avoidScar', v)}
          />
          <YN
            q="Are you planning to become pregnant within the next 6 months?"
            value={P.pregnancy}
            onChange={(v: string) => sp('pregnancy', v)}
          />
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontWeight: 500,
                fontSize: 13,
                color: '#111827',
                marginBottom: 3,
              }}
            >
              Do you have any voice-related occupation or professional concerns?
            </label>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 7 }}>
              e.g. singer, teacher, actor, public speaker — or leave blank
            </p>
            <textarea
              value={P.voice}
              onChange={(e: any) => sp('voice', e.target.value)}
              placeholder="Describe here, or leave blank"
              rows={2}
              style={{
                width: '100%',
                boxSizing: 'border-box' as any,
                padding: '9px 11px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                resize: 'vertical' as any,
              }}
            />
          </div>
        </div>
      )}

      {STEPS[step] === 'dtc_prefs' && (
        <div>
          <Badge role="patient" />
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            A few more questions
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
            Based on your medical details, these are specifically relevant to
            your case.
          </p>
          {asEligible() && (
            <div
              style={{
                padding: '15px 17px',
                background: '#F9FAFB',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid #E5E7EB',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6B7280',
                  marginBottom: 10,
                  marginTop: 0,
                }}
              >
                About watchful waiting (active surveillance)
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  marginBottom: 16,
                  lineHeight: 1.65,
                }}
              >
                Your details suggest you may be eligible to monitor your cancer
                with regular ultrasounds instead of surgery right away.
              </p>
              <Scale
                q="How comfortable are you with not having surgery if monitoring is considered safe?"
                lo="Very uncomfortable"
                hi="Very comfortable"
                value={P.asComfort}
                onChange={(v: number) => sp('asComfort', v)}
              />
              <Scale
                q="How concerned are you about living with a known cancer that hasn't been removed?"
                lo="Not concerned"
                hi="Very concerned"
                value={P.asCancerAnxiety}
                onChange={(v: number) => sp('asCancerAnxiety', v)}
              />
              <YN
                q="Can you reliably attend regular ultrasound appointments every 6–12 months?"
                value={P.asAttend}
                onChange={(v: string) => sp('asAttend', v)}
              />
            </div>
          )}
          {lobeEligible() && (
            <div
              style={{
                padding: '15px 17px',
                background: '#F9FAFB',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid #E5E7EB',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6B7280',
                  marginBottom: 10,
                  marginTop: 0,
                }}
              >
                About the extent of surgery
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  marginBottom: 16,
                  lineHeight: 1.65,
                }}
              >
                Your details suggest removing only half your thyroid (lobectomy)
                may be an option rather than the whole gland.
              </p>
              <Scale
                q="How important is it to avoid taking a daily thyroid pill for the rest of your life?"
                sub="Removing only half the thyroid may let the remaining half work on its own."
                lo="Not important"
                hi="Extremely important"
                value={P.lobeHormones}
                onChange={(v: number) => sp('lobeHormones', v)}
              />
              <Scale
                q="How concerned are you about cancer potentially coming back on the other side if only half is removed?"
                lo="Not concerned"
                hi="Very concerned"
                value={P.lobeConcern}
                onChange={(v: number) => sp('lobeConcern', v)}
              />
              <div style={{ marginBottom: 6 }}>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#111827',
                    marginBottom: 3,
                  }}
                >
                  Voice-related occupation or concerns?
                </label>
                <textarea
                  value={P.lobeVoice}
                  onChange={(e: any) => sp('lobeVoice', e.target.value)}
                  placeholder="e.g. Professional singer — or leave blank"
                  rows={2}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box' as any,
                    padding: '9px 11px',
                    fontSize: 13,
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    resize: 'vertical' as any,
                  }}
                />
              </div>
            </div>
          )}
          {!asEligible() && !lobeEligible() && (
            <div
              style={{
                padding: '14px 16px',
                background: '#F9FAFB',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  margin: 0,
                  lineHeight: 1.65,
                }}
              >
                Based on the clinical details entered, your case will be
                analyzed using standard guidelines. Your preference responses
                are included in full.
              </p>
            </div>
          )}
        </div>
      )}

      {STEPS[step] === 'review' && (
        <div>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 18,
            }}
          >
            Ready to generate your summary
          </h3>
          <div
            style={{
              padding: '15px 17px',
              background: '#F9FAFB',
              borderRadius: 12,
              marginBottom: 18,
              border: '1px solid #E5E7EB',
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#6B7280',
                marginBottom: 12,
                marginTop: 0,
              }}
            >
              Clinical summary
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 7,
              }}
            >
              {[
                ['Cancer type', C.cancerType],
                ['Tumor size', `${C.tumorSize} cm`],
                ['Lymph nodes', C.lymphNodes],
                ['Distant mets', C.distantMets],
                ['BRAF', C.braf || 'Not tested'],
                ['Age', C.age],
              ].map(([k, v]: any) => (
                <div
                  key={k}
                  style={{
                    padding: '7px 10px',
                    background: 'white',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div
                    style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}
                  >
                    {k}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {v || '—'}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                flexDirection: 'column' as any,
                gap: 6,
              }}
            >
              {asEligible() && (
                <div
                  style={{
                    padding: '7px 10px',
                    background: '#D1FAE5',
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#065F46', fontWeight: 600 }}
                  >
                    Active surveillance eligible — Zone 1 questions included
                  </span>
                </div>
              )}
              {lobeEligible() && (
                <div
                  style={{
                    padding: '7px 10px',
                    background: '#DBEAFE',
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#1E40AF', fontWeight: 600 }}
                  >
                    Lobectomy eligible — Zone 2 questions included
                  </span>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div
              style={{
                padding: '11px 14px',
                background: '#FEF2F2',
                borderRadius: 10,
                marginBottom: 14,
                border: '1px solid #FECACA',
              }}
            >
              <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>
                {error}
              </p>
            </div>
          )}
          <button
            onClick={run}
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              cursor: loading ? 'wait' : 'pointer',
              background: loading ? '#F9FAFB' : 'white',
              color: loading ? '#9CA3AF' : '#111827',
            }}
          >
            {loading ? 'Generating your summary…' : 'Generate summary →'}
          </button>
          <button
            onClick={() => setStep((s: number) => s - 1)}
            style={{
              marginTop: 8,
              width: '100%',
              padding: 11,
              fontSize: 13,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              background: 'white',
              color: '#6B7280',
            }}
          >
            ← Back to edit
          </button>
        </div>
      )}

      {STEPS[step] === 'result' && result && (
        <div>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 4px' }}>
              Your personalized summary
            </h3>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
              Bring this to your surgeon consultation. Generated{' '}
              {new Date().toLocaleDateString()}.
            </p>
          </div>
          {(() => {
            const sections = parseResult(result);
            const comp1 = sections.find((s: any) =>
              s.title.includes('COMPONENT 1')
            );
            const comp2 = sections.find((s: any) =>
              s.title.includes('COMPONENT 2')
            );
            const comp3 = sections.find((s: any) =>
              s.title.includes('COMPONENT 3')
            );
            const comp4 = sections.find((s: any) =>
              s.title.includes('COMPONENT 4')
            );
            return (
              <>
                {comp3 && (
                  <Card
                    color="gray"
                    title="Your personalized summary"
                    content={renderMD(comp3.content)}
                  />
                )}
                {comp4 && (
                  <Card
                    color="green"
                    title="Questions to ask your surgeon"
                    content={renderMD(comp4.content)}
                  />
                )}
                <button
                  onClick={() => setShowDetails((v: boolean) => !v)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    marginBottom: showDetails ? 0 : 14,
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    background: '#F9FAFB',
                    color: '#6B7280',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>How we got here</span>
                  <span>{showDetails ? '▲' : '▼'}</span>
                </button>
                {showDetails && (
                  <div style={{ marginBottom: 14 }}>
                    {comp1 && (
                      <Card
                        color="blue"
                        title="Guideline-concordant recommendation"
                        content={renderMD(comp1.content)}
                      />
                    )}
                    {comp2 && (
                      <Card
                        color="amber"
                        title="How your preferences factored in"
                        content={renderMD(comp2.content)}
                      />
                    )}
                  </div>
                )}
              </>
            );
          })()}
          <div
            style={{
              padding: '12px 14px',
              background: '#F9FAFB',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              marginBottom: 10,
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: '#9CA3AF',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Generated by EndoGuide using 2025 ATA guidelines. Intended to
              prepare you for a surgeon consultation — not to replace it.
            </p>
          </div>
          <button
            onClick={resetAll}
            style={{
              width: '100%',
              padding: 11,
              fontSize: 13,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              background: 'white',
              color: '#9CA3AF',
            }}
          >
            Start a new case
          </button>
        </div>
      )}

      {!['welcome', 'review', 'result'].includes(STEPS[step]) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button
            onClick={() => setStep((s: number) => s - 1)}
            style={{
              flex: 1,
              padding: 11,
              fontSize: 13,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              background: 'white',
              color: '#6B7280',
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => setStep((s: number) => s + 1)}
            disabled={!canNext()}
            style={{
              flex: 2,
              padding: 11,
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 10,
              border: canNext() ? '1px solid #E5E7EB' : '1px solid #F3F4F6',
              cursor: canNext() ? 'pointer' : 'not-allowed',
              background: 'white',
              color: canNext() ? '#111827' : '#D1D5DB',
            }}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
