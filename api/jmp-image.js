const pages = {
  'espace-petite-enfance': ['https://jmprestations.com/location/le-village-des-enfants/'],
  'pitchoune': ['https://jmprestations.com/portfolio-item/pitchoune/', 'https://jmprestations.com/location/le-village-des-enfants/'],
  'bain-de-boules': ['https://jmprestations.com/portfolio-item/bain-de-boules/', 'https://jmprestations.com/location/le-village-des-enfants/'],
  'legos-xxl': ['https://jmprestations.com/portfolio-item/legos-xxl/', 'https://jmprestations.com/location/le-village-des-enfants/'],
  'cubes-mousse': ['https://jmprestations.com/portfolio-item/cubes-mousses/', 'https://jmprestations.com/location/le-village-des-enfants/'],
  'le-cheval': ['https://jmprestations.com/portfolio-item/le-cheval/', 'https://jmprestations.com/location/le-village-des-enfants/'],
  'cheval-mecanique': ['https://jmprestations.com/portfolio-item/simulateur/', 'https://jmprestations.com/location/adrenaline-defis-sportifs/'],
  'peluches-bascule': ['https://jmprestations.com/portfolio-item/peluches-a-bascule/', 'https://jmprestations.com/location/le-village-des-enfants/'],
  'foret-ouistitis': ['https://jmprestations.com/portfolio-item/foret-des-ouistitis/', 'https://jmprestations.com/location/espace-nature-tradition/'],
  'parcours-color': ['https://jmprestations.com/portfolio-item/parcours-color/'],
  'parcours-ninja': ['https://jmprestations.com/portfolio-item/parcours-ninja/'],
  'balayette': ['https://jmprestations.com/portfolio-item/la-balayette/', 'https://jmprestations.com/location/adrenaline-defis-sportifs/'],
  'foret-tarzan': ['https://jmprestations.com/portfolio-item/foret-de-tarzan/', 'https://jmprestations.com/location/espace-nature-tradition/'],
  'basket-puissance-4': ['https://jmprestations.com/portfolio-item/le-basket-puissance-4/'],
  'bumpers-cars': ['https://jmprestations.com/portfolio-item/bumpers-cars/', 'https://jmprestations.com/location/larene-des-pilotes/'],
  'bowling-geant': ['https://jmprestations.com/portfolio-item/bowling-geant/', 'https://jmprestations.com/location/defis-partages/'],
  'bornes-arcade': ['https://jmprestations.com/portfolio-item/borne-jeux-darcade/', 'https://jmprestations.com/location/defis-partages/'],
  'baby-foot': ['https://jmprestations.com/portfolio-item/baby-foot-professionnel/', 'https://jmprestations.com/location/defis-partages/'],
  'realite-virtuelle': ['https://jmprestations.com/portfolio-item/realite-virtuelle/', 'https://jmprestations.com/location/univers-phygital-innovation/'],
  'grand-carrousel': ['https://jmprestations.com/portfolio-item/petit-manege/', 'https://jmprestations.com/location/espace-nature-tradition/']
};

function imageFromHtml(html) {
  const marker = 'property="og:image"';
  let at = html.indexOf(marker);
  if (at < 0) at = html.indexOf("property='og:image'");
  if (at < 0) return '';
  const start = Math.max(0, at - 250);
  const end = Math.min(html.length, at + 500);
  const chunk = html.slice(start, end);
  const contentAt = chunk.indexOf('content=');
  if (contentAt < 0) return '';
  const quote = chunk[contentAt + 8];
  const valueStart = contentAt + 9;
  const valueEnd = chunk.indexOf(quote, valueStart);
  if (valueEnd < 0) return '';
  return chunk.slice(valueStart, valueEnd).replace(/&amp;/g, '&');
}

function fallback(key) {
  const title = String(key || 'module').replace(/[^a-z0-9-]/gi, ' ').slice(0, 60);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d4561"/><stop offset="1" stop-color="#e6005c"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="670" cy="80" r="150" fill="#fff" opacity=".12"/><text x="48" y="250" fill="#fff" font-family="Arial" font-size="38" font-weight="700">' + title + '</text><text x="48" y="300" fill="#fff" font-family="Arial" font-size="20" opacity=".8">JM Prestations · visuel à confirmer</text></svg>';
}

export default async function handler(req, res) {
  const key = String(req.query.key || '');
  const candidates = pages[key] || [];
  for (const page of candidates) {
    try {
      const response = await fetch(page, { headers: { 'User-Agent': 'Mozilla/5.0 RecreDays' } });
      if (!response.ok) continue;
      const image = imageFromHtml(await response.text());
      if (image && image.startsWith('https://jmprestations.com/')) {
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
        res.redirect(302, image);
        return;
      }
    } catch (error) {}
  }
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.status(200).send(fallback(key));
}
