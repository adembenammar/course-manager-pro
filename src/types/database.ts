export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'student' | 'professor' | 'admin';
  avatar_url?: string;
  class_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  professor_id?: string;
  color: string;
  created_at: string;
  updated_at: string;
  professor?: Profile;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  content?: string;
  subject_id: string;
  professor_id?: string;
  deadline?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  professor?: Profile;
}

export interface Submission {
  id: string;
  course_id: string;
  student_id: string;
  file_url?: string;
  content?: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'submitted' | 'graded';
  submitted_at?: string;
  graded_at?: string;
  created_at: string;
  updated_at: string;
  course?: Course;
  student?: Profile;
}

export interface Comment {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at?: string | null;
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}
