import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface MediaFile {
  url: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'font' | 'other';
  size: number;
  modified: Date;
  folder: string;
}

const ALLOWED_DIRS = [
  'uploads',
  'images',
  'videos',
  'sounds',
  'fonts',
  'logo'
];

async function scanDirectory(baseDir: string, relDir: string = ''): Promise<MediaFile[]> {
  const fullDir = path.join(baseDir, relDir);
  const results: MediaFile[] = [];

  try {
    // Check if directory exists
    try {
      await fs.access(fullDir);
    } catch {
      return [];
    }

    const files = await fs.readdir(fullDir);

    for (const file of files) {
      if (file.startsWith('.')) continue;

      const filePath = path.join(fullDir, file);
      const fileRelPath = path.join(relDir, file);

      try {
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          const subResults = await scanDirectory(baseDir, fileRelPath);
          results.push(...subResults);
        } else {
          const ext = path.extname(file).toLowerCase();
          let type: MediaFile['type'] = 'other';

          if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp'].includes(ext)) {
            type = 'image';
          } else if (['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(ext)) {
            type = 'video';
          } else if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
            type = 'pdf'; // Mapping documents to 'pdf' category for now (frontend icon)
          } else if (['.ttf', '.woff', '.woff2', '.eot'].includes(ext)) {
            type = 'font';
          }

          // Convert Windows backslashes to forward slashes for URL
          const urlPath = fileRelPath.split(path.sep).join('/');

          results.push({
            url: `/${urlPath}`,
            name: file,
            type,
            size: stats.size,
            modified: stats.mtime,
            folder: path.dirname(urlPath) === '.' ? '' : path.dirname(urlPath), // Logic to show parent folder name
          });
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${fullDir}:`, err);
  }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const allFiles: MediaFile[] = [];

    // Scan all allowed directories
    for (const dir of ALLOWED_DIRS) {
      const dirFiles = await scanDirectory(publicDir, dir);
      allFiles.push(...dirFiles);
    }

    // Sort by modified date (newest first)
    allFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    // Filtering
    const url = new URL(req.url);
    const typeFilter = url.searchParams.get('type');
    const folderFilter = url.searchParams.get('folder');
    const searchFilter = url.searchParams.get('search');

    let filteredFiles = allFiles;

    if (typeFilter && typeFilter !== 'all') {
      filteredFiles = filteredFiles.filter(f => f.type === typeFilter);
    }

    if (folderFilter && folderFilter !== 'all') {
      // folderFilter like 'uploads/blogs'
      // f.folder like 'uploads/blogs'
      filteredFiles = filteredFiles.filter(f => f.folder === folderFilter || f.folder.startsWith(folderFilter + '/'));
    }

    if (searchFilter) {
      filteredFiles = filteredFiles.filter(f => f.name.toLowerCase().includes(searchFilter.toLowerCase()));
    }

    return NextResponse.json({ files: filteredFiles });
  } catch (error: any) {
    console.error('Error listing media files:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
