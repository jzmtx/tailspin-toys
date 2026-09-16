import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getFilteredGames,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterGames(db: Database): Promise<{
    strategyId: number;
    puzzleId: number;
    publisherOneId: number;
    publisherTwoId: number;
}> {
    const categoryRows = await db
        .insert(categories)
        .values([
            { name: 'Strategy', description: 'strategy games' },
            { name: 'Puzzle', description: 'puzzle games' },
        ])
        .returning({ id: categories.id, name: categories.name });
    const publisherRows = await db
        .insert(publishers)
        .values([
            { name: 'Pub One', description: 'first publisher' },
            { name: 'Pub Two', description: 'second publisher' },
        ])
        .returning({ id: publishers.id, name: publishers.name });
    const categoryByName = new Map(categoryRows.map((row) => [row.name, row.id]));
    const publisherByName = new Map(publisherRows.map((row) => [row.name, row.id]));

    await db.insert(games).values([
        {
            title: 'Alpha Strategy',
            description: 'strategy',
            starRating: 4.2,
            categoryId: categoryByName.get('Strategy')!,
            publisherId: publisherByName.get('Pub One')!,
        },
        {
            title: 'Beta Puzzle',
            description: 'puzzle',
            starRating: 4.1,
            categoryId: categoryByName.get('Puzzle')!,
            publisherId: publisherByName.get('Pub One')!,
        },
        {
            title: 'Gamma Strategy',
            description: 'strategy',
            starRating: 4.3,
            categoryId: categoryByName.get('Strategy')!,
            publisherId: publisherByName.get('Pub Two')!,
        },
    ]);

    return {
        strategyId: categoryByName.get('Strategy')!,
        puzzleId: categoryByName.get('Puzzle')!,
        publisherOneId: publisherByName.get('Pub One')!,
        publisherTwoId: publisherByName.get('Pub Two')!,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters by one or more categories using OR semantics', async () => {
        const fixture = await seedFilterGames(db);

        const strategyGames = await getFilteredGames(db, { categoryIds: [fixture.strategyId] });
        const strategyOrPuzzleGames = await getFilteredGames(db, {
            categoryIds: [fixture.strategyId, fixture.puzzleId],
        });

        expect(strategyGames.map((game) => game.title)).toEqual(['Alpha Strategy', 'Gamma Strategy']);
        expect(strategyOrPuzzleGames.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzle',
            'Gamma Strategy',
        ]);
    });

    it('filters by publisher and combines publisher and category filters', async () => {
        const fixture = await seedFilterGames(db);

        const publisherGames = await getFilteredGames(db, { publisherId: fixture.publisherOneId });
        const combinedGames = await getFilteredGames(db, {
            categoryIds: [fixture.strategyId],
            publisherId: fixture.publisherOneId,
        });

        expect(publisherGames.map((game) => game.title)).toEqual(['Alpha Strategy', 'Beta Puzzle']);
        expect(combinedGames.map((game) => game.title)).toEqual(['Alpha Strategy']);
    });

    it('returns all games for empty filters and no games for unknown filters', async () => {
        await seedFilterGames(db);

        const allGames = await getFilteredGames(db, {});
        const noGames = await getFilteredGames(db, { categoryIds: [99999], publisherId: 99999 });

        expect(allGames).toHaveLength(3);
        expect(noGames).toEqual([]);
    });
});
