import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

interface ExtractedRecipe {
  name: string;
  ingredients: { name: string; quantity: number; unit: string }[];
}

// URLからHTMLを取得してレシピ情報を抽出
async function extractFromUrl(url: string): Promise<ExtractedRecipe> {
  const { default: fetch } = await import('node-fetch');
  const { load } = await import('cheerio');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OliveBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();
  const $ = load(html);

  // ページタイトルから料理名を取得
  let name = $('h1').first().text().trim() || $('title').text().trim();
  // よくあるサイトのタイトル余分部分を除去
  name = name.replace(/[\|｜\-–—].*$/, '').trim();
  name = name.replace(/のレシピ.*$/, '').trim();
  name = name.slice(0, 60);

  // 材料のパース
  const ingredients: ExtractedRecipe['ingredients'] = [];
  const seen = new Set<string>();

  // JSON-LD (Recipe schema) を最初に試す
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      const recipes = Array.isArray(data) ? data : [data];
      for (const r of recipes) {
        const target = r['@type'] === 'Recipe' ? r : r['@graph']?.find((g: any) => g['@type'] === 'Recipe');
        if (!target?.recipeIngredient) continue;
        for (const raw of target.recipeIngredient) {
          const text = String(raw).trim();
          if (!text || seen.has(text)) continue;
          seen.add(text);
          const parsed = parseIngredientText(text);
          if (parsed) ingredients.push(parsed);
        }
        if (target.name && !name) name = target.name;
      }
    } catch {}
  });

  // JSON-LDで取れなかった場合はHTMLからヒューリスティックに抽出
  if (ingredients.length === 0) {
    const candidates: string[] = [];
    // よくある材料セクションのセレクタ
    const selectors = [
      '.ingredient', '.ingredients', '[class*="ingredient"]',
      '.recipe-ingredient', '.material', '.zairyou',
      'li', 'tr',
    ];
    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.length > 2 && text.length < 50) candidates.push(text);
      });
      if (candidates.length > 3) break;
    }
    for (const text of candidates.slice(0, 30)) {
      if (seen.has(text)) continue;
      seen.add(text);
      const parsed = parseIngredientText(text);
      if (parsed) ingredients.push(parsed);
    }
  }

  return { name: name || '（料理名未取得）', ingredients: ingredients.slice(0, 30) };
}

// "じゃがいも 2個" → { name: "じゃがいも", quantity: 2, unit: "個" }
function parseIngredientText(text: string): { name: string; quantity: number; unit: string } | null {
  // 空や数字だけは除外
  if (!text || /^\d+$/.test(text)) return null;

  const unitPattern = '(g|ml|cc|kg|L|ℓ|枚|本|個|切れ|片|束|袋|缶|パック|合|カップ|大さじ|小さじ|少々|適量|少量)?';
  const numPattern = '([\\d０-９./½¼¾]+)?';
  const re = new RegExp(`^(.+?)\\s*${numPattern}\\s*${unitPattern}\\s*$`);
  const m = text.match(re);
  if (!m) return { name: text.slice(0, 30), quantity: 0, unit: '' };

  const name = m[1].trim().slice(0, 30);
  if (!name || name.length > 30) return null;

  const qty = m[2] ? parseFloat(m[2].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))) : 0;
  const unit = m[3] || '';

  return { name, quantity: isNaN(qty) ? 0 : qty, unit };
}

// POST /recipes/extract
router.post('/extract', async (req: AuthRequest, res: Response) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  try {
    const recipe = await extractFromUrl(url);
    res.json(recipe);
  } catch (e: any) {
    res.status(422).json({ error: `抽出に失敗しました: ${e.message}` });
  }
});

export default router;
