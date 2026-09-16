# Virtual Internship Completion Report
## Infosys Springboard | Virtual Internship Portal

---

### Details
- **Project Title:** Intelligent Cognitive Alarm Platform
- **Batch Number:** 02
- **Start Date:** 15 July, 2026
- **Name:** Rachana D N
- **Mentor:** Alekhya Reddy
- **Internship Duration:** 8 Weeks
- **Live Production URL:** [https://ai-cognitive-alarm-platform.vercel.app/](https://ai-cognitive-alarm-platform.vercel.app/)

---

### 1. Project Title
**Intelligent Cognitive Alarm Platform**

---

### 2. Project Objective
The objective of this project was to design and build an AI-powered Intelligent Cognitive Alarm Platform that helps users develop consistent wake-up habits by requiring them to solve personalized puzzles, riddles, memory challenges, logic problems, or math exercises before an alarm can be dismissed. The platform adapts challenge difficulty based on user behavior, wake-up performance, snooze patterns, sleep schedules, and cognitive engagement levels, with the goal of improving productivity, reducing oversleeping, and encouraging healthy sleep routines. The solution was designed for students, professionals, fitness enthusiasts, productivity-focused individuals, and wellness platforms.

---

### 3. Project Description in Detail
The Intelligent Cognitive Alarm Platform is a full-stack application that turns the simple act of dismissing an alarm into an opportunity to build better habits. Instead of a basic snooze/dismiss toggle, the platform requires users to correctly solve a cognitive challenge — drawn from math problems, logic puzzles, memory challenges, word games, pattern recognition tasks, riddles, or quick quizzes — before the alarm can be turned off. Challenges are personalized to each user and adapt in real time based on how consistently the user wakes up, how often they snooze, and how accurately and quickly they complete challenges.

Users can manage sleep schedules, wake-up goals, and productivity preferences through their profile, and set up daily, weekday, weekend, one-time, or smart adaptive alarms. Behind the scenes, a behavioral analytics engine tracks snooze patterns and wake-up consistency, an adaptive difficulty engine adjusts challenge complexity across five levels (Beginner to Expert), and a habit scoring engine combines wake-up consistency, challenge completion, snooze reduction, and sleep-schedule adherence into a single habit score. A recommendation engine then uses this data to suggest sleep, wake-up, and productivity improvements tailored to the user.

Three role-based dashboards were built on top of this data: a **User Dashboard** showing alarm history, wake-up statistics, habit score, and challenge performance; a **Wellness Coach Dashboard** for monitoring user behavior and habit adherence trends; and an **Admin Dashboard** for user management and platform-level analytics.

#### Approach Used
The platform follows a modular, service-oriented architecture. On the frontend, users create alarms and set preferences through a responsive web interface (with companion mobile app support). On the backend, a FastAPI service handles authentication, alarm scheduling, and challenge generation. When an alarm triggers, the Cognitive Challenge Engine selects a challenge type and difficulty level suited to the user's current performance profile. Once the user submits an answer, the Wake-Up Verification Module validates the response before the alarm can be dismissed, and the result is logged by the Behavioral Analytics Engine. The Adaptive Difficulty Engine periodically re-evaluates each user's performance history to raise or lower challenge difficulty, while the Habit Scoring Engine recalculates the user's weighted habit score and feeds it to the Recommendation Engine for personalized suggestions.

---

### 4. Technologies Used

- **Frontend:** Responsive web frontend built using JavaScript, HTML5, Jinja2, and Tailwind CSS, with companion mobile application architecture using React Native so that alarms and challenges work natively across devices.
- **Backend:** Implemented in Python using the FastAPI framework to expose RESTful APIs for authentication, alarm management, and challenge delivery. JWT-based authentication with OAuth2 login was used to secure user accounts, along with role-based access control (RBAC) for the User, Wellness Coach, and Administrator roles. Mangum adapter enabled serverless execution.
- **Database:** PostgreSQL used as primary relational database for structured data such as user profiles, alarms, and habit scores (with SQLite Write-Ahead Logging for local and serverless execution), alongside document and event logging for challenge and behavioral event data.
- **AI, Machine Learning and Adaptive Intelligence:** Adaptive difficulty and recommendation systems built using Scikit-learn, XGBoost, TensorFlow, and PyTorch for model development, with Pandas and NumPy for data processing. Reinforcement learning techniques explored for difficulty adaptation, alongside behavioral analytics models and recommendation system logic to personalize challenges and suggestions. Gemini LLM integrated for dynamic, fresh cognitive question generation.
- **Mobile & Notification Services:** Firebase Cloud Messaging (FCM) for push notifications, together with Android Alarm Manager and iOS Local Notifications frameworks to ensure alarms and reminders fire reliably.
- **Other Libraries, Tools and Deployment:** Tailwind CSS for styling, Chart.js and Plotly for analytics visualizations on the dashboards, and JWT for authentication. Development and version control carried out using VS Code, Git, and GitHub, with Postman used for API testing. The completed application was deployed using **Vercel** ([https://ai-cognitive-alarm-platform.vercel.app/](https://ai-cognitive-alarm-platform.vercel.app/)).

---

### 5. Timeline Overview

| Week | Activities Planned | Activities Completed |
| :--- | :--- | :--- |
| **Week 1** | Project induction, environment setup, and requirement understanding. | Attended induction session, understood project requirements, and set up the frontend and backend development environment. |
| **Week 2** | Design system architecture, database schema, and implement authentication. (Milestone 1 Review) | Designed the system architecture and database schema, implemented JWT-based authentication with role-based access, and built the alarm scheduling module. |
| **Week 3** | Build the cognitive challenge engine and puzzle generation workflows. | Implemented the cognitive challenge engine supporting math problems, logic puzzles, memory challenges, and riddles, with challenge validation logic. |
| **Week 4** | Develop wake-up verification and challenge evaluation system. (Milestone 2 Review) | Built the wake-up verification module with multi-step and time-based challenge checks, and integrated challenge performance tracking. |
| **Week 5** | Implement the adaptive difficulty engine and behavioral analytics. | Developed the adaptive difficulty engine that adjusts challenge complexity based on user performance, and began behavioral analytics tracking (snooze patterns, wake-up trends). |
| **Week 6** | Build habit scoring model and recommendation engine. (Milestone 3 Review) | Implemented the weighted habit scoring model and the recommendation engine for personalized sleep and productivity suggestions. |
| **Week 7** | Build dashboards, notifications, and reports; UI verification and testing. | Developed user, wellness-coach, and admin dashboards, added the notification and reminder system, and carried out UI verification and functional testing. |
| **Week 8** | Final integration, testing, deployment, and documentation. | Completed end-to-end integration testing, deployed the application on Vercel, and finalized the presentation and internship report. |

---

### 5a. Key Milestones

| Milestone | Description | Date Achieved |
| :--- | :--- | :--- |
| **Project Kickoff** | Attended the kick-off session, understood project requirements, and completed the initial project setup. | 17 July |
| **Prototype / First Draft** | Implemented authentication, alarm scheduling, and the initial cognitive challenge engine. | 4 August |
| **Mid-Term Review** | Completed the wake-up verification module, adaptive difficulty engine, and behavioral analytics workflows. | 14 August |
| **Final Submission** | Developed the frontend and backend, implemented habit scoring, the recommendation engine, and dashboards; deployed the application on Vercel. | 28 August |
| **Presentation** | Prepared the project presentation, demonstrated the application, and explained the implementation and outcomes. | 14 Sept |

---

### 5b. Project Execution Details

#### Requirement Analysis
Development began by identifying the behaviors that make it hard for people to build consistent wake-up habits — easy snoozing, low accountability, and a lack of personalized feedback. Based on this, features such as adaptive cognitive challenges, wake-up verification, behavioral analytics, habit scoring, and personalized recommendations were finalized and split into functional modules for systematic development and testing.

#### System Design
The platform follows a layered architecture consisting of a presentation layer (HTML5, Tailwind CSS, Jinja2, Chart.js), an application layer (FastAPI backend organized into routers, services, schemas, and models with Mangum serverless adapter), and a data and intelligence layer (PostgreSQL, SQLite, and machine learning components powering the adaptive difficulty and recommendation engines).

#### Authentication and Access Control
Secure authentication was implemented using JWT tokens with OAuth2 login support. Role-based access control was applied across the User, Wellness Coach, and Administrator roles so that each role sees only the dashboards and data relevant to it.

#### Cognitive Challenge Engine and Verification
The challenge engine generates and validates math problems, logic puzzles, memory challenges, word games, pattern-recognition tasks, riddles, and quick quizzes. The Wake-Up Verification Module layers on top of this with puzzle completion checks, multi-step challenges, consecutive correct-answer requirements, time-based challenges, and cognitive accuracy checks, so an alarm can only be dismissed once the user has genuinely engaged with the challenge.

#### Adaptive Difficulty and Behavioral Analytics
The Adaptive Difficulty Engine analyzes each user's performance, snooze patterns, and engagement levels to move them across five difficulty levels — Beginner, Easy, Medium, Hard, and Expert. In parallel, the Behavioral Analytics Engine monitors snooze counts, response latency, and wake drift.

#### Habit Scoring and Recommendations
The Habit Scoring Engine combines four weighted factors — wake-up consistency (35%), challenge completion success (25%), snooze reduction (20%), and sleep schedule adherence (20%) — into a single score for each user:
$$\text{Habit Score} = 0.35 \times W + 0.25 \times C + 0.20 \times S + 0.20 \times A$$
This score, along with behavioral trends, drives the Recommendation Engine's personalized suggestions for sleep improvement, wake-up optimization, and productivity.

#### Dashboards, Notifications and Reports
Role-specific dashboards were built to surface this data:
- **User Dashboard:** For alarm history, wake-up statistics, habit score, and challenge performance.
- **Wellness Coach Dashboard:** For behavior insights, client rosters, and appointment management.
- **Admin Dashboard:** For platform telemetry, user lifecycle controls, and disaster recovery snapshot backups.
A notification system handles bedtime reminders, wake-up reminders, habit alerts, and progress notifications, and a reporting module supports PDF and Excel export of habit, wake-up, challenge, and productivity reports.

#### Testing and Deployment
Comprehensive testing covered authentication, alarm scheduling, challenge generation and validation, the adaptive difficulty engine, dashboards, and API endpoints. All 74 automated test suites run clean. The completed application was deployed to production using **Vercel** ([https://ai-cognitive-alarm-platform.vercel.app/](https://ai-cognitive-alarm-platform.vercel.app/)).

#### Final Outcome
The completed project resulted in a fully functional Intelligent Cognitive Alarm Platform featuring secure role-based authentication, adaptive cognitive challenges, wake-up verification, behavioral analytics, weighted habit scoring, personalized recommendations, and role-specific dashboards. The modular architecture leaves room for future enhancements such as voice-based challenges, wearable-device integration for sleep tracking, and deeper reinforcement-learning-driven personalization.

---

### 6. Snapshots / Screenshots
The application includes rich interactive interfaces for all user personas:
1. **Landing & Authentication Suite:** Clean, scientific value proposition with interactive sign-up, sign-in, and quick demo credentials.
2. **User Dashboard:** Circadian streak counters, active alarms, cognitive performance metrics, and instant PDF/Excel export controls.
3. **Analytics Dashboard:** Adaptive difficulty progression charts, accuracy vs score points trends, solve time vs failed attempts, and challenge mastery benchmarks.
4. **Admin Dashboard:** Platform growth telemetry, active daily engagements (DAU), database storage monitoring, and snapshot backup controls.
5. **Coach Dashboard:** Client directory, habit score adherence monitoring, client dossiers, and 1-on-1 appointment scheduling.

---

### 7. Challenges Faced
- **Challenge Personalization:** Ensuring cognitive challenges were appropriately matched to each user's difficulty level without becoming too easy or too frustrating.
- **Adaptive Difficulty Tuning:** Calibrating the difficulty engine so it responded meaningfully to snooze patterns and performance without overreacting to a single bad morning.
- **Wake-Up Verification Accuracy:** Designing verification checks that reliably confirmed genuine wakefulness rather than a quick, half-asleep dismissal.
- **Behavioral Data Volume:** Managing and processing continuous snooze, alarm, and challenge event data efficiently for real-time analytics.
- **Authentication & Security:** Implementing secure, role-based authentication using JWT and OAuth2 while protecting user data across three distinct roles.
- **Frontend–Backend Integration:** Ensuring smooth, low-latency communication between the frontend and the FastAPI backend, especially for time-sensitive alarm and challenge flows.
- **Notification Reliability:** Ensuring bedtime and wake-up notifications fired reliably across both Android and iOS.

---

### 8. Learnings & Skills Acquired
- Developed a strong understanding of adaptive systems, behavioral analytics, and habit-scoring models.
- Gained hands-on experience with FastAPI, JavaScript, PostgreSQL, SQLite, and MongoDB for full-stack application development.
- Learned to design and train adaptive difficulty models using Scikit-learn, XGBoost, TensorFlow, and PyTorch.
- Acquired practical knowledge of JWT authentication, OAuth2 login, and role-based access control.
- Learned to integrate Firebase Cloud Messaging and native alarm/notification frameworks for Android and iOS.
- Improved skills in building weighted scoring models and recommendation logic from behavioral data.
- Enhanced debugging, API integration, testing, and version control skills while working across multiple project modules.
- Strengthened problem-solving, teamwork, communication, documentation, and project management skills through milestone reviews and collaborative development.

---

### 9. Testimonial
This internship gave me valuable hands-on experience building a real-world AI application from the ground up. Working on the Intelligent Cognitive Alarm Platform helped me understand how frontend, backend, databases, and adaptive machine learning models come together to solve an everyday problem in a genuinely useful way. Implementing the cognitive challenge engine, wake-up verification module, adaptive difficulty engine, and habit scoring model pushed me to think carefully about both the technical design and the user experience. The milestone-based development process improved my technical skills, problem-solving ability, and debugging approach, and I gained confidence collaborating within a team, managing project tasks, documenting my work, and presenting outcomes. Overall, the internship strengthened both my technical expertise and my professional skills while giving me practical exposure to modern AI application development.

---

### 10. Conclusion
This internship provided valuable exposure to real-world software development and artificial intelligence applications. It offered practical experience in designing and developing the Intelligent Cognitive Alarm Platform using technologies such as FastAPI, React/JavaScript, PostgreSQL, and adaptive machine learning models. Throughout the internship, I strengthened my technical skills in full-stack development, API integration, database management, and AI-driven personalization, while also improving my problem-solving, communication, teamwork, and documentation abilities. This internship successfully bridged the gap between academic learning and industry practice by allowing me to apply theoretical concepts to a practical, everyday productivity and wellness problem. The knowledge and experience gained have strengthened my confidence in building intelligent software solutions and reinforced my interest in pursuing a career in Artificial Intelligence, Machine Learning, and Full-Stack Software Development.

---

### 11. Acknowledgement
I would like to express my sincere gratitude for the opportunity to participate in this Virtual Internship program. It offered valuable exposure to real-world software development and Artificial Intelligence, enabling me to apply my academic knowledge to a practical, industry-oriented project.

I would like to extend my heartfelt thanks to my Project Mentor, **Ms. Alekhya Reddy**, for her continuous guidance, encouragement, and valuable feedback throughout the internship. Her support and technical insights played a significant role in the successful completion of this project.

My sincere thanks also go to the team members and coordinators for their cooperation, teamwork, knowledge sharing, and continuous support during the development of the project. Their support helped me successfully complete this internship and further strengthened my technical knowledge, professional skills, and confidence in pursuing a career in Artificial Intelligence and Software Development.
