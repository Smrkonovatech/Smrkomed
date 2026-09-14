# Smart Discharge: Future AI Requirements

This document outlines the scope, responsibilities, and strict boundaries for AI within the Smart Discharge module. **No active AI service is connected in the current iteration.**

## 1. Core Principle: AI Assists, Doctor Decides
The fundamental tenet of the Smart Discharge module is:
> **"SmrkoMed prepares the discharge. The doctor makes the final clinical decision."**

The AI acts strictly as an advanced administrative assistant and summarizer. It must never act as a clinical decision-maker.

## 2. Permitted AI Capabilities
The AI agent supporting the discharge workflow is permitted to:
- **Summarize Records**: Condense lengthy admission notes, consultation logs, and procedure reports into a concise clinical summary draft.
- **Organize Information**: Structure unstructured data into the required discharge summary format (e.g., Chief Complaint, Course in Hospital).
- **Identify Missing Information**: Flag missing documentation that is typically expected for a given procedure (e.g., "Missing post-op vitals").
- **Highlight Inconsistencies**: Alert the user if the documented discharge medication contradicts a known allergy in the patient's record (acting as a secondary check).
- **Assist Administrative Preparation**: Extract follow-up instructions from the doctor's free-text notes and prepare them as structured data for the coordinator.

## 3. Strict AI Boundaries & Prohibitions
To ensure patient safety and maintain trust, the AI **MUST NOT**:
- **Diagnose**: Formulate new diagnoses not explicitly stated in the source documentation.
- **Prescribe**: Add, remove, or modify medications on the discharge prescription without explicit doctor instruction.
- **Determine Medical Fitness**: Calculate or claim that a patient is "medically fit" for discharge. (The "Readiness" score is strictly operational, based on checklists).
- **Independently Approve**: Trigger the final discharge workflow or sign documents on behalf of the doctor.
- **Fabricate Information**: Hallucinate or invent test results, vital signs, or patient history to fill gaps in the summary.

## 4. UI/UX Trust Markers for AI Content
The frontend consuming the AI output must strictly adhere to these display rules:
- **Distinct Visual Language**: All AI-generated text must be visually distinct (e.g., tagged with "✨ AI PREPARED").
- **Source Transparency**: Every AI-generated section must offer a link or reference back to the original source documents (Consultation Note from 18 Sep, Lab Result from 17 Sep).
- **Mandatory Doctor Review**: The UI must enforce a human-in-the-loop review process before any AI-generated draft becomes a finalized clinical document.

## 5. Information Coverage Metric
The AI will calculate an "Information Coverage" percentage. This metric represents how much of the required discharge summary structure has been successfully populated from existing records. It is **not** a "medical accuracy score" or a "confidence score" regarding patient health.
