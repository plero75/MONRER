const products = {
  'espace-petite-enfance': { url: 'https://jmprestations.com/location/le-village-des-enfants/', title: 'village enfants espace petite enfance' },
  'pitchoune': { url: 'https://jmprestations.com/portfolio-item/pitchoune/', title: 'pitchoune' },
  'bain-de-boules': { url: 'https://jmprestations.com/portfolio-item/bain-de-boules/', title: 'bain de boules' },
  'legos-xxl': { url: 'https://jmprestations.com/portfolio-item/legos-xxl/', title: 'legos xxl briques geantes' },
  'cubes-mousse': { url: 'https://jmprestations.com/portfolio-item/cubes-mousses/', title: 'cubes mousse' },
  'le-cheval': { url: 'https://jmprestations.com/portfolio-item/le-cheval/', title: 'le cheval gonflable' },
  'cheval-mecanique': { url: 'https://jmprestations.com/portfolio-item/simulateur/', title: 'simulateur mecanique' },
  'peluches-bascule': { url: 'https://jmprestations.com/portfolio-item/peluches-a-bascule/', title: 'peluches bascule' },
  'foret-ouistitis': { url: 'https://jmprestations.com/portfolio-item/foret-des-ouistitis/', title: 'foret ouistitis' },
  'parcours-color': { url: 'https://jmprestations.com/portfolio-item/parcours-color/', title: 'parcours color' },
  'parcours-ninja': { url: 'https://jmprestations.com/portfolio-item/parcours-ninja/', title: 'parcours ninja' },
  'balayette': { url: 'https://jmprestations.com/portfolio-item/la-balayette/', title: 'balayette' },
  'foret-tarzan': { url: 'https://jmprestations.com/portfolio-item/foret-tarzan/', title: 'foret tarzan' },
  'basket-puissance-4': { url: 'https://jmprestations.com/portfolio-item/le-basket-puissance-4/', title: 'basket puissance 4' },
  'bumpers-cars': { url: 'https://jmprestations.com/portfolio-item/bumpers-cars/', title: 'bumpers cars' },
  'bowling-geant': { url: 'https://jmprestations.com/portfolio-item/bowling-geant/', title: 'bowling geant' },
  'bornes-arcade': { url: 'https://jmprestations.com/portfolio-item/borne-jeux-darcade/', title: 'borne jeux arcade' },
  'baby-foot': { url: 'https://jmprestations.com/portfolio-item/baby-foot-professionnel/', title: 'baby foot professionnel' },
  'realite-virtuelle': { url: 'https://jmprestations.com/portfolio-item/realite-virtuelle/', title: 'realite virtuelle' },
  'grand-carrousel': { url: 'https://jmprestations.com/portfolio-item/petit-manege/', title: 'petit manege' }
};

const rejectedWords = [
  'logo', 'logojm', 'favicon', 'picto', 'icon', 'sprite', 'loader', 'loading',
  'placeholder', 'footer', 'header', 'cookie', 'facebook', 'instagram',
  'nouveaute2026', 'v2-logo-jm', 'logo-jm', 'jm-prestations-logo'
];

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function decode(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#x2F;/g, '/');
}

function attr(tag, name) {
  const match = tag.match(new RegExp('(?:\\s|^)' + name + '=["\\\']([^"\\\']+)["\\\']', 'i'));
  return match ? decode(match[1]) : '';
}

function absoluteUrl(value, pageUrl) {
  if (!value || value.startsWith('data:')) return '';
  try {
    return new URL(value, pageUrl).href;
  } catch (error) {
    return '';
  }
}

function bestFromSrcset(value = '') {
  const items = value.split(',').map(item => item.trim().split(/\s+/)[0]).filter(Boolean);
  return items.length ? items[items.length - 1] : '';
}

function tokens(value = '') {
  return normalize(value).split(' ').filter(word => word.length >= 3 && !['avec', 'pour', 'dans', 'les', 'des', 'une'].includes(word));
}

