import type { EnvironmentalCategory } from '@/theme';

import type { EnvironmentalCategoryName } from './database.types';

/**
 * Entidades ambientales.
 *
 * Las consultas (listar, filtrar, ficha de una entidad) llegan en F2.2 con la
 * pantalla de Buscar. Por ahora este archivo solo sostiene la guarda de abajo.
 */

/**
 * El enumerado de categorías vive en dos sitios que tienen que decir lo mismo:
 * `environmental_category` en la base de datos y `EnvironmentalCategory` en el
 * theme, que además le asigna color e icono.
 *
 * Esta comprobación falla al compilar si uno de los dos cambia sin el otro —
 * por ejemplo, si una migración añade una categoría y nadie le da color. Es
 * gratis y evita descubrirlo con un `undefined` en pantalla.
 */
type CategoriesInSync =
  EnvironmentalCategory extends EnvironmentalCategoryName
    ? EnvironmentalCategoryName extends EnvironmentalCategory
      ? true
      : ['sobran categorías en el theme que la base no conoce']
    : ['faltan categorías en el theme que la base sí tiene'];

const categoriesInSync: CategoriesInSync = true;
void categoriesInSync;
