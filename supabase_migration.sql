-- Creación de la base de datos inicial para Ticket App

-- 1. Habilitar la extensión UUID si no está
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar tablas si existen para recrear de cero
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_activity CASCADE;
DROP TABLE IF EXISTS comment_attachments CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Tabla PROFILES (extiende auth.users de Supabase)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cliente', 'programador')),
    avatar_url TEXT,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla SPACES (Relación cliente <-> programador)
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    programmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, programmer_id)
);

-- 5. Tabla TICKETS
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'estimado', 'aprobado', 'rechazado', 'en_progreso', 'resuelto')),
    priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
    estimated_hours INTEGER CHECK (estimated_hours > 0),
    rejection_reason TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabla TICKET_ATTACHMENTS
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabla COMMENTS
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tabla COMMENT_ATTACHMENTS
CREATE TABLE comment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabla TICKET_ACTIVITY
CREATE TABLE ticket_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'estimated', 'approved', 'rejected', 'started', 'resolved', 'commented')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Tabla NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_ticket', 'estimated', 'approved', 'rejected', 'in_progress', 'resolved', 'comment')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 12. Políticas de Seguridad (RLS)

-- PROFILES
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" 
    ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualización de perfil propio" 
    ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Permitir inserción de perfil propio" 
    ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- SPACES
CREATE POLICY "Ver espacios propios" 
    ON spaces FOR SELECT TO authenticated 
    USING (auth.uid() = client_id OR auth.uid() = programmer_id);

CREATE POLICY "Crear espacio (clientes)" 
    ON spaces FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = client_id);

-- TICKETS
CREATE POLICY "Ver tickets de espacios propios" 
    ON tickets FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM spaces s 
        WHERE s.id = tickets.space_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

CREATE POLICY "Crear tickets en espacios propios" 
    ON tickets FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces s 
            WHERE s.id = space_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        ) AND auth.uid() = created_by
    );

CREATE POLICY "Actualizar tickets de espacios propios" 
    ON tickets FOR UPDATE TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM spaces s 
        WHERE s.id = tickets.space_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

-- TICKET_ATTACHMENTS
CREATE POLICY "Ver adjuntos de tickets propios" 
    ON ticket_attachments FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM tickets t
        JOIN spaces s ON s.id = t.space_id
        WHERE t.id = ticket_attachments.ticket_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

CREATE POLICY "Insertar adjuntos en tickets propios" 
    ON ticket_attachments FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM tickets t
        JOIN spaces s ON s.id = t.space_id
        WHERE t.id = ticket_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

-- COMMENTS
CREATE POLICY "Ver comentarios de tickets propios" 
    ON comments FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM tickets t
        JOIN spaces s ON s.id = t.space_id
        WHERE t.id = comments.ticket_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

CREATE POLICY "Crear comentarios en tickets propios" 
    ON comments FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN spaces s ON s.id = t.space_id
            WHERE t.id = ticket_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        ) AND auth.uid() = author_id
    );

-- COMMENT_ATTACHMENTS
CREATE POLICY "Ver adjuntos de comentarios propios" 
    ON comment_attachments FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM comments c
        JOIN tickets t ON t.id = c.ticket_id
        JOIN spaces s ON s.id = t.space_id
        WHERE c.id = comment_attachments.comment_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

CREATE POLICY "Insertar adjuntos en comentarios propios" 
    ON comment_attachments FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM comments c
        JOIN tickets t ON t.id = c.ticket_id
        JOIN spaces s ON s.id = t.space_id
        WHERE c.id = comment_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

-- TICKET_ACTIVITY
CREATE POLICY "Ver actividad de tickets propios" 
    ON ticket_activity FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM tickets t
        JOIN spaces s ON s.id = t.space_id
        WHERE t.id = ticket_activity.ticket_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

CREATE POLICY "Insertar actividad de tickets propios" 
    ON ticket_activity FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM tickets t
        JOIN spaces s ON s.id = t.space_id
        WHERE t.id = ticket_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
    ));

-- NOTIFICATIONS
CREATE POLICY "Ver notificaciones propias" 
    ON notifications FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Actualizar notificaciones propias" 
    ON notifications FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id);


-- 13. Triggers y Funciones Auxiliares

