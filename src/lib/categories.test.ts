/**
 * Tests category data-access helpers against an in-memory SQLite database.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { categories } from '../../db/schema';
import { createTestDatabase } from '../../db/test-helpers';
import type { Database } from './db';
import { getAllCategories } from './categories';

describe('category data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns categories ordered alphabetically by name', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'strategy' },
            { name: 'Puzzle', description: 'puzzle' },
        ]);

        const result = await getAllCategories(db);

        expect(result.map((category) => category.name)).toEqual(['Puzzle', 'Strategy']);
    });

    it('returns an empty collection when no categories exist', async () => {
        await expect(getAllCategories(db)).resolves.toEqual([]);
    });
});
