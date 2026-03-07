stroke_from_manip_estimate.pdf contains a back-of-the-envelope calculation of an estimate of strokes from spinal manipulation. It takes into account the current number of licensed chiropractors (DC), the number of cervical manipulations provided per day (CMT), the numbers of treating days per week (Days), the number of work weeks per year (Weeks), and the commonly claimed rate of strokes from manipulations (Risk, set at 1 in 20,000). It also includes the current reported incidence of vertebral artery dissections (VAD = 1/100,000), cerebral artery dissections (CAD = 2/100,000), and the current population of the United States (Pop = 330,000,000). It then provides calculations for combined incidence of Cervical Artery Dissections (VAD + CAD) and the calculated estimate of dissections from manipulation (DC * CMT * Days * Weeks * Risk). This can then be compared to total prevalence of vertebral, cerebral, and cervical artery dissections (incidence * Pop).


# Claude Response

This is a revealing analysis precisely because it produces an absurd result when completed — and that absurdity is itself diagnostically useful. Let me work through the math first, then the critique.

## Completing the Calculation

**DC × CMT × Days × Weeks × Risk:**
75,000 × 20 × 4 × 48 × (1/20,000) = **14,400 estimated manipulation-caused strokes/year**

**Population-level CeAD incidence:**
- VAD × Pop = 3,300/year
- CAD × Pop = 6,600/year
- (VAD + CAD) × Pop = **9,900 total CeADs/year**

The model predicts manipulation causes more strokes (~14,400) than the entire annual population burden of cervical artery dissections (~9,900). This epidemiological impossibility is the starting point for critique.

---

## Missing Factors

**On the chiropractic side:**
- Not all 75,000 DCs perform cervical HVLA manipulation — many use only lumbar techniques, activator devices, or soft tissue methods
- CMT = 20 assumes every daily patient contact involves cervical manipulation; many visits are for lumbar complaints, extremity issues, or non-manipulative care
- The 75,000 figure includes inactive, retired, or administratively-employed practitioners not seeing patients
- No adjustment for osteopathic physicians (DOs), physiotherapists, and others who also perform cervical manipulation — if the concern is real, the denominator should be larger, which worsens the absurdity

**On the risk side:**
- The 1/20,000 figure has no clearly specified denominator — is this per thrust, per session, per treatment course, or per patient ever treated? This distinction changes the calculation by orders of magnitude
- No accounting for technique variation (HVLA thrust vs. low-velocity mobilisation carry very different proposed risk profiles)
- No patient-level risk stratification (age, sex, pre-existing connective tissue disorders, hypertension, oral contraceptive use — all established CeAD risk factors)
- No temporal window defined for what counts as "caused by" manipulation

**On the comparator side:**
- VAD/CAD incidence figures are widely considered underestimates — most dissections are clinically silent or misattributed, and imaging-detected rates are substantially higher
- Not all CeADs cause stroke; many resolve without neurological sequelae
- The analysis implicitly assumes all estimated manipulation strokes would be CeAD-mediated, which is not established

---

## Faulty Assumptions

**1. The 1/20,000 risk figure is the critical weakness.** This estimate derives primarily from chiropractor self-report surveys and early case series — methodologically weak sources subject to massive underreporting bias. More importantly, it assumes causation. The foundational challenge to this entire framework comes from population-based epidemiology (Cassidy et al., *Spine* 2008; Rothwell et al., *Stroke* 2001) showing that patients visiting GPs for neck pain and headache have *equivalent* rates of subsequent vertebrobasilar stroke as those visiting chiropractors. This is consistent with the hypothesis that patients experiencing a prodromal dissection seek care for its symptoms (neck pain, headache), and the consultation — whether with a chiropractor or GP — is temporally but not causally related to the stroke.

**2. Temporal association is treated as causation.** The entire model inherits this assumption uncritically. A manipulation-proximate stroke does not establish manipulation as the cause; it may establish only that the patient had a dissection in progress when they presented.

**3. The comparator is wrong.** Comparing estimated manipulation-attributable strokes to *total* CeAD incidence conflates two different things. The correct comparison would be: excess CeAD incidence in manipulation-exposed vs. unexposed individuals, controlling for healthcare-seeking behaviour and neck pain as a confounder. No case-control or cohort study to date has robustly demonstrated this excess after proper confounding adjustment.

**4. Linearity and independence are assumed.** The formula multiplies independent probabilities as if each manipulation is an independent Bernoulli trial. In reality, risk likely concentrates in a small subset of vulnerable patients (those with pre-existing arteriopathy, genetic connective tissue fragility, etc.) rather than being uniformly distributed.

**5. CMT = 20 is almost certainly an overestimate** of cervical-specific manipulations per day, as opposed to total patient contacts or total manipulations of any region.

---

## Practical Implications and Their Limitations

**What the analysis does well:**
- It provides a framework for making the scale of a claimed risk concrete and testable
- The self-defeating result (predicted burden > possible burden) is a legitimate falsification argument against the 1/20,000 estimate, or against the practice-volume assumptions, or both
- It highlights that informed consent conversations referencing "1 in 20,000" may be quoting a figure that does not survive epidemiological scrutiny

**Limitations of using this as a policy or clinical argument:**

- *It cannot distinguish between "the risk estimate is wrong" and "the practice volume estimate is wrong"* — both would rescue the model from absurdity, and both are probably somewhat true
- *It doesn't help establish the true risk*, which remains genuinely uncertain. The most intellectually honest position in the literature is that the causal risk, if it exists at all, is likely substantially lower than 1/20,000 — possibly in the range of 1/1,000,000 or lower — but cannot currently be precisely quantified due to the confounding structure of available data
- *Absence of a detectable signal is not the same as absence of risk.* Rare causally-real events can be epidemiologically invisible against a high background rate of spontaneous dissection
- *The analysis says nothing about risk-benefit tradeoff* — the appropriate clinical question is not just absolute risk but comparative effectiveness: does cervical manipulation provide meaningful benefit for the indications it is used for, and how does that weigh against even a small causal risk?

**The most defensible clinical implication** is not "manipulation is safe" or "manipulation is dangerous," but rather: the 1/20,000 figure commonly cited in informed consent and medicolegal contexts almost certainly does not represent a well-founded causal risk estimate, and the field lacks the epidemiological infrastructure to generate one. Until that infrastructure exists, shared decision-making should acknowledge this uncertainty honestly rather than anchoring to a specific number.