-- Función para manejar nuevos registros en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_role TEXT;
    new_name TEXT;
    code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Intentar obtener el rol y nombre completo de user_metadata
    new_role := COALESCE(new.raw_user_meta_data->>'role', 'cliente');
    new_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
    
    -- Si es programador, generamos un código de invitación único
    IF new_role = 'programador' THEN
        LOOP
            -- Generar código aleatorio de 8 caracteres alfanuméricos en mayúsculas
            code := UPPER(substring(md5(random()::text) from 1 for 8));
            
            -- Verificar si existe
            SELECT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = code) INTO code_exists;
            
            IF NOT code_exists THEN
                EXIT;
            END IF;
        END LOOP;
    ELSE
        code := NULL;
    END IF;

    INSERT INTO public.profiles (id, full_name, email, role, avatar_url, invite_code)
    VALUES (
        new.id,
        new_name,
        new.email,
        new_role,
        new.raw_user_meta_data->>'avatar_url',
        code
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para automatizar perfiles
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Función para registrar automáticamente actividad cuando cambia un ticket
CREATE OR REPLACE FUNCTION public.log_ticket_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    meta JSONB;
    actor UUID;
BEGIN
    -- Intentar determinar quién hizo el cambio. En Supabase auth.uid() nos da el ID del usuario actual
    actor := auth.uid();
    IF actor IS NULL THEN
        -- Si no hay sesión (ej. disparado por sistema), usamos el creador o actualizador
        actor := NEW.created_by;
    END IF;

    meta := '{}'::jsonb;

    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'estimado' THEN
                action_type := 'estimated';
                meta := jsonb_build_object('estimated_hours', NEW.estimated_hours);
            ELSIF NEW.status = 'aprobado' THEN
                action_type := 'approved';
            ELSIF NEW.status = 'rechazado' THEN
                action_type := 'rejected';
                meta := jsonb_build_object('rejection_reason', NEW.rejection_reason);
            ELSIF NEW.status = 'en_progreso' THEN
                action_type := 'started';
            ELSIF NEW.status = 'resuelto' THEN
                action_type := 'resolved';
            END IF;
        ELSE
            -- Si no cambió el estado, no logueamos actividad genérica por ahora
            RETURN NEW;
        END IF;
    END IF;

    IF action_type IS NOT NULL THEN
        INSERT INTO public.ticket_activity (ticket_id, actor_id, action, metadata)
        VALUES (NEW.id, actor, action_type, meta);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de actividad
CREATE OR REPLACE TRIGGER on_ticket_created_activity
    AFTER INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION public.log_ticket_activity();

CREATE OR REPLACE TRIGGER on_ticket_updated_activity
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION public.log_ticket_activity();


-- Función para generar notificaciones automáticas ante cambios de estado
CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
    target_user UUID;
    title_text TEXT;
    body_text TEXT;
    client_name TEXT;
    prog_name TEXT;
    notif_type TEXT;
    space_name TEXT;
BEGIN
    -- Obtener nombres y detalles del espacio
    SELECT s.name, c.full_name, p.full_name, s.client_id, s.programmer_id
    INTO space_name, client_name, prog_name, client_name, target_user -- Usamos variables temporales
    FROM spaces s
    JOIN profiles c ON c.id = s.client_id
    JOIN profiles p ON p.id = s.programmer_id
    WHERE s.id = NEW.space_id;

    -- Si el ticket se crea (estado pendiente)
    IF TG_OP = 'INSERT' THEN
        -- El receptor es el programador
        SELECT programmer_id INTO target_user FROM spaces WHERE id = NEW.space_id;
        title_text := 'Nuevo Ticket Creado';
        body_text := 'Se ha creado el ticket "' || NEW.title || '" en el espacio ' || space_name;
        notif_type := 'new_ticket';
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Cambios de estado
        IF NEW.status = 'estimado' THEN
            -- Receptor: Cliente
            SELECT client_id INTO target_user FROM spaces WHERE id = NEW.space_id;
            title_text := 'Ticket Estimado';
            body_text := 'El ticket "' || NEW.title || '" fue estimado en ' || NEW.estimated_hours || ' horas. Requiere tu aprobación.';
            notif_type := 'estimated';
            
        ELSIF NEW.status = 'aprobado' THEN
            -- Receptor: Programador
            SELECT programmer_id INTO target_user FROM spaces WHERE id = NEW.space_id;
            title_text := 'Estimación Aprobada';
            body_text := 'La estimación para el ticket "' || NEW.title || '" fue aprobada. Puedes iniciar el trabajo.';
            notif_type := 'approved';
            
        ELSIF NEW.status = 'rechazado' THEN
            -- Receptor: Programador
            SELECT programmer_id INTO target_user FROM spaces WHERE id = NEW.space_id;
            title_text := 'Estimación Rechazada';
            body_text := 'La estimación para el ticket "' || NEW.title || '" fue rechazada. Razón: ' || COALESCE(NEW.rejection_reason, 'No especificada');
            notif_type := 'rejected';
            
        ELSIF NEW.status = 'en_progreso' THEN
            -- Receptor: Cliente
            SELECT client_id INTO target_user FROM spaces WHERE id = NEW.space_id;
            title_text := 'Ticket en Progreso';
            body_text := 'El programador comenzó a trabajar en "' || NEW.title || '".';
            notif_type := 'in_progress';
            
        ELSIF NEW.status = 'resuelto' THEN
            -- Receptor: Cliente
            SELECT client_id INTO target_user FROM spaces WHERE id = NEW.space_id;
            title_text := 'Ticket Resuelto';
            body_text := 'El ticket "' || NEW.title || '" ha sido marcado como RESUELTO.';
            notif_type := 'resolved';
        END IF;
    END IF;

    -- Insertar notificación si aplica y el actor no es el mismo receptor
    -- (No te notifiques a vos mismo)
    IF target_user IS NOT NULL AND target_user != auth.uid() AND title_text IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
        VALUES (target_user, NEW.id, notif_type, title_text, body_text);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de notificaciones
CREATE OR REPLACE TRIGGER on_ticket_created_notification
    AFTER INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_changes();

CREATE OR REPLACE TRIGGER on_ticket_updated_notification
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_changes();
