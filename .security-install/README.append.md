
26. **`0026_security_hardening.sql`** – **Stop trusting the browser.** Course tables, lessons and bundles: the public sees
   published items only and only signed-in `academy_admins` can write (undoes 0009). Lesson content is only readable by
   students with access (or free preview lessons). Course PDFs (`course_resources`, `course-files` bucket) are admin-only.
   The `course-media` bucket keeps its public links but can no longer be listed or changed by the public. Lesson progress
   must point at a lesson of the same course. Sign-up no longer claims someone else's guest customer record by phone; only a
   **confirmed** email links a new login to earlier guest orders. Admin and internal functions can't be called with the
   public key. Run after 0025; safe to re-run; does not need 0018. Keep **Authentication → Confirm email** switched on.
27. **`0027_verified_course_completion.sql`** – **Lessons and quizzes are checked by the database.** Quiz answers never reach
   the browser (`get_lesson_content()`); `quiz_answer()` marks each answer and records attempts (`quiz_attempts`).
   Students can't set "completed" themselves: `complete_lesson()` marks a quiz lesson done after a passed attempt, a video
   or reading lesson after it has been open for half its length / reading time (`start_lesson()` notes the first visit).
   `issue_certificate()` also needs every quiz passed. `admin_revoke_certificate()` takes a certificate back.
   **Deploy the new site code first, then run this.** Safe to re-run.
28. **`0028_course_exams.sql`** – **Final exams.** One per course (`course_exams`), edited in Admin → Courses → a course →
   Final exam: multiple-choice and one-line written questions, a pass mark, and "mark every question automatically".
   Students take it after the last lesson (`get_course_exam()`, `submit_exam()`); written answers that aren't auto-marked
   wait in Admin → Courses → Exams to mark (`admin_mark_exam()`). The certificate needs a passed exam. Run after 0027.
