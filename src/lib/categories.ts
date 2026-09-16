/**
 * Provides typed data-access helpers for category records.
 */

import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Retrieve all categories ordered by name.
 *
 * @param db - The injectable Drizzle database client used to query categories.
 * @returns All categories ordered alphabetically by name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
