import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

interface ExtractedRecipe {
  name: string;
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  recipe_text: string;
}

// 調味料リスト（買い物リストから除外用）
const SEASONING_NAMES = new Set([
  '塩', '砂糖', '上白糖', '薄口しょうゆ', 'しょうゆ', '醤油', '濃口醤油', '味噌', 'みそ', '酢', 'みりん', '本みりん',
  '酒', '料理酒', '油', 'サラダ油', 'ごま油', 'オリーブオイル', 'オリーブ油', 'バター', '無塩バター',
  'こしょう', '胡椒', '黒こしょう', '白こしょう', 'ソース', 'マヨネーズ', 'ケチャップ',
  '片栗粉', '小麦粉', '薄力粉', '強力粉', 'だし', 'だし汁', '出汁', '顆粒だし', '和風だし',
  'コンソメ', '鶏がらスープ', '鶏ガラスープの素', '中華スープの素', '豆板醤', '甜麺醤', 'オイスターソース',
  '白だし', 'めんつゆ', 'ポン酢', '七味', '一味', 'わさび', '辛子', '粒マスタード', 'はちみつ', '蜂蜜',
  'チューブ生姜', 'チューブにんにく', 'すりごま', 'いりごま', '白ごま',
]);
const SEASONING_UNITS = new Set(['適量', '少々', 'お好みで', 'ひとつまみ', '少量']);

function isSeasoning(name: string, unit: string): boolean {
  if (SEASONING_UNITS.has(unit.trim())) return true;
  if (SEASONING_NAMES.has(name.trim())) return true;
  // 「〜少々」「〜適量」のような複合パターン
  if (/少々|適量|少量/.test(unit.trim())) return true;
  return false;
}

