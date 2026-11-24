import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sourceIndex from '../../../../../../reference-sources/source-index.json';

export async function GET(_request: Request, {params}: {params: Promise<{source: string; id: string}>}) {
  const {source, id} = await params;
  const item = sourceIndex.products.find(row => row.source === source && String(row.id) === id);
  if (!item?.publicHtmlSaved || !item.savedPage) return new Response('Không có bản HTML đã lưu', {status: 404});
  const root = path.resolve(process.cwd(), 'reference-sources');
  const file = path.resolve(root, item.savedPage);
  if (!file.startsWith(root + path.sep)) return new Response('Đường dẫn không hợp lệ', {status: 400});
  try {
    const data = await readFile(file);
    return new Response(data, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${source}-${id}.html"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Không tìm thấy tệp', {status: 404});
  }
}
