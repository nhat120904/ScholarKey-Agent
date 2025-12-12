# 🚀 Project Name: ScholarKey AI
**Tagline:** *Your Verifiable, AI-Powered Pathway to Global Education.*

## 1. Executive Summary
ScholarKey is an autonomous AI agent system that simplifies the study abroad application process. It analyzes a user's academic profile (CV, GPA, Skills), autonomously searches for matching scholarships in real-time based on the target country/major, and generates a structured Excel plan. It leverages the **Hedera Consensus Service (HCS)** to create an immutable "Proof of Profile," ensuring the integrity of the student's data when shared with mentors or agencies.

---

## 2. Technical Stack

### **Frontend (Client Side)**
* **Framework:** **React.js** (Vite or Next.js recommended for performance).
* **Styling:** Tailwind CSS (for fast UI development).
* **State Management:** React Query (TanStack Query) for handling API data states.
* **UI Components:** Shadcn/UI or Material UI (specifically for the Data Table).
* **File Handling:** `react-dropzone` (for drag-and-drop CV upload).

### **Backend (Server Side)**
* **Framework:** **Python FastAPI** (Fast, async, and great for AI integration).
* **AI Orchestration:** **LangGraph** (To manage the workflow between reading CVs and searching web).
* **LLM:** Claude 4.5 Haiku (Best for reading PDFs and logical reasoning).
* **Search Tool:** **Tavily AI API** (Optimized for AI agents to fetch real-time scholarship data).
* **Data Processing:** `pandas` (For generating Excel files).

### **Blockchain Layer**
* **Network:** Hedera Testnet.
* **Service:** **Hedera Consensus Service (HCS)**.
* **SDK:** `hedera-sdk-py`.

---

## 3. Functional Requirements

### **Module A: Student Profile Ingestion (The Profiler)**
* **User Action:**
    * User can upload a CV/Transcript (PDF/DOCX).
    * User can manually input data via a Chat Interface (e.g., "I have a 3.8 GPA and published 2 papers").
* **System Action:**
    * **OCR & Parsing:** The system must extract key entities: `GPA`, `IELTS/TOEFL Score`, `Publications`, `Work Experience`, `Major`.
    * **Hedera Verification:** The system hashes the uploaded CV content and submits a message to HCS.
        * *Log Message:* `Timestamp | User_ID | CV_Hash: [SHA-256] | Status: Verified`.
        * *Benefit:* Creates a "Digital Stamp" proving the CV existed in this state at this time.

