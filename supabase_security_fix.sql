-- ============================================================================
-- FIX DE SEGURIDAD Y RENDIMIENTO — Ejecutar en el SQL Editor de Supabase
-- Corrige: fuga de perfiles/códigos de invitación, escalada de rol,
-- transiciones de estado sin validar, creación de espacios sin validar código,
-- actividad falsificable, falta de índices, bucket de adjuntos público.
-- Es idempotente: se puede ejecutar más de una vez sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES: solo se puede leer el perfil propio y el de compañeros de espacio
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON profiles;
DROP POLICY IF EXISTS "Ver perfil propio y de compañeros de espacio" ON profiles;

CREATE POLICY "Ver perfil propio y de compañeros de espacio"
    ON profiles FOR SELECT TO authenticated
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM spaces s
            WHERE (s.client_id = profiles.id AND s.programmer_id = auth.uid())
               OR (s.programmer_id = profiles.id AND s.client_id = auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- 2. PROFILES: el update propio no puede tocar email/invite_code, y el rol
--    solo puede cambiar mientras el usuario no participe de ningún espacio.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir actualización de perfil propio" ON profiles;
DROP POLICY IF EXISTS "Actualizar perfil propio" ON profiles;

CREATE POLICY "Actualizar perfil propio"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Generador de códigos de invitación (fuente criptográfica: gen_random_uuid)
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code TEXT;
BEGIN
    LOOP
        code := UPPER(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE invite_code = code);
    END LOOP;
    RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'No está permitido modificar el email del perfil';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF EXISTS (SELECT 1 FROM spaces s WHERE s.client_id = OLD.id OR s.programmer_id = OLD.id) THEN
            RAISE EXCEPTION 'No se puede cambiar el rol mientras participás de espacios activos';
        END IF;
        -- Mantener coherente el código de invitación con el rol
        IF NEW.role = 'programador' THEN
            NEW.invite_code := COALESCE(OLD.invite_code, public.generate_invite_code());
        ELSE
            NEW.invite_code := NULL;
        END IF;
    ELSIF NEW.invite_code IS DISTINCT FROM OLD.invite_code THEN
        RAISE EXCEPTION 'No está permitido modificar el código de invitación';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON profiles;
CREATE TRIGGER protect_profile_columns_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- ----------------------------------------------------------------------------
-- 3. SPACES: la creación pasa por una RPC que valida el código de invitación
--    en el servidor. Se elimina el INSERT directo.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Crear espacio (clientes)" ON spaces;

CREATE OR REPLACE FUNCTION public.join_space(p_invite_code TEXT)
RETURNS spaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_client profiles%ROWTYPE;
    v_prog profiles%ROWTYPE;
    v_space spaces%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    SELECT * INTO v_client FROM profiles WHERE id = v_uid;
    IF NOT FOUND OR v_client.role <> 'cliente' THEN
        RAISE EXCEPTION 'Solo los clientes pueden unirse a espacios';
    END IF;

    SELECT * INTO v_prog
    FROM profiles
    WHERE invite_code = UPPER(TRIM(p_invite_code)) AND role = 'programador';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Código de invitación inválido o programador no encontrado';
    END IF;

    IF v_prog.id = v_uid THEN
        RAISE EXCEPTION 'No podés vincularte con vos mismo';
    END IF;

    INSERT INTO spaces (client_id, programmer_id, name)
    VALUES (v_uid, v_prog.id, 'Espacio: ' || v_prog.full_name)
    RETURNING * INTO v_space;

    RETURN v_space;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Ya estás enlazado con este programador';
END;
$$;

REVOKE ALL ON FUNCTION public.join_space(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_space(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. TICKETS: validar transiciones de estado según el rol dentro del espacio,
--    proteger columnas inmutables y setear timestamps con el reloj del servidor.
--    Reglas (espejo de la UI):
--      - estimar (→ estimado): solo el programador, desde pendiente/rechazado
--      - aprobar/rechazar: cualquier miembro (la UI permite "confirmado por chat"),
--        solo desde estimado
--      - comenzar (→ en_progreso): solo el programador, desde aprobado
--      - resolver (→ resuelto): solo el programador, desde en_progreso
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_ticket_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_client UUID;
    v_programmer UUID;
BEGIN
    -- Escrituras sin sesión (service role / procesos internos) no se validan
    IF v_uid IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT client_id, programmer_id INTO v_client, v_programmer
    FROM spaces WHERE id = NEW.space_id;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'pendiente' THEN
            RETURN NEW;
        ELSIF NEW.status = 'estimado' THEN
            -- Solo el programador puede crear tickets ya estimados
            IF v_uid <> v_programmer THEN
                RAISE EXCEPTION 'Solo el programador puede crear tickets estimados';
            END IF;
            IF NEW.estimated_hours IS NULL THEN
                RAISE EXCEPTION 'Un ticket estimado requiere horas estimadas';
            END IF;
            NEW.estimated_at := NOW();
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Un ticket nuevo solo puede crearse como pendiente o estimado';
        END IF;
    END IF;

    -- UPDATE: columnas inmutables
    IF NEW.space_id IS DISTINCT FROM OLD.space_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'No está permitido modificar el espacio, el creador o la fecha de creación del ticket';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'estimado' THEN
            IF v_uid <> v_programmer THEN
                RAISE EXCEPTION 'Solo el programador puede estimar el ticket';
            END IF;
            IF OLD.status NOT IN ('pendiente', 'rechazado') THEN
                RAISE EXCEPTION 'Solo se puede estimar un ticket pendiente o rechazado';
            END IF;
            IF NEW.estimated_hours IS NULL THEN
                RAISE EXCEPTION 'La estimación requiere horas estimadas';
            END IF;
            NEW.estimated_at := NOW();

        ELSIF NEW.status IN ('aprobado', 'rechazado') THEN
            IF OLD.status <> 'estimado' THEN
                RAISE EXCEPTION 'Solo se puede aprobar o rechazar un ticket estimado';
            END IF;
            IF NEW.status = 'aprobado' THEN
                NEW.approved_at := NOW();
            ELSIF NEW.rejection_reason IS NULL OR TRIM(NEW.rejection_reason) = '' THEN
                RAISE EXCEPTION 'El rechazo requiere un motivo';
            END IF;

        ELSIF NEW.status = 'en_progreso' THEN
            IF v_uid <> v_programmer THEN
                RAISE EXCEPTION 'Solo el programador puede comenzar el trabajo';
            END IF;
            IF OLD.status <> 'aprobado' THEN
                RAISE EXCEPTION 'Solo se puede comenzar un ticket aprobado';
            END IF;
            NEW.started_at := NOW();

        ELSIF NEW.status = 'resuelto' THEN
            IF v_uid <> v_programmer THEN
                RAISE EXCEPTION 'Solo el programador puede resolver el ticket';
            END IF;
            IF OLD.status <> 'en_progreso' THEN
                RAISE EXCEPTION 'Solo se puede resolver un ticket en progreso';
            END IF;
            NEW.resolved_at := NOW();

        ELSE
            RAISE EXCEPTION 'Transición de estado inválida';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ticket_write_trigger ON tickets;
CREATE TRIGGER validate_ticket_write_trigger
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION public.validate_ticket_write();

-- ----------------------------------------------------------------------------
-- 5. TICKET_ACTIVITY: la actividad la insertan solo los triggers del sistema
--    (SECURITY DEFINER, que saltean RLS). Se elimina el INSERT directo,
--    que permitía falsificar actividad a nombre de otro usuario.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insertar actividad de tickets propios" ON ticket_activity;

-- ----------------------------------------------------------------------------
-- 6. handle_new_user: código de invitación con fuente criptográfica
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_role TEXT;
    new_name TEXT;
    code TEXT;
BEGIN
    new_role := COALESCE(new.raw_user_meta_data->>'role', 'cliente');
    new_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);

    IF new_role = 'programador' THEN
        code := public.generate_invite_code();
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
$$;

-- ----------------------------------------------------------------------------
-- 7. notify_ticket_changes: limpieza del SELECT inicial con doble asignación
--    a client_name (bug latente en función SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user UUID;
    title_text TEXT;
    body_text TEXT;
    notif_type TEXT;
    space_name TEXT;
    v_client UUID;
    v_programmer UUID;
BEGIN
    SELECT s.name, s.client_id, s.programmer_id
    INTO space_name, v_client, v_programmer
    FROM spaces s
    WHERE s.id = NEW.space_id;

    IF TG_OP = 'INSERT' THEN
        target_user := v_programmer;
        title_text := 'Nuevo Ticket Creado';
        body_text := 'Se ha creado el ticket "' || NEW.title || '" en el espacio ' || space_name;
        notif_type := 'new_ticket';

    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'estimado' THEN
            target_user := v_client;
            title_text := 'Ticket Estimado';
            body_text := 'El ticket "' || NEW.title || '" fue estimado en ' || NEW.estimated_hours || ' horas. Requiere tu aprobación.';
            notif_type := 'estimated';

        ELSIF NEW.status = 'aprobado' THEN
            target_user := v_programmer;
            title_text := 'Estimación Aprobada';
            body_text := 'La estimación para el ticket "' || NEW.title || '" fue aprobada. Puedes iniciar el trabajo.';
            notif_type := 'approved';

        ELSIF NEW.status = 'rechazado' THEN
            target_user := v_programmer;
            title_text := 'Estimación Rechazada';
            body_text := 'La estimación para el ticket "' || NEW.title || '" fue rechazada. Razón: ' || COALESCE(NEW.rejection_reason, 'No especificada');
            notif_type := 'rejected';

        ELSIF NEW.status = 'en_progreso' THEN
            target_user := v_client;
            title_text := 'Ticket en Progreso';
            body_text := 'El programador comenzó a trabajar en "' || NEW.title || '".';
            notif_type := 'in_progress';

        ELSIF NEW.status = 'resuelto' THEN
            target_user := v_client;
            title_text := 'Ticket Resuelto';
            body_text := 'El ticket "' || NEW.title || '" ha sido marcado como RESUELTO.';
            notif_type := 'resolved';
        END IF;
    END IF;

    -- No notificarse a uno mismo
    IF target_user IS NOT NULL AND target_user IS DISTINCT FROM auth.uid() AND title_text IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
        VALUES (target_user, NEW.id, notif_type, title_text, body_text);
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. ÍNDICES en las FKs consultadas por la app y por las políticas RLS
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tickets_space_id ON tickets(space_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON comment_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_id ON ticket_activity(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_actor_id ON ticket_activity(actor_id);
CREATE INDEX IF NOT EXISTS idx_spaces_programmer_id ON spaces(programmer_id);

-- ----------------------------------------------------------------------------
-- 9. STORAGE: bucket de adjuntos privado + políticas por espacio.
--    El frontend ahora guarda el path del archivo (no la URL pública) y
--    muestra los adjuntos con URLs firmadas temporales.
-- ----------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'attachments';

DROP POLICY IF EXISTS "Subir adjuntos a espacios propios" ON storage.objects;
CREATE POLICY "Subir adjuntos a espacios propios"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attachments'
        AND EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id::text = (storage.foldername(name))[1]
              AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        )
    );

DROP POLICY IF EXISTS "Leer adjuntos de espacios propios" ON storage.objects;
CREATE POLICY "Leer adjuntos de espacios propios"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'attachments'
        AND EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id::text = (storage.foldername(name))[1]
              AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        )
    );

-- Migrar adjuntos existentes: convertir URLs públicas guardadas a paths
UPDATE ticket_attachments
SET file_url = regexp_replace(file_url, '^.*/storage/v1/object/public/attachments/', '')
WHERE file_url LIKE '%/storage/v1/object/public/attachments/%';

UPDATE comment_attachments
SET file_url = regexp_replace(file_url, '^.*/storage/v1/object/public/attachments/', '')
WHERE file_url LIKE '%/storage/v1/object/public/attachments/%';
