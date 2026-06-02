# PROJECT REPORT: SentinelGate Border Intelligence & Passenger Compliance Portal
**System Architecture, Database Schema, and Technical Features**

---

## 1. Executive Summary
**SentinelGate Border Intelligence** is a state-of-the-art government-themed immigration compliance terminal and passenger check-in system. Modeled after modern digital identity frameworks such as **DigiYatra**, the application provides a secure, automated pathway for passengers to register, link upcoming flight journeys, declare travel credentials, and perform real-time facial biometric self-verification. 

For border security officers, the terminal delivers global threat alerts, automated risk indexing, an interactive geospatial flight path radar, and an immutable blockchain ledger audit log to verify passenger history without tamper vulnerability.

---

## 2. Technical Stack (Software Architecture)
The project utilizes a decoupled, serverless architecture optimized for real-time compliance tracking, client-side neural face calculations, and secure data storage:

*   **Front-End Framework**: `Next.js 16.x` (App Router architecture with Turbopack compilation).
*   **Programming Languages**: `TypeScript` (strict type-safe interface hooks) and `JavaScript` (ES6+).
*   **Database Management System (DBMS)**: `Google Cloud Firebase Firestore` (NoSQL Document database providing real-time data sync).
*   **Identity & Authentication Provider**: `Firebase Authentication` (Email & Password provider configuration).
*   **Facial Recognition Suite**: `face-api.js` (Neural network model executing client-side face detection, 68-point landmark mapping, and 128-float biometric descriptor match using SSD MobileNet V1).
*   **Geospatial Tracking**: `React Simple Maps` & `World Atlas TopoJSON` (Client-side rendering of global flight vector trajectories).
*   **Data Visualization**: `Chart.js` & `react-chartjs-2` (Real-time risk distribution ratios).
*   **Cryptographic Layer**: `CryptoJS-like SHA-256 logic` (Immutable chain hashing).
*   **Styling & Theming**: `TailwindCSS` with custom responsive layout models and military-style radar animation modules.

---

## 3. Database Design & Firestore Schema (DBMS)
To satisfy the requirements of a multi-table database system, the application is structured around **five distinct Firestore collections** (modeled as SQL tables in standard relational paradigms). These tables represent the data core of the application:

### Table/Collection 1: `users`
*   **Purpose**: Stores individual passenger profiles created upon user signup. Holds contact, travel, and registration details.
*   **Document Key**: Firebase Authentication User UID (`auth.currentUser.uid`)
*   **Schema**:
    
    | Field Name | Firestore Data Type | Description |
    | :--- | :--- | :--- |
    | `name` | `string` | Full legal name (forced to UPPERCASE) |
    | `email` | `string` | Login email address (forced to lowercase) |
    | `phone` | `string` | Contact phone number (localized to Indian `+91` format) |
    | `dob` | `string` | Passenger Date of Birth (YYYY-MM-DD format) |
    | `passport` | `string` | Passport identification number (uppercase alphanumeric) |
    | `flightNo` | `string` | Current upcoming flight code (e.g. AI-302, SG-101) |
    | `country` | `string` | Citizenship country (linked to base risk profile) |
    | `verified` | `boolean` | Flag indicating whether facial biometric selfie scan was cleared |
    | `risk` | `number` | Dynamically assessed profile risk percentage (0 to 100) |
    | `createdAt` | `string (ISO Date)` | Timestamp when the user profile was registered |

---

### Table/Collection 2: `travelers`
*   **Purpose**: Records every processed border crossing event (whether completed via passenger self-check, manual officer addition, or OCR scan). Used to render the comando command map and recent crossings.
*   **Document Key**: Auto-generated Firestore UUID
*   **Schema**:

    | Field Name | Firestore Data Type | Description |
    | :--- | :--- | :--- |
    | `name` | `string` | Full traveler name |
    | `passport` | `string` | Passport identification number |
    | `country` | `string` | Country of origin |
    | `risk` | `number` | Calculated risk index |
    | `lat` | `number` | Latitude coordinate of traveler origin (for mapping) |
    | `lng` | `number` | Longitude coordinate of traveler origin (for mapping) |
    | `verified` | `boolean` | Verification check status flag |
    | `note` | `string` | Clearance remarks (e.g., "Biometrically self-verified", watchlist alert details) |
    | `createdAt` | `string (ISO Date)` | Timestamp of border crossing event |

---