### **Module B: Autonomous Scholarship Search & Program Matcher (The Hunter)**
* **User Action:**
    * User selects target: **Country** (e.g., Australia), **Level** (e.g., Master's), **Major** (e.g., Data Science).
    * User specifies **Desired Field** with focus area (e.g., "Computer Science with focus on AI/Machine Learning", "Engineering with focus on Renewable Energy").
    * User chooses search mode:
        * **Search by Program:** Find all scholarships applicable if applying to a specific program at a school.
        * **Search by Scholarship:** Find all programs matching student profile and focused field that are eligible for available scholarships.

* **System Action:**

    **1. Recursive Web Crawling:**
    * The Agent performs deep, recursive crawling of scholarship web pages to extract comprehensive information:
        * **Selection Procedure:** Multi-stage process (e.g., document review → interview → final selection).
        * **Application Deadlines:** Opening and closing dates, including multiple rounds if applicable.
        * **Required Documents:** Complete list (transcripts, recommendation letters, motivation letter, portfolio, etc.).
        * **Eligible Programs List:** All specific degree programs covered by each scholarship.
        * **Award Details:** Full/partial tuition, stipend amounts, duration.
        * **Eligibility Criteria:** GPA requirements, language scores, nationality restrictions, age limits.
    * Recursively follows links to program pages, eligibility pages, and FAQ sections.
    * Stores structured data in database with scholarship-to-program relationships.

    **2. School & Study Program Database:**
    * Maintains a database of universities and their programs with:
        * Program names, levels (Bachelor's, Master's, PhD).
        * Fields of study and specialization areas.
        * Cross-reference with scholarships' allowed program lists.
        * Program-specific requirements (GPA, prerequisites, language scores).

    **3. Intelligent Search Modes:**

    **Mode A - Search Scholarships by Desired Program:**
    * User inputs: School name + Program name (e.g., "University of Melbourne - Master of AI").
    * Agent searches all scholarships where:
        * The program is on the scholarship's allowed program list.
        * User's profile meets scholarship eligibility criteria.
        * User's desired field matches program focus areas.
    * Returns: Ranked list of applicable scholarships with match scores.

    **Mode B - Search Programs by Scholarships:**
    * Agent analyzes available scholarships matching user's profile.
    * For each qualifying scholarship:
        * Searches all programs in the allowed list.
        * Filters programs matching user's desired field and focus area.
        * Checks program-specific requirements against user profile.
    * Returns: Ranked list of eligible programs grouped by scholarship, with field alignment scores.

    **4. Enhanced Filtering Logic:**
    * Multi-dimensional matching:
        * Profile requirements (GPA, test scores, publications).
        * Field alignment (major match + focus area similarity using semantic search).
        * Geographic preferences (country, region, specific schools).
        * Deadline feasibility (enough time to prepare application).
    * Eliminates scholarships/programs where user doesn't meet minimum requirements.

    **5. Fact-Checking & Verification:**
    * Agent visits scholarship URLs to verify current deadlines and requirements.
    * Cross-references program information with official university pages.
    * Flags any discrepancies or outdated information for human review.

### **Module C: Data Structuring & Export (The Consultant)**
* **User Action:**
    * User views the results in a React Table.
    * User clicks "Export to Excel".
* **System Action:**
    * **Match Score:** The AI calculates a compatibility score (0-100%) for each scholarship based on the user's profile.
    * **Excel Generation:** Backend generates a `.xlsx` file containing:
        * Scholarship Name & Provider.
        * Value (e.g., "Full Tuition + Stipend").
        * Deadline.
        * **Requirements Summary** (Summarized by AI).
        * **Match Analysis** (Why you should apply).
        * **Direct Apply Link**.
        * **Hedera Verification Link** (Link to HashScan for the search session).

---

## 4. User Flow (Frontend UX)

1.  **Onboarding:**
    * User lands on a clean React page.
    * **Step 1:** "Tell us about yourself." -> Upload CV area.

2.  **Preference Setup:**
    * **Step 2:** Enhanced form with multiple fields:
        * "Where do you want to go?" (Dropdown: USA, UK, Canada, Australia...).
        * "What level?" (Bachelor's, Master's, PhD).
        * "What is your major?" (Dropdown with search: Computer Science, Engineering, Business...).
        * **NEW:** "What is your desired field with focus?" (Text input with examples: "Computer Science with focus on AI/Machine Learning", "Engineering with focus on Sustainable Energy").
        * **NEW:** "Search Mode" (Toggle):
            * **Option 1:** "I have a program in mind" → Shows school/program selector.
            * **Option 2:** "Show me all options" → Broad search across all programs and scholarships.

3.  **Processing (The "Magic" Wait):**
    * UI shows enhanced progress bar with AI thoughts:
        * *"Reading your CV..."*
        * *"Hashing profile to Hedera Ledger..."*
        * *"Crawling scholarship databases..."*
        * *"Extracting selection procedures and deadlines..."*
        * *"Analyzing program eligibility lists..."*
        * *"Cross-referencing schools and programs..."*
        * *"Matching your AI focus with available programs..."*
        * *"Calculating compatibility scores..."*

4.  **Results Dashboard (Enhanced):**
    * **Tab View:**
        * **Tab 1 - "Scholarships":** Sortable/filterable table with 10-50 matched scholarships.
            * Columns: Name, Amount, Deadline, Match %, Eligible Programs (count), Documents Needed.
            * Expandable rows show: Selection procedure timeline, full document list, specific program matches.
        * **Tab 2 - "Programs":** Programs matching your profile and desired field.
            * Columns: School, Program Name, Field Alignment Score, Available Scholarships (count), Requirements.
            * Click to see which scholarships cover that program.
        * **Tab 3 - "Program-First Search":** If user selected a specific program.
            * Shows all scholarships applicable to that program with match scores.
    * **Filters:** By deadline, scholarship amount, field match score, document complexity.

5.  **Detailed View:**
    * Click any scholarship/program opens a modal with:
        * Complete selection procedure (stages, timeline).
        * Full document checklist.
        * Eligible programs list (if scholarship) or available scholarships (if program).
        * Application tips based on AI analysis.

6.  **Export:**
    * Button: "Download Plan (.xlsx)" with options:
        * Export scholarships only.
        * Export programs only.
        * Export combined report (scholarships + their programs).

---

## 4.5. Module B Technical Implementation Details

### **Data Models:**

```python
# Student Profile Model
{
    "user_id": "uuid",
    "gpa": 3.8,
    "test_scores": {"IELTS": 7.5, "GRE": 320},
    "major": "Computer Science",
    "desired_field": "Computer Science with focus on AI/Machine Learning",
    "publications": 2,
    "work_experience_years": 1,
    "skills": ["Python", "TensorFlow", "NLP"],
    "target_country": "Australia",
    "level": "Masters"
}

# Scholarship Model (Enhanced)
{
    "scholarship_id": "uuid",
    "name": "Melbourne AI Excellence Scholarship",
    "provider": "University of Melbourne",
    "country": "Australia",
    "value": {"type": "Full Tuition + Stipend", "amount": 35000},
    "deadlines": {
        "round_1": "2025-03-15",
        "round_2": "2025-06-30",
        "notification_date": "2025-08-15"
    },
    "selection_procedure": [
        {"stage": 1, "name": "Document Review", "duration_days": 14},
        {"stage": 2, "name": "Interview", "duration_days": 7},
        {"stage": 3, "name": "Final Decision", "duration_days": 10}
    ],
    "required_documents": [
        "Academic Transcripts",
        "CV/Resume",
        "Statement of Purpose",
        "2 Recommendation Letters",
        "IELTS/TOEFL Score",
        "Research Proposal (for PhD)"
    ],
    "eligible_programs": [
        {"program_id": "uuid", "program_name": "Master of AI", "school": "University of Melbourne"},
        {"program_id": "uuid", "program_name": "Master of Data Science", "school": "University of Melbourne"}
    ],
    "eligibility_criteria": {
        "min_gpa": 3.5,
        "min_ielts": 6.5,
        "nationality": ["Any"],
        "max_age": 35,
        "required_background": ["Computer Science", "Engineering", "Mathematics"]
    },
    "url": "https://...",
    "last_crawled": "2025-12-12"
}

# Program Model
{
    "program_id": "uuid",
    "name": "Master of Artificial Intelligence",
    "school_name": "University of Melbourne",
    "country": "Australia",
    "level": "Masters",
    "field": "Computer Science",
    "focus_areas": ["AI", "Machine Learning", "Deep Learning", "NLP"],
    "duration_years": 2,
    "requirements": {
        "min_gpa": 3.0,
        "prerequisites": ["Programming", "Mathematics"],
        "language_score": {"IELTS": 6.5, "TOEFL": 79}
    },
    "available_scholarships": ["scholarship_id_1", "scholarship_id_2"],
    "url": "https://..."
}
```

### **Recursive Crawling Algorithm:**

1. **Initial Seed:** Start with scholarship listing page.
2. **Extract Links:** Find all scholarship detail page links.
3. **Deep Crawl Each Scholarship:**
    * Parse main scholarship page for basic info.
    * Follow "Eligibility" link → Extract criteria.
    * Follow "How to Apply" link → Extract documents and procedure.
    * Follow "Eligible Programs" link → Extract program list.
    * For each program link → Crawl program page for details.
4. **Data Validation:** Cross-check extracted data with multiple sources.
5. **Storage:** Save to database with relationships (scholarship ↔ programs).
6. **Scheduling:** Re-crawl periodically to update deadlines and requirements.

### **Search & Matching Algorithms:**

**Field Similarity Scoring:**
* Use semantic embedding (e.g., Sentence-BERT) to compare:
    * User's `desired_field` vs Program's `focus_areas`.
    * User's `skills` vs Program's `prerequisites`.
* Score: 0-100% similarity.

**Profile Matching:**
* Hard filters: GPA, test scores, nationality (must meet minimum).
* Soft scoring: Publications, work experience, skill alignment (bonus points).

**Two-Way Search:**
* **Program → Scholarships:** Query scholarships where program_id in eligible_programs list + profile match.
* **Scholarship → Programs:** Query programs where scholarship_id in available_scholarships + field alignment.

---

## 5. API Endpoints Structure (Python FastAPI)

To help you code, here is the suggested API structure:

* `POST /api/upload-profile`:
    * Input: File (PDF).
    * Output: JSON `{ "gpa": 3.6, "skills": [...], "hedera_tx_id": "0.0.123@..." }`.

* `POST /api/search-scholarships`:
    * Input: `{ "profile_data": {...}, "target_country": "USA", "major": "CS", "desired_field": "Computer Science with focus on AI" }`.
    * Output: JSON List of scholarships with detailed information.

* `POST /api/search-by-program`:
    * Input: `{ "profile_data": {...}, "school_name": "University of Melbourne", "program_name": "Master of AI", "desired_field": "AI/Machine Learning" }`.
    * Output: JSON List of applicable scholarships for that specific program.

* `POST /api/search-programs-by-scholarship`:
    * Input: `{ "profile_data": {...}, "desired_field": "Computer Science with focus on AI", "target_country": "Australia" }`.
    * Output: JSON List of eligible programs grouped by scholarships with field alignment scores.

* `POST /api/crawl-scholarship`:
    * Input: `{ "scholarship_url": "https://...", "deep_crawl": true }`.
    * Output: JSON `{ "selection_procedure": [...], "deadlines": {...}, "required_documents": [...], "eligible_programs": [...], "criteria": {...} }`.

* `GET /api/search-schools`:
    * Input: Query params `?country=Australia&field=CS`.
    * Output: JSON List of schools with matching programs.

* `GET /api/search-programs`:
    * Input: Query params `?school_id=123&field=AI&level=Masters`.
    * Output: JSON List of programs at that school.

* `POST /api/export-excel`:
    * Input: List of selected scholarships/programs.
    * Output: Downloadable Blob (`.xlsx` file).
