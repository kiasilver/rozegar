
// Use standard imports
import { JSDOM } from 'jsdom';
import * as fs from 'fs';

const COMPANIES = [
    { name: 'Modiran Khodro', url: 'https://bama.ir/price?company=modiran' }
];

async function main() {
    for (const company of COMPANIES) {
        console.log(`Fetching ${company.name}...`);
        try {
            const response = await fetch(company.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) {
                console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
                continue;
            }
            const html = await response.text();
            console.log(`HTML fetched (${html.length} chars). Parsing...`);

            const dom = new JSDOM(html);
            const doc = dom.window.document;

            // Log entire HTML structure if small, or specific parts
            // Let's dump the HTML to a file so we can read it
            fs.writeFileSync('bama-dump.html', html);
            console.log('Dumped HTML to bama-dump.html');

            // Try to find elements again
            // Look for 'price-list-item' or similar class names if visible
            // Or look for container of 'اکستریم'

        } catch (error) {
            console.error(error);
        }
    }
}

main().catch(console.error);
