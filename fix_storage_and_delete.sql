-- ============================================================================
-- FIX: Subida de imágenes en tickets + Eliminación de tickets no aprobados
-- Ejecutar este script en el SQL Editor de Supabase (proyecto jlqfsduztgifcbhffqlz)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STORAGE: Bucket "attachments" y sus políticas de RLS
--    El error "new row violates row-level security policy" al subir imágenes
--    ocurre porque no existe una política que permita INSERT en storage.objects
--    para el bucket 'attachments'. El código sube archivos con la ruta:
--        {space_id}/{ticket_id}/{timestamp}_{nombre}
--    Por eso validamos la membresía del espacio usando la primera carpeta.
-- ----------------------------------------------------------------------------

-- Crear el bucket si no existe (público para que getPublicUrl funcione)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Limpiar políticas previas (idempotente). Se listan todos los nombres usados
-- en intentos anteriores para dejar el bucket con un set limpio.
DROP POLICY IF EXISTS "Permitir acceso a adjuntos de tickets a usuarios del espacio" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de adjuntos a usuarios del espacio" ON storage.objects;
DROP POLICY IF EXISTS "Leer adjuntos de espacios propios" ON storage.objects;
DROP POLICY IF EXISTS "Subir adjuntos a espacios propios" ON storage.objects;
DROP POLICY IF EXISTS "Ver adjuntos de espacios propios" ON storage.objects;
DROP POLICY IF EXISTS "Borrar adjuntos de espacios propios" ON storage.objects;
DROP POLICY IF EXISTS "attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "attachments_delete" ON storage.objects;

-- IMPORTANTE: hay que calificar la columna como storage.objects.name.
-- Si se usa solo "name" dentro del subquery "FROM spaces s", Postgres lo resuelve
-- a spaces.name (la tabla spaces tiene una columna "name") en vez del nombre del
-- archivo subido, y la política SIEMPRE rechaza. Ese era el bug original.

-- INSERT: solo miembros del espacio pueden subir archivos
CREATE POLICY "attachments_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attachments'
        AND EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
              AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        )
    );

-- SELECT: miembros del espacio pueden listar/leer (el bucket es público igual,
-- pero esto permite operaciones autenticadas como .list())
CREATE POLICY "attachments_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'attachments'
        AND EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
              AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        )
    );

-- DELETE: miembros del espacio pueden borrar archivos (usado al eliminar tickets)
CREATE POLICY "attachments_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'attachments'
        AND EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
              AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        )
    );


-- ----------------------------------------------------------------------------
-- 2. TICKETS: Permitir eliminar tickets cuya estimación AÚN NO fue aprobada
--    Estados eliminables: pendiente, estimado, rechazado
--    Estados protegidos:  aprobado, en_progreso, resuelto
--    Al borrar el ticket, la cascada (ON DELETE CASCADE) elimina adjuntos,
--    comentarios, actividad y notificaciones asociadas.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Eliminar tickets no aprobados de espacios propios" ON tickets;

CREATE POLICY "Eliminar tickets no aprobados de espacios propios"
    ON tickets FOR DELETE TO authenticated
    USING (
        status IN ('pendiente', 'estimado', 'rechazado')
        AND EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id = tickets.space_id
              AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        )
    );
