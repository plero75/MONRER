const direct = {
  'foret-tarzan': 'https://jmprestations.com/wp-content/uploads/2021/03/ForetTarzan_BITUME.jpg'
};

const pages = {
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
  'basket-puissance-4': 'https://jmprestations.com/portfolio-item/le-basket-puissance-4/',
  'bumpers-cars': 'https://jmprestations.com/portfolio-item/bumpers-cars/',
  'bowling-geant': 'https://jmprestations.com/portfolio-item/bowling-geant/',
  'bornes-arcade': 'https://jmprestations.com/portfolio-item/borne-jeux-darcade/',
  'baby-foot': 'https://jmprestations.com/portfolio-item/baby-foot-professionnel/',
  'realite-virtuelle': 'https://jmprestations.com/portfolio-item/realite-virtuelle/',
  'grand-carrousel': 'https://jmprestations.com/portfolio-item/petit-manege/'
};

function findImage(html) {
  const matches = html.match(/https:\/\/jmprestations\.com\/wp-content\/uploads\/[^\"'<> ]+\.(?:jpg|jpeg|png|webp)/gi) || [];
  return matches.find(url => !/logo|picto|favicon/i.test(url)) || '';
}

function fallback(key) {
  const safe = String(key || 'module').replace(/[^a-z0-9-]/gi, ' ').slice(0, 50);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#0d4561"/><text x="45" y="245" fill="#fff" font-family="Arial" font-size="38" font-weight="700">${safe}</text><text x="45" y="295" fill="#fff" font-family="Arial" font-size="20">Visuel JM à confirmer</text></svg>`;
}

export default async function handler(req, res) {
  const key = String(req.query.key || '');
  if (direct[key]) return res.redirect(302, direct[key]);
  const page = pages[key];
  if (page) {
    try {
      const response = await fetch(page);
      const image = response.ok ? findImage(await response.text()) : '';
      if (image) return res.redirect(302, image);
    } catch (error) {}
  }
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.status(200).send(fallback(key));
}
