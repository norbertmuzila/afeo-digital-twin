import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Logic to inject for the Report Generator
report_js = """
// ─── WAFEO REPORT GENERATOR LOGIC ───────────────────────────────────────
const btnGenerateReport = document.getElementById('btnGenerateReport');
const wafeoReportModal = document.getElementById('wafeoReportModal');
const btnCloseReport = document.getElementById('btnCloseReport');

// Slider Elements
const ssRange = document.getElementById('ssRange');
const ssWrapper = document.getElementById('ssWrapper');
const ssHandle = document.getElementById('ssHandle');
const ssImgBefore = document.getElementById('ss-img-before');
const ssImgAfter = document.getElementById('ss-img-after');
const ssLabelLeft = document.querySelector('.ss-label-left');
const ssLabelRight = document.querySelector('.ss-label-right');

// Mode Data
const reportModes = {
  ndvi: {
    before: 'https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&w=800&q=80',
    after: 'https://images.unsplash.com/photo-1589419161642-cb33cd9f5a01?auto=format&fit=crop&w=800&q=80',
    label1: 'Pre-Season NDVI',
    label2: 'Current NDVI',
    dev: '-12.4%', devClass: 'negative',
    risk: 'Elevated', riskClass: 'warning',
    conf: 'High (94%)', confClass: 'positive'
  },
  temp: {
    before: 'https://images.unsplash.com/photo-1464617530960-93ed96fc9dfb?auto=format&fit=crop&w=800&q=80',
    after: 'https://images.unsplash.com/photo-1541845157-a6d2d100c931?auto=format&fit=crop&w=800&q=80',
    label1: 'Historical Avg',
    label2: 'Current Heatmap',
    dev: '+2.8°C', devClass: 'negative',
    risk: 'Severe', riskClass: 'negative',
    conf: 'High (91%)', confClass: 'positive'
  },
  water: {
    before: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=800&q=80',
    after: 'https://images.unsplash.com/photo-1533556094269-e70a6c6a26d2?auto=format&fit=crop&w=800&q=80',
    label1: 'Previous Year',
    label2: 'Current Level',
    dev: '-4.1m', devClass: 'warning',
    risk: 'Moderate', riskClass: 'warning',
    conf: 'Med (82%)', confClass: 'warning'
  }
};

// Open Modal
if (btnGenerateReport) {
  btnGenerateReport.addEventListener('click', () => {
    if (wafeoReportModal) {
      btnGenerateReport.innerHTML = '<span class="spin">??</span> Generating WAFEO Report...';
      btnGenerateReport.style.opacity = '0.7';
      
      setTimeout(() => {
        btnGenerateReport.innerHTML = '<span style="font-size: 20px;">??</span> Generate Comprehensive WAFEO Report';
        btnGenerateReport.style.opacity = '1';
        wafeoReportModal.style.display = 'flex';
        // Force a resize calculation
        setTimeout(() => { ssRange.dispatchEvent(new Event('input')); }, 50);
      }, 1500);
    }
  });
}

// Close Modal
if (btnCloseReport) {
  btnCloseReport.addEventListener('click', () => {
    wafeoReportModal.style.display = 'none';
  });
}

// Slider Drag Logic
if (ssRange) {
  ssRange.addEventListener('input', (e) => {
    const val = e.target.value;
    ssWrapper.style.width = `${val}%`;
    ssHandle.style.left = `${val}%`;
  });
}

// Handle Window Resize for Slider Background Image Match
window.addEventListener('resize', () => {
  if (wafeoReportModal && wafeoReportModal.style.display === 'flex') {
    const containerWidth = document.querySelector('.split-slider-container').offsetWidth;
    ssImgAfter.style.width = `${containerWidth}px`;
    ssImgAfter.style.maxWidth = `${containerWidth}px`;
  }
});

// Mode Toggle Logic
window.setSliderMode = function(mode) {
  // Update UI Tabs
  document.querySelectorAll('.rt-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.rt-btn[data-mode="${mode}"]`).classList.add('active');
  
  // Update Images & Labels
  const data = reportModes[mode];
  ssImgBefore.src = data.before;
  ssImgAfter.src = data.after;
  ssLabelLeft.textContent = data.label1;
  ssLabelRight.textContent = data.label2;
  
  // Fix overlay width
  const containerWidth = document.querySelector('.split-slider-container').offsetWidth;
  ssImgAfter.style.width = `${containerWidth}px`;
  ssImgAfter.style.maxWidth = `${containerWidth}px`;

  // Update Data Grid
  const rdVals = document.querySelectorAll('.rd-val');
  if (rdVals.length === 3) {
    rdVals[0].className = `rd-val ${data.devClass}`; rdVals[0].textContent = data.dev;
    rdVals[1].className = `rd-val ${data.riskClass}`; rdVals[1].textContent = data.risk;
    rdVals[2].className = `rd-val ${data.confClass}`; rdVals[2].textContent = data.conf;
  }
};

// Bind clicks for tabs
document.querySelectorAll('.rt-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setSliderMode(e.target.getAttribute('data-mode'));
  });
});
// ────────────────────────────────────────────────────────────────────────────
"""

# Inject before the end of the file or somewhere safe
with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(js + "\n\n" + report_js)
print("app.js patched with Report Generator logic")
