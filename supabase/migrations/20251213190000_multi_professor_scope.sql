-- Tighten read access to courses/subjects and submissions to assigned professors/students

-- Drop permissive select policies
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;

-- Drop permissive submission policies before recreating scoped ones
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Professors can update submissions for grading" ON public.submissions;

-- Courses: only owner, admin, or students assigned to that professor
CREATE POLICY "Courses visible to owner or assigned students"
ON public.courses
FOR SELECT
USING (
  professor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.professor_students ps
    JOIN public.profiles p ON p.id = ps.student_id
    WHERE ps.professor_id = courses.professor_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Subjects: only owner, admin, or students assigned to that professor
CREATE POLICY "Subjects visible to owner or assigned students"
ON public.subjects
FOR SELECT
USING (
  professor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.professor_students ps
    JOIN public.profiles p ON p.id = ps.student_id
    WHERE ps.professor_id = subjects.professor_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Submissions: scoped to own student, course professor, or admin
CREATE POLICY "Submissions visible to owner or course professor"
ON public.submissions
FOR SELECT
USING (
  student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.profiles prof ON prof.id = c.professor_id
    WHERE c.id = public.submissions.course_id
      AND prof.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Submissions insert: student can submit only to courses tied to their professors
CREATE POLICY "Students can create submissions for assigned professors"
ON public.submissions
FOR INSERT
WITH CHECK (
  student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.professor_students ps ON ps.professor_id = c.professor_id
    WHERE c.id = public.submissions.course_id
      AND ps.student_id = public.submissions.student_id
  )
);

-- Submissions update: students keep ability to edit their own rows (within app constraints)
CREATE POLICY "Students can update their submissions"
ON public.submissions
FOR UPDATE
USING (
  student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Submissions update: professors/admins can grade submissions tied to their courses
CREATE POLICY "Professors can grade submissions of their courses"
ON public.submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.profiles prof ON prof.id = c.professor_id
    WHERE c.id = public.submissions.course_id
      AND prof.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
