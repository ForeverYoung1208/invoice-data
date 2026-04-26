import { NextResponse } from 'next/server';
import { getGlobalDataSource } from '@/lib/db/dataSource';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: App and DB are healthy
 *       503:
 *         description: DB connection failed
 */
export async function GET() {
  try {
    const ds = await getGlobalDataSource();
    await ds.query('SELECT 1');
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', db: 'disconnected', error: String(err) },
      { status: 503 },
    );
  }
}
