export type UserRole = 'cliente' | 'programador';

export type TicketStatus = 'pendiente' | 'estimado' | 'aprobado' | 'rechazado' | 'en_progreso' | 'resuelto';

export type TicketPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  invite_code: string | null; // Solo programadores
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  client_id: string;
  programmer_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  client?: Profile;
  programmer?: Profile;
}

export interface Ticket {
  id: string;
  space_id: string;
  created_by: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  estimated_hours: number | null;
  rejection_reason: string | null;
  tags: string[]; // JSON array
  created_at: string;
  estimated_at: string | null;
  approved_at: string | null;
  started_at: string | null;
  resolved_at: string | null;
  updated_at: string;
  // Joins opcionales
  space?: Space;
  creator?: Profile;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  author?: Profile;
}

export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface TicketActivityMetadata {
  estimated_hours?: number;
  rejection_reason?: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  actor_id: string;
  action: 'created' | 'estimated' | 'approved' | 'rejected' | 'started' | 'resolved' | 'commented';
  metadata: TicketActivityMetadata | null;
  created_at: string;
  // Joins opcionales
  actor?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string | null;
  type: 'new_ticket' | 'estimated' | 'approved' | 'rejected' | 'in_progress' | 'resolved' | 'comment';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  // Joins opcionales
  ticket?: Ticket;
}