### Table/Collection 3: `threats`
*   **Purpose**: Captures and alerts officers to high-risk border crossing attempts (automatically populated whenever a traveler's risk exceeds a critical threshold of `70%`).
*   **Document Key**: Auto-generated Firestore UUID
*   **Schema**:

    | Field Name | Firestore Data Type | Description |
    | :--- | :--- | :--- |
    | `name` | `string` | Flagged traveler name |
    | `passport` | `string` | Flagged passport identifier |
    | `risk` | `number` | Risk index rating (>=70) |
    | `note` | `string` | Explanatory note (e.g., watchlist match notes) |
    | `time` | `string (Time)` | Logged time of threat occurrence |
    | `createdAt` | `string (ISO Date)` | Complete Firestore timestamp |

---

### Table/Collection 4: `audit_logs` (Blockchain Mirror)
*   **Purpose**: Stores a duplicate of the custom cryptographic blockchain ledger blocks. This acts as an audit trail of crossings that can be compared against the local chain state to detect data manipulation.
*   **Document Key**: Auto-generated Firestore UUID
*   **Schema**:

    | Field Name | Firestore Data Type | Description |
    | :--- | :--- | :--- |
    | `index` | `number` | Block number inside the ledger chain |
    | `timestamp` | `string (ISO Date)` | Block mining timestamp |
    | `hash` | `string (SHA-256)` | Cryptographic hash unique to this block |
    | `previousHash` | `string (SHA-256)` | Hash link to the preceding block |
    | `event` | `string` | Border operation event type (e.g., "TRAVELER_SELF_VERIFY") |
    | `name` | `string` | Associated traveler name |
    | `passport` | `string` | Associated passport identifier |
    | `riskScore` | `number` | Associated risk assessment index |
    | `createdAt` | `string (ISO Date)` | Time block was recorded in database |

---

### Table/Collection 5: `watchlist`
*   **Purpose**: Holds high-priority targets flagged by national and international agencies (Interpol, VIP flags). Initialized automatically with default records if Firestore detects an empty watchlist.
*   **Document Key**: Auto-generated Firestore UUID
*   **Schema**:

    | Field Name | Firestore Data Type | Description |
    | :--- | :--- | :--- |
    | `name` | `string` | Name of flagged watchlist entity |
    | `passport` | `string` | Target passport identifier |
    | `reason` | `string` | Criminal or flag reason details (e.g., "Interpol Red Notice") |
    | `riskScore` | `number` | Fixed watchlist risk value (default `100` for high risk) |
    | `createdAt` | `string (ISO Date)` | Time entry was created |

---

## 4. Algorithmic Risk Assessment Model
The system uses an automated risk scoring model to compute border security thresholds. The score is evaluated using the following mathematical formula:

$$\text{Final Risk Score} = (0.5 \times \text{Country Risk}) + (0.3 \times \text{Passport Pattern Risk}) + (0.2 \times \text{Watchlist Risk})$$

1.  **Country Risk (50%)**: Mapped coordinates lookup. Custom penalties are applied to designated high-risk conflict zones or internationally sanctioned countries (adds +50 to base country risk).
2.  **Passport Pattern Risk (30%)**: Verifies document syntax. Passports must follow standard formatting (`^[A-Z][0-9]{7}$`). Invalid formats add +80; duplicate active passports on flight pathways add +50 penalty.
3.  **Watchlist Risk (20%)**: Binary check. Returns `100` if the name/passport matches a record inside the `watchlist` Firestore collection, else `0`.

---

## 5. Security & Verification Features

### A. Real-Time Neural Facial Recognition (FRS)
*   **Framework**: Runs neural network inference locally inside the passenger's browser utilizing `face-api.js`.
*   **Flow**:
    1. The passenger is prompted to open their camera inside the dashboard.
    2. The camera streams live frames into a canvas overlay executing facial landmark extraction.
    3. The generated landmark descriptor is cryptographically compared (Euclidean Distance calculation) against target high-risk profiles loaded locally.
    4. If the distance evaluates below `0.55`, a biometric match is triggered (Risk index automatically updates to 100 and alerts the Officer Terminal in real-time).
    5. If no match is found, the user profile is updated to `verified: true` in Firestore, rendering the secure travel certificate.

### B. Machine-Readable Passport OCR Scanner
*   **Workflow**: Allows users to upload a PNG/JPG scan of their passport document.
*   **Server Link**: Relies on a lightweight local Flask python scanning route (`/scan`).
*   **Fail-Safe**: If the OCR server is offline, it executes a mock parsing fail-safe that extracts user info from the active `currentUserProfile` to avoid interrupting demo evaluations.

### C. Cryptographic Blockchain Audit Ledger
*   **Implementation**: Every check-in mines a new block linking to the previous block's SHA-256 hash.
*   **Data Consistency**: Prevents backend SQL/NoSQL injection tampering. If an attacker deletes a record inside Firestore `travelers`, the link hashes in the blockchain audit ledger will break, triggering warning flags.

### D. DigiYatra-Inspired Passenger Dashboard
*   **Simplified Sign Up**: Requires only Name, Phone, Email, and Password.
*   **Unified Interface**: No blocking forms. Passenger views their status dynamically.
*   **Inline inputs**: Passengers can add or modify passport ID, Date of Birth, Citizenship, and Flight Number inline using dynamic Forms.
*   **Link New Journey**: Supports real-life travel frequencies. Passengers can clear their active flight and verification pass to prepare for a new check-in and selfie-audit for their next upcoming journey.

### E. Officer Dossier Inspector
*   An advanced inspector interface for security agents. Clicking on a traveler row retrieves their complete identity data from Firestore (dob, contact, email, blockchain blocks) and aggregates it inside a premium inspection overlay.
