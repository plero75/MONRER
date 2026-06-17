const products = {
  'espace-petite-enfance': 'https://jmprestations.com/location/le-village-des-enfants/',
  'pitchoune': 'https://jmprestations.com/portfolio-item/pitchoune/',
  'bain-de-boules': 'https://jmprestations.com/portfolio-item/bain-de-boules/',
  'legos-xxl': 'https://jmprestations.com/portfolio-item/legos-xxl/',
  'cubes-mousse': 'https://jmprestations.com/portfolio-item/cubes-mousses/',
  'le-cheval': 'https://jmprestations.com/portfolio-item/le-cheval/',
  'cheval-mecanique': 'https://jmprestations.com/portfolio-item/simulateur/',
  'peluches-bascule': 'https://jmprestations.com/portfolio-item/peluches-a-bascule/',
  'foret-ouistitis': 'https://jmprestations.com/portfolio-item/foret-des-ouistitis/',
  'parcours-color': 'https://jmprestations.com/portfolio-item/parcours-color/',
  'parcours-ninja': 'https://jmprestations.com/portfolio-item/parcours-ninja/',
  'balayette': 'https://jmprestations.com/portfolio-item/la-balayette/',
  'foret-tarzan': 'https://jmprestations.com/portfolio-item/foret-tarzan/',
  'basket-puissance-4': 'https://jmprestations.com/portfolio-item/le-basket-puissance-4/',
  'bumpers-cars': 'https://jmprestations.com/portfolio-item/bumpers-cars/',
  'bowling-geant': 'https://jmprestations.com/portfolio-item/bowling-geant/',
  'bornes-arcade': 'https://jmprestations.com/portfolio-item/borne-jeux-darcade/',
  'baby-foot': 'https://jmprestations.com/portfolio-item/baby-foot-professionnel/',
  'realite-virtuelle': 'https://jmprestations.com/portfolio-item/realite-virtuelle/',
  'grand-carrousel': 'https://jmprestations.com/portfolio-item/petit-manege/'
};

function decode(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
}

function productImage(html = '') {
  const metaPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
  ];
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) return decode(match[1]);
  }

  const imagePatterns = [
    /<img[^>]+class=["'][^"']*(?:wp-post-image|portfolio|attachment-full)[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:wp-post-image|portfolio|attachment-full)[^"']*["']/i,
    /<img[^>]+src=["'](https:\/\/jmprestations\.com\/wp-content\/uploads\/[^"']+)["']/i
  ];
  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    if (match && match[1] && !/logo|favicon|picto/i.test(match[1])) return decode(match[1]);
  }
  return '';
}

function fallbackSvg(key) {
  const title = String(key || 'module').replace(/[^a-z0-9-]/gi, ' ').slice(0, 60);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d4561"/><stop offset="1" stop-color="#e6005c"/></linearGradient></defs><rect width="900" height="560" fill="url(#g)"/><circle cx="760" cy="90" r="160" fill="#fff" opacity=".12"/><text x="55" y="270" fill="#fff" font-family="Arial" font-size="44" font-weight="700">${title}</text><text x="55" y="325" fill="#fff" font-family="Arial" font-size="22" opacity=".82">Photo produit JM Prestations à confirmer</text></svg>`;
}

export default async function handler(req, res) {
  const key = String(req.query.key || '');
  const pageUrl = products[key];

  if (pageUrl) {
    try {
      const pageResponse = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecreDaysVincennes/1.0)' }
      });
      if (pageResponse.ok) {
        const imageUrl = productImage(await pageResponse.text());
        if (imageUrl && imageUrl.startsWith('https://jmprestations.com/')) {
          const imageResponse = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecreDaysVincennes/1.0)' }
          });
          if (imageResponse.ok) {
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
            res.status(200).send(buffer);
            return;
          }
        }
      }
    } catch (error) {
      console.error('JM image error', key, error && error.message ? error.message : error);
    }
  }

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(fallbackSvg(key));
}
