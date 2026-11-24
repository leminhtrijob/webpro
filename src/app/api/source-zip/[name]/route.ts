import { readFile } from 'node:fs/promises';
import path from 'node:path';

const allowed = new Set(['firework', 'galaxyz', 'Merrytree3D']);
export async function GET(_request: Request, {params}: {params: Promise<{name: string}>}) {
  const {name} = await params;
  if (!allowed.has(name)) return new Response('Không tìm thấy ZIP', {status: 404});
  try {
    const bytes = await readFile(path.join(process.cwd(), 'reference-sources', 'unpublished-public-assets', 'public_downloads', `${name}.zip`));
    return new Response(bytes, {headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name}.zip"`,
      'X-Content-Type-Options': 'nosniff',
    }});
  } catch {
    return new Response('Không tìm thấy ZIP', {status: 404});
  }
}
