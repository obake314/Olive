import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '../backend/src/assets/images');

const images = [
  { filename: 'nikujaga.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Braised_pork_and_potatoes_%283089327692%29.jpg' },
  { filename: 'teriyaki-chicken.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chicken_teriyaki_bento_box_-_Massachusetts.jpg' },
  { filename: 'shogayaki.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Shogayaki_002.jpg' },
  { filename: 'saba-misoni.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/SABAMISO_%285814432127%29.jpg' },
  { filename: 'karaage.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Chicken_karaage_003.jpg' },
  { filename: 'curry-rice.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Beef_curry_rice_003.jpg' },
  { filename: 'gyoza.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Gyoza_dumplings_%2853726549642%29.jpg' },
  { filename: 'tonkatsu.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Tonkatsu_003.jpg' },
  { filename: 'miso-soup.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Miso_Soup_001.jpg' },
  { filename: 'kabocha-nimono.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Nimono_of_japanese_pumpkin_2014.jpg' },
  { filename: 'horenso-gomaae.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Hourensougomaae001.jpg' },
  { filename: 'tamagoyaki.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Tamago_yaki.JPG' },
  { filename: 'chikuzenni.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Chikuzen-ni.jpg' },
  { filename: 'kinpira-gobo.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Kinpira_002.jpg' },
  { filename: 'buri-teriyaki.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Teriyaki_yellowtail_%284124948778%29.jpg' },
  { filename: 'ramen.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Shoyu_ramen%2C_at_Kasukabe_Station_%282014.05.05%29_1.jpg' },
  { filename: 'okonomiyaki.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Okonomiyaki_001.jpg' },
  { filename: 'tempura.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Tempura_01.jpg' },
  { filename: 'chawanmushi.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Chawan-mushi.JPG' },
  { filename: 'oden.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Yataioden.jpg' },
  { filename: 'nikudofu.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/%E8%82%89%E8%B1%86%E8%85%90_%285302466096%29.jpg' },
  { filename: 'yakizakana.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Yakizakana.jpg' },
  { filename: 'hijiki-nimono.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Hijiki_%28black_seaweed_and_veggies%29_with_steamed_rice_%288015302575%29.jpg' },
  { filename: 'udon.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Kakeudon.jpg' },
  { filename: 'soba.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Yotsuba_Soba.jpg' },
  { filename: 'oyakodon.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Oyakodon_003.jpg' },
  { filename: 'takoyaki.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Takoyaki.jpg' },
];

import { existsSync } from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const { filename, url } of images) {
  const dest = join(IMAGES_DIR, filename);
  if (existsSync(dest)) {
    const { readFileSync } = await import('fs');
    const content = readFileSync(dest, 'utf8').slice(0, 20);
    if (!content.includes('DOCTYPE') && !content.includes('<html')) {
      console.log(`SKIP ${filename} (already exists)`);
      continue;
    }
  }
  let success = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sleep(2000 * attempt);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OliveApp/1.0)' } });
      if (!res.ok) { console.error(`FAIL ${filename}: HTTP ${res.status}`); break; }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('image')) { console.error(`FAIL ${filename}: content-type=${ct}`); break; }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      console.log(`OK   ${filename} (${buf.length} bytes)`);
      success = true;
      break;
    } catch (e) {
      if (attempt === 3) console.error(`FAIL ${filename}: ${e.message}`);
    }
  }
}