function collectImages(html, pageUrl, expectedTitle) {
  const h1Index = html.search(/<h1\b/i);
  let endIndex = -1;
  if (h1Index >= 0) {
    const rest = html.slice(h1Index);
    const infoMatch = rest.search(/>\s*INFOS\s*</i);
    if (infoMatch >= 0) endIndex = h1Index + infoMatch;
  }

  const mainSegment = h1Index >= 0
    ? html.slice(h1Index, endIndex > h1Index ? endIndex : Math.min(html.length, h1Index + 22000))
    : html;

  const pageTitleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const pageTitle = normalize((pageTitleMatch && pageTitleMatch[1] || '').replace(/<[^>]+>/g, ' '));
  const wantedTokens = [...new Set([...tokens(expectedTitle), ...tokens(pageTitle)])];
  const candidates = [];
  const seen = new Set();

  function addCandidate(url, inMain, meta = {}) {
    if (!url || seen.has(url) || !/jmprestations\.com\/wp-content\/uploads\//i.test(url)) return;
    const filename = normalize(url.split('/').pop().split('?')[0]);
    const alt = normalize(meta.alt || '');
    const classes = normalize(meta.classes || '');
    const combined = `${filename} ${alt} ${classes}`;
    if (rejectedWords.some(word => combined.includes(normalize(word)))) return;

    let score = inMain ? 100 : 0;
    if (wantedTokens.some(word => alt.includes(word))) score += 90;
    if (wantedTokens.some(word => filename.includes(word))) score += 70;
    if (/wp post image|attachment full|portfolio|single/.test(classes)) score += 35;
    if (/detour|recreedays|gonflable|parcours|manege|tarzan|ninja|color|bumpers|basket|lego|cube|pitchoune|boule|arcade|baby|virtuelle/.test(filename)) score += 25;
    if (meta.width >= 600 || meta.height >= 400) score += 20;
    if (meta.width > 0 && meta.height > 0 && meta.width < 220 && meta.height < 220) score -= 100;

    seen.add(url);
    candidates.push({ url, score });
  }

  function scanImageTags(segment, inMain) {
    const tags = segment.match(/<img\b[^>]*>/gi) || [];
    for (const tag of tags) {
      const srcset = attr(tag, 'data-srcset') || attr(tag, 'srcset');
      const rawUrl = attr(tag, 'data-lazy-src') || attr(tag, 'data-src') || attr(tag, 'data-original') || bestFromSrcset(srcset) || attr(tag, 'src');
      const url = absoluteUrl(rawUrl, pageUrl);
      addCandidate(url, inMain, {
        alt: attr(tag, 'alt') || attr(tag, 'title'),
        classes: attr(tag, 'class'),
        width: Number(attr(tag, 'width') || 0),
        height: Number(attr(tag, 'height') || 0)
      });
    }
  }

  function scanRawUploadUrls(segment, inMain) {
    const matches = segment.match(/https:\/\/jmprestations\.com\/wp-content\/uploads\/[^\"'<>\s]+/gi) || [];
    for (const raw of matches) {
      const cleaned = decode(raw.replace(/\\u002F/g, '/').replace(/\\\//g, '/'));
      addCandidate(cleaned, inMain);
    }
  }

  scanImageTags(mainSegment, true);
  scanRawUploadUrls(mainSegment, true);
  if (!candidates.length) {
    scanImageTags(html, false);
    scanRawUploadUrls(html, false);
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.length ? candidates[0].url : '';
}

async function resolvePage(product) {
  let response = await fetch(product.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecreDaysVincennes/3.0)' } });
  if (response.ok) return { url: product.url, html: await response.text() };

  const searchUrl = `https://jmprestations.com/wp-json/wp/v2/search?search=${encodeURIComponent(product.title)}&per_page=10`;
  const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecreDaysVincennes/3.0)' } });
  if (!searchResponse.ok) return null;
  const results = await searchResponse.json();
  const found = Array.isArray(results) ? results.find(item => item && item.url) : null;
  if (!found) return null;
  response = await fetch(found.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecreDaysVincennes/3.0)' } });
  return response.ok ? { url: found.url, html: await response.text() } : null;
}

function fallbackSvg(key) {
  const title = String(key || 'module').replace(/[^a-z0-9-]/gi, ' ').slice(0, 60);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d4561"/><stop offset="1" stop-color="#e6005c"/></linearGradient></defs><rect width="900" height="560" fill="url(#g)"/><text x="55" y="270" fill="#fff" font-family="Arial" font-size="44" font-weight="700">${title}</text><text x="55" y="325" fill="#fff" font-family="Arial" font-size="22" opacity=".82">Photo produit JM Prestations à confirmer</text></svg>`;
}

export default async function handler(req, res) {
  const key = String(req.query.key || '');
  const product = products[key];

  if (product) {
    try {
      const page = await resolvePage(product);
      const imageUrl = page ? collectImages(page.html, page.url, product.title) : '';
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecreDaysVincennes/3.0)' } });
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
          res.setHeader('Cache-Control', 'no-store');
          res.status(200).send(buffer);
          return;
        }
      }
    } catch (error) {
      console.error('JM image error', key, error && error.message ? error.message : error);
    }
  }

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(fallbackSvg(key));
}
