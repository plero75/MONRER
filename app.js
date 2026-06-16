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
