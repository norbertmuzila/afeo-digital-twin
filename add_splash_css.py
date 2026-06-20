import sys
import codecs

with codecs.open("style.css", "r", encoding="utf-8") as f:
    code = f.read()

splash_css = """
/* ─── SPLASH SCREEN ANIMATIONS ─── */
#splashScreen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: #0a0f1a; /* Deep dark blue space color */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.8s ease;
}

#splashScreen.slide-up {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}

.splash-logo {
  font-family: 'Cinzel', serif; /* or use the existing WAFEO font */
  font-size: 4rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  display: flex;
  gap: 0.1em;
}

.splash-letter {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  animation: splashFadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.splash-logo .waf-w { animation-delay: 0.1s; }
.splash-logo .waf-a { animation-delay: 0.25s; }
.splash-logo .waf-f { animation-delay: 0.4s; }
.splash-logo .waf-e { animation-delay: 0.55s; }
.splash-logo .waf-o { animation-delay: 0.7s; }

@keyframes splashFadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
"""

with codecs.open("style.css", "a", encoding="utf-8") as f:
    f.write(splash_css)

print("style.css splash animations added")
