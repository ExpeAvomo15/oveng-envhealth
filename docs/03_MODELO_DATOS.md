# 03 — Modelo de datos

> **Placeholder.** Este documento se rellena en la tarea **F0.3 (Supabase
> esquema + cliente)**. Hasta entonces no hay esquema decidido y nada de lo que
> aquí falte debe darse por supuesto.

Cuando se escriba, debe contener:

- **Diagrama entidad-relación** (Mermaid `erDiagram`) del esquema completo.
- **Tabla por tabla:** columnas, tipos, claves, índices y por qué existen.
- **Políticas RLS** de cada tabla: quién puede leer, insertar, actualizar y
  borrar, y con qué condición. Ninguna tabla se documenta sin sus policies.
- **Storage:** buckets, qué guarda cada uno y sus reglas de acceso.
- **Enumerados de dominio:** tipo de cuenta (persona, empresa, iniciativa),
  categorías ambientales (aire, agua, suelo, biodiversidad, residuos…), tipos
  de publicación.
- **Migraciones:** dónde viven y cómo se aplican.

Entidades previstas (borrador, sujeto a cambio en F0.3): perfiles,
publicaciones, seguimientos, valoraciones, huella. Ver @docs/00_VISION.md.
