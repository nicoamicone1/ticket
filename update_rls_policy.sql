-- Eliminar la política anterior que solo permitía a los clientes crear tickets
DROP POLICY IF EXISTS "Crear tickets en espacios propios (clientes)" ON tickets;

-- Crear la nueva política que permite a clientes y programadores del espacio crear tickets
CREATE POLICY "Crear tickets en espacios propios" 
    ON tickets FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces s 
            WHERE s.id = space_id AND (auth.uid() = s.client_id OR auth.uid() = s.programmer_id)
        ) AND auth.uid() = created_by
    );