async function extractFromUrl(url: string): Promise<ExtractedRecipe> {
  const { default: fetch } = await import('node-fetch');
  const { load } = await import('cheerio');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();
  const $ = load(html);

  // noindex/hidden コンテンツを除去
  $('script, style, noscript, iframe, [hidden], [aria-hidden="true"]').remove();

  // ページタイトルから料理名を取得
  let name = '';
  // JSON-LD を最優先
  $('script[type="application/ld+json"]').each((_, el) => {
    if (name) return;
    try {
      const data = JSON.parse($(el).html() || '');
      const recipes = Array.isArray(data) ? data : [data];
      for (const r of recipes) {
        const target = r['@type'] === 'Recipe' ? r
          : r['@graph']?.find((g: any) => g['@type'] === 'Recipe');
        if (target?.name) { name = String(target.name).trim(); break; }
      }
    } catch {}
  });
  if (!name) {
    // OGP
    name = $('meta[property="og:title"]').attr('content')?.trim() || '';
  }
  if (!name) {
    name = $('h1').first().text().trim() || $('title').text().trim();
  }
  // よくある余分部分を除去
  name = name
    .replace(/\s*[｜|]\s*.+$/, '')
    .replace(/\s*[-–—]\s*.+$/, '')
    .replace(/のレシピ.*$/, '')
    .replace(/レシピ・作り方.*$/, '')
    .trim()
    .slice(0, 60);

  // 概要（description）
  let description = $('meta[name="description"]').attr('content')?.trim()
    || $('meta[property="og:description"]').attr('content')?.trim()
    || '';
  description = description.slice(0, 200);

  // 材料のパース
  const ingredients: ExtractedRecipe['ingredients'] = [];
  const seen = new Set<string>();

  // JSON-LD (Recipe schema)
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
          if (parsed && !isSeasoning(parsed.name, parsed.unit)) ingredients.push(parsed);
        }
      }
    } catch {}
  });

  // JSON-LDで取れなかった場合はHTMLからサイト別・汎用パース
  if (ingredients.length === 0) {
    const candidates: string[] = [];

    // クックパッド
    $('.ingredient_name, .ingredient_quantity, [class*="Ingredient"]').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length >= 1 && text.length < 60) candidates.push(text);
    });

    // 楽天レシピ / E・レシピ / デリッシュキッチン
    if (candidates.length === 0) {
      $('[class*="ingredient"], [class*="material"], [class*="zairyo"], [class*="Zairyo"]').each((_, el) => {
        $(el).find('li, tr, p, span').each((__, child) => {
          const text = $(child).text().trim().replace(/\s+/g, ' ');
          if (text.length >= 2 && text.length < 60) candidates.push(text);
        });
      });
    }

    // 汎用: li, tr から
    if (candidates.length === 0) {
      $('li, tr').each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.length >= 2 && text.length < 50) candidates.push(text);
      });
    }

    for (const text of [...new Set(candidates)].slice(0, 40)) {
      const parsed = parseIngredientText(text);
      if (parsed && !isSeasoning(parsed.name, parsed.unit) && !seen.has(parsed.name)) {
        seen.add(parsed.name);
        ingredients.push(parsed);
      }
    }
  }

  // 手順テキスト抽出
  let recipe_text = '';

  // JSON-LDから
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe_text) return;
    try {
      const data = JSON.parse($(el).html() || '');
      const recipes = Array.isArray(data) ? data : [data];
      for (const r of recipes) {
        const target = r['@type'] === 'Recipe' ? r : r['@graph']?.find((g: any) => g['@type'] === 'Recipe');
        if (!target?.recipeInstructions) continue;
        const steps: string[] = [];
        const instr = target.recipeInstructions;
        if (Array.isArray(instr)) {
          instr.forEach((s: any, i: number) => {
            const text = typeof s === 'string' ? s : (s.text || s.name || '');
            if (text.length > 5) steps.push(`${i + 1}. ${text.trim()}`);
          });
        } else if (typeof instr === 'string') {
          recipe_text = instr.slice(0, 2000);
          return;
        }
        if (steps.length > 0) recipe_text = steps.slice(0, 20).join('\n');
        break;
      }
    } catch {}
  });

  // HTMLから手順
  if (!recipe_text) {
    const stepSelectors = [
      '[class*="step"]', '[class*="instruction"]', '[class*="direction"]',
      '[class*="procedure"]', '[class*="howto"]', '[class*="method"]',
      'ol > li',
    ];
    for (const sel of stepSelectors) {
      const steps: string[] = [];
      $(sel).each((i, el) => {
        const t = $(el).text().trim().replace(/\s+/g, ' ');
        if (t.length > 10 && t.length < 500) steps.push(`${i + 1}. ${t}`);
      });
      if (steps.length >= 2) { recipe_text = steps.slice(0, 20).join('\n'); break; }
    }
  }

  return {
    name: name || '（料理名未取得）',
    description,
    ingredients: ingredients.slice(0, 30),
    recipe_text,
  };
}

// "じゃがいも 2個" → { name: "じゃがいも", quantity: 2, unit: "個" }
function parseIngredientText(text: string): { name: string; quantity: number; unit: string } | null {
  if (!text || /^\d+$/.test(text) || text.length > 60) return null;

  // 「材料名 数量単位」の形式をパース
  // 例: "じゃがいも 2個", "牛薄切り肉 200g", "だし汁 300ml"
  const unitPattern = '(g|ml|cc|kg|L|ℓ|枚|本|個|切れ|片|束|袋|缶|パック|合|カップ|大さじ|小さじ|少々|適量|少量|本分|人分|かけ|玉)?';
  const numPattern = '([\\d０-９./½¼¾〜~]+)?';
  const re = new RegExp(`^(.+?)\\s*${numPattern}\\s*${unitPattern}\\s*$`);
  const m = text.match(re);
  if (!m) return { name: text.trim().slice(0, 30), quantity: 0, unit: '' };

  let ingredientName = m[1].trim();
  // 不要なプレフィックス除去（「・」「●」「◎」等）
  ingredientName = ingredientName.replace(/^[・●◎◆▶▷▸►\-－—]+/, '').trim();
  if (!ingredientName || ingredientName.length > 30) return null;

  const qtyStr = m[2] ? m[2].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) : '';
  const qty = qtyStr ? parseFloat(qtyStr) : 0;
  const unit = m[3] || '';

  return { name: ingredientName, quantity: isNaN(qty) ? 0 : qty, unit };
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
