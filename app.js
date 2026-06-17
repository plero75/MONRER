document.addEventListener('DOMContentLoaded', function () {
  var tabButtons = document.querySelectorAll('[data-tab-target]');
  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var target = button.getAttribute('data-tab-target');
      document.querySelectorAll('.tab-btn').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      document.querySelectorAll('.tab-panel').forEach(function (panel) {
        panel.classList.toggle('active', panel.id === target);
      });
    });
  });

  function euro(value) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
  function number(value) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
  }
  function updateSimulator() {
    var visitorsEl = document.getElementById('visitors');
    if (!visitorsEl) return;
    var visitors = Number(visitorsEl.value);
    var revpp = Number(document.getElementById('revpp').value);
    var fixed = Number(document.getElementById('fixed').value);
    var varpp = Number(document.getElementById('varpp').value);
    var revenue = visitors * revpp;
    var costs = fixed + visitors * varpp;
    var ebitda = revenue - costs;
    var margin = revenue ? ebitda / revenue * 100 : 0;
    var breakEven = revpp > varpp ? Math.ceil(fixed / (revpp - varpp)) : 0;
    var values = {
      visitors: number(visitors), revpp: euro(revpp), fixed: euro(fixed), varpp: euro(varpp),
      revenue: euro(revenue), costs: euro(costs), ebitda: euro(ebitda),
      margin: number(margin) + ' %', breakEven: number(breakEven)
    };
    Object.keys(values).forEach(function (key) {
      document.querySelectorAll('[data-value="' + key + '"]').forEach(function (element) {
        element.textContent = values[key];
      });
    });
    var note = document.getElementById('scenario-note');
    if (note) {
      if (ebitda >= 40000) note.textContent = 'Scénario ambitieux : la priorité devient la qualité d’exploitation et la capacité d’accueil.';
      else if (ebitda >= 0) note.textContent = 'Scénario équilibré : le projet couvre ses coûts. Le seuil de rentabilité est proche de ' + number(breakEven) + ' visiteurs.';
      else note.textContent = 'Scénario fragile : il faut renforcer les préventes, le panier moyen ou réduire les charges fixes.';
    }
  }
  ['visitors', 'revpp', 'fixed', 'varpp'].forEach(function (id) {
    var input = document.getElementById(id);
    if (input) input.addEventListener('input', updateSimulator);
  });
  updateSimulator();

  document.querySelectorAll('.filter-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.getAttribute('data-filter');
      document.querySelectorAll('.filter-btn').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      document.querySelectorAll('.module-item').forEach(function (item) {
        item.classList.toggle('hide', filter !== 'all' && item.getAttribute('data-universe') !== filter);
      });
    });
  });

  var dimensions = {
    'espace petite enfance': { size: '10 × 10 m', footprint: '100 m²', note: 'Zone composite : ne pas additionner Legos XXL et Cubes mousse s’ils sont inclus dans ce mini-parc.' },
    'pitchoune': { size: '3,8 × 3,8 × 2,9 m', footprint: '14,4 m²' },
    'bain de boules': { size: '4,2 × 3,2 × 2,4 m', footprint: '13,4 m²' },
    'legos xxl': { size: 'Tatami 4 × 4 m', footprint: '16 m²' },
    'cubes mousse': { size: 'Tapis 4 × 4 m', footprint: '16 m²' },
    'château gonflable le cheval': { size: '6 × 5,5 × 6 m', footprint: '33 m²' },
    'cheval mécanique': { size: '5,5 × 5,5 × 1,5 m', footprint: '30,3 m²' },
    'peluches à bascule': { size: '10 × 8 × 1,70 m', footprint: '80 m²' },
    'forêt des ouistitis': { size: 'Non communiquées par JM', footprint: 'Emprise à confirmer', pending: true },
    'parcours color': { size: '11,5 × 3,7 × 3,5 m', footprint: '42,6 m²' },
    'parcours ninja': { size: '19 × 3,8 × 5,5 m', footprint: '72,2 m²' },
    'la balayette': { size: 'Diamètre 10 m', footprint: '78,5 m²' },
    'forêt de tarzan': { size: 'Non communiquées par JM', footprint: 'Emprise à confirmer', pending: true },
    'basket puissance 4': { size: '3,8 × 3 × 3,7 m', footprint: '11,4 m²' },
    'bumpers cars': { size: 'Circuit 10 × 8 m', footprint: '80 m²' },
    'bowling géant': { size: '10,5 × 3,5 × 2,5 m', footprint: '36,8 m²' },
    'bornes d’arcade': { size: 'Dimensions non communiquées', footprint: 'À confirmer selon le nombre de bornes', pending: true },
    'baby-foot professionnel': { size: 'Dimensions non communiquées', footprint: 'À confirmer selon modèle classique ou XXL', pending: true },
    'réalité virtuelle trot': { size: '3 × 3 m par simulateur', footprint: '9 m² par simulateur' },
    'grand carrousel traditionnel': { size: 'Référence Petit Manège : 3,20 × 2,15 × 2,30 m', footprint: '6,9 m²', note: 'Le grand carrousel traditionnel définitif reste à identifier et à chiffrer.' }
  };

  if (document.querySelector('.visual-card')) {
    var style = document.createElement('style');
    style.textContent = '.module-dimensions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 8px;padding:10px;border-radius:13px;background:#f7f3ed;border:1px solid #eadfce}.module-dimensions div{min-width:0}.module-dimensions b{display:block;margin-bottom:3px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#62677b}.module-dimensions span{display:block;font-size:12px;font-weight:900;line-height:1.25;color:#10133f}.module-dimensions.pending{background:#fff4dd;border-color:#efd39a}.dimension-note{margin:7px 0 0!important;padding:8px 10px;border-radius:10px;background:#fff8e8;color:#725a1f!important;font-size:10px!important;line-height:1.35!important}@media(max-width:680px){.module-dimensions{grid-template-columns:1fr}}';
    document.head.appendChild(style);

    document.querySelectorAll('.visual-card').forEach(function (card) {
      var key = String(card.getAttribute('data-name') || '').toLowerCase().trim();
      var data = dimensions[key];
      if (!data) return;
      var copy = card.querySelector('.module-copy');
      if (!copy || copy.querySelector('.module-dimensions')) return;

      var box = document.createElement('div');
      box.className = 'module-dimensions' + (data.pending ? ' pending' : '');
      box.innerHTML = '<div><b>Dimensions produit</b><span>' + data.size + '</span></div><div><b>Emprise au sol</b><span>' + data.footprint + '</span></div>';
      var source = copy.querySelector('.module-source');
      if (source) copy.insertBefore(box, source);
      else copy.appendChild(box);

      if (data.note) {
        var noteLine = document.createElement('p');
        noteLine.className = 'dimension-note';
        noteLine.textContent = data.note;
        if (source) copy.insertBefore(noteLine, source);
        else copy.appendChild(noteLine);
      }
    });
  }

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var current = 0;
  function showSlide(index) {
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    slides.forEach(function (slide, i) { slide.classList.toggle('active', i === current); });
    document.querySelectorAll('.slide-dots i').forEach(function (dot, i) { dot.classList.toggle('active', i === current); });
    var counter = document.getElementById('slide-counter');
    if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
  }
  if (slides.length) {
    var dots = document.querySelector('.slide-dots');
    if (dots) slides.forEach(function (_, i) {
      var dot = document.createElement('i');
      dot.addEventListener('click', function () { showSlide(i); });
      dots.appendChild(dot);
    });
    var prev = document.getElementById('prev-slide');
    var next = document.getElementById('next-slide');
    if (prev) prev.addEventListener('click', function () { showSlide(current - 1); });
    if (next) next.addEventListener('click', function () { showSlide(current + 1); });
    showSlide(0);
  }
});
