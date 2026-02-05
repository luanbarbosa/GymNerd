(function(){
    
    const APP_CONTAINER_ID = 'spa-container';
    const LOADER_ID = 'spa-loader-global';
    window.__spa_loaded_scripts = window.__spa_loaded_scripts || new Set();
    window.__spa_loaded_styles = window.__spa_loaded_styles || new Set();
    window.__spa_loaded_inline_scripts = window.__spa_loaded_inline_scripts || new Set();

    function ensureContainer(){
        // Prefer existing `.main-content` container used by pages (keeps behavior consistent)
        let c = document.querySelector('.main-content');
        if (c) return c;
        // Fallback to named container if no `.main-content` exists
        c = document.getElementById(APP_CONTAINER_ID);
        if (!c) {
            c = document.createElement('div');
            c.id = APP_CONTAINER_ID;
            c.style.minHeight = '100vh';
            document.body.appendChild(c);
        }
        return c;
    }

    function ensureLoader(){
        let l = document.getElementById(LOADER_ID);
        if (!l) {
            l = document.createElement('div');
            l.id = LOADER_ID;
            l.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:white;padding:12px 16px;border-radius:12px;display:none;z-index:2147483646;';
            l.innerHTML = '<div style="display:flex;align-items:center;gap:12px"><div style="width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,255,255,0.12);border-top-color:#3b82f6;animation:gn-spin 1s linear infinite"></div><div>Loading...</div></div>';
            const style = document.createElement('style');
            style.textContent = '@keyframes gn-spin{to{transform:rotate(360deg)}}';
            document.head.appendChild(style);
            document.body.appendChild(l);
        }
        return l;
    }

    function showLoader(){ try { ensureLoader().style.display = 'flex'; } catch(e){} }
    function hideLoader(){ try { ensureLoader().style.display = 'none'; } catch(e){} }

    async function spaNavigate(href, addHistory = true){
        showLoader();
        try {
            // hide login shell if present
            try { document.querySelector('.wrap') && (document.querySelector('.wrap').style.display = 'none'); } catch(e){}
            const resp = await fetch(href, { cache: 'no-store' });
            if (!resp.ok) { hideLoader(); window.location.href = href; return; }
            const text = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            // canonical absolute URL for this fetched document (used for scoping inline scripts)
            let pageKey = null;
            try { pageKey = new URL(href, location.href).href; } catch(e) { pageKey = href || ''; }
            let newMain = doc.querySelector('.main-content');
            const container = ensureContainer();
            if (!newMain) {
                // use body inner content as fallback
                newMain = document.createElement('div');
                newMain.innerHTML = doc.body ? doc.body.innerHTML : text;
            }

            // import styles
            try {
                const styles = Array.from(doc.querySelectorAll('link[rel="stylesheet"], style'));
                for (const st of styles) {
                    if (st.tagName && st.tagName.toLowerCase() === 'link') {
                        let resolved = null;
                        try { resolved = new URL(st.href, href).href; } catch(e) { resolved = st.href; }
                        // Skip malformed root Google Fonts link (some pages mistakenly include
                        // <link href="https://fonts.googleapis.com" rel="stylesheet">)
                        try {
                            const u = new URL(resolved);
                            if (u.hostname === 'fonts.googleapis.com' && (!u.pathname || u.pathname === '/')) {
                                continue;
                            }
                        } catch(e) {}
                        if (window.__spa_loaded_styles.has(resolved)) continue;
                        if (document.querySelector('link[href="' + resolved + '"]')) { window.__spa_loaded_styles.add(resolved); continue; }
                        const ln = document.createElement('link'); ln.rel = 'stylesheet'; ln.href = resolved;
                        document.head.appendChild(ln);
                        await new Promise((res) => { ln.onload = () => { window.__spa_loaded_styles.add(resolved); res(); }; ln.onerror = () => { res(); }; });
                    } else if (st.tagName && st.tagName.toLowerCase() === 'style') {
                        const key = (st.textContent || '').trim();
                        if (!key || window.__spa_loaded_styles.has(key)) continue;
                        const ns = document.createElement('style'); ns.textContent = key; document.head.appendChild(ns); window.__spa_loaded_styles.add(key);
                    }
                }
            } catch(e){}

            // mirror classes/data from fetched container so page-specific
            // scoping (e.g. `login-shell`) doesn't persist across navigations
            try {
                if (newMain.className) container.className = newMain.className;
                // copy data-* attributes
                try {
                    for (const k of Object.keys(newMain.dataset || {})) {
                        container.dataset[k] = newMain.dataset[k];
                    }
                } catch(e) {}
            } catch(e) {}
            // swap content
            container.innerHTML = newMain.innerHTML;

            // execute all scripts from the fetched document (head and body)
            const scripts = Array.from(doc.querySelectorAll('script'));
            for (const s of scripts) {
                if (s.src) {
                    let resolved = null;
                    try { resolved = new URL(s.src, href).href; } catch(e) { resolved = s.src; }
                    if (window.__spa_loaded_scripts.has(resolved)) continue;
                    const ns = document.createElement('script'); ns.src = resolved; ns.async = false; document.body.appendChild(ns);
                    await new Promise((res) => { ns.onload = () => { window.__spa_loaded_scripts.add(resolved); res(); }; ns.onerror = () => { res(); }; });
                } else {
                    const key = (s.textContent || '').trim();
                    if (!key) continue;
                    // Scope inline script tracking to the fetched URL so
                    // identical inline snippets on different pages still run
                    // when those pages are navigated to (avoids missing
                    // per-page initialization after SPA navigations).
                    const scopedKey = (pageKey || href || '') + '::' + key;
                    if (window.__spa_loaded_inline_scripts.has(scopedKey)) continue;
                    try {
                        const ns = document.createElement('script');
                        ns.textContent = s.textContent;
                        document.body.appendChild(ns);
                        try { document.body.removeChild(ns); } catch(e){}
                        window.__spa_loaded_inline_scripts.add(scopedKey);
                    } catch (err) {
                        try { console.warn('Failed to execute injected inline script', err); } catch(e){}
                    }
                }
            }

            if (doc.title) document.title = doc.title;
            // hide login illustration on app pages
            try {
                const nameKey = (href.split('/').pop() || 'index.html');
                const loginImg = document.querySelector('img[src$="illustration-login.svg"]');
                if (loginImg) {
                    if (nameKey === '' || nameKey === 'index.html') loginImg.style.display = '';
                    else loginImg.style.display = 'none';
                }
            } catch(e) {}
            try { if (typeof GN_I18N !== 'undefined' && GN_I18N.applyTranslations) GN_I18N.applyTranslations(container); } catch(e){}
            // If the page defines showApp(), call it to unhide main content
            try { if (typeof window.showApp === 'function') window.showApp(); } catch(e) {}

            // Some pages register initialization via DOMContentLoaded or inline
            // scripts that won't re-run when fragments are injected. Call common
            // init helpers (if present) so injected pages initialize correctly.
            try { if (typeof renderCompactApp === 'function') renderCompactApp(); } catch(e) {}
            try { if (typeof renderMainUser === 'function') renderMainUser(); } catch(e) {}
            try { if (typeof renderWeekDots === 'function') renderWeekDots(); } catch(e) {}
            try { if (typeof updatePendingButtonVisibility === 'function') updatePendingButtonVisibility(); } catch(e) {}

            // Page-specific init: some pages declare generic `init()` which collides
            // across pages. Call unique per-page helpers to ensure correct
            // initialization when inline scripts are skipped due to dedup.
            try {
                const pageName = (href.split('/').pop() || 'index.html');
                if (pageName === 'routines.html') {
                    try { if (typeof renderTabs === 'function') renderTabs(); } catch(e){}
                    try { if (typeof renderWorkouts === 'function') renderWorkouts(); } catch(e){}
                } else if (pageName === 'history.html') {
                    try { if (typeof renderHistory === 'function') renderHistory(); } catch(e){}
                    try { if (typeof renderWeightHistory === 'function') renderWeightHistory(); } catch(e){}
                } else if (pageName === 'statistics.html') {
                    try { if (typeof renderCalendar === 'function') renderCalendar(); } catch(e){}
                    try { if (typeof renderCharts === 'function') renderCharts(); } catch(e){}
                    try { if (typeof updateFrequencyChart === 'function') updateFrequencyChart(); } catch(e){}
                    try { if (typeof updateRadarChart === 'function') updateRadarChart(); } catch(e){}
                }
            } catch(e) {}
            try { window.scrollTo(0,0); } catch(e){}
            if (addHistory) {
                try {
                    // push a hash-based URL for the visible address so refreshing
                    // doesn't request the physical HTML file (e.g. /history.html)
                    const name = (href.split('/').pop() || 'index.html');
                    const short = name.replace(/\.html$/i, '');
                    const pushUrl = '/#' + short;
                    history.pushState({ spa:true, url: href }, doc.title || '', pushUrl);
                } catch (e) {
                    history.pushState({ spa:true, url: href }, doc.title || '', href);
                }
            }
                // Update active bottom-nav item if present and show/hide nav
            try {
                const map = { 'home.html':'nav-home','index.html':'nav-home','routines.html':'nav-routines','routinecrud.html':'nav-routines','history.html':'nav-history','historycrud.html':'nav-history','statistics.html':'nav-statistics' };
                const key = (href.split('/').pop() || 'index.html');
                Object.values(map).forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('active'); });
                const aid = map[key] || 'nav-home';
                const ael = document.getElementById(aid); if (ael) ael.classList.add('active');
                // toggle visibility: hide on index/login, show on app pages
                const nav = document.getElementById('bottom-nav') || document.getElementById('gn-bottom-nav');
                if (nav) {
                    // Hide nav on the login/index shell pages; show for app pages
                    if (key === 'index.html' || key === '' || key === 'login.html') {
                        nav.style.display = 'none';
                        try { nav.setAttribute('aria-hidden', 'true'); } catch(e){}
                    } else {
                        nav.style.display = 'flex';
                        try { nav.setAttribute('aria-hidden', 'false'); } catch(e){}
                    }
                }

                    // Fallback: if navigating to home.html and the injected main-content
                    // appears empty (some pages load a fragment like `home-body.html`),
                    // try fetching the fragment directly and injecting it.
                    try {
                        if (key === 'home.html') {
                            const curMain = container;
                            const looksEmpty = (curMain.children.length === 0) || (!curMain.querySelector('.top-card') && !curMain.querySelector('.menu-grid') && !curMain.querySelector('#week-dots'));
                            if (looksEmpty && !window.__home_fragment_loaded) {
                                window.__home_fragment_loaded = true;
                                try {
                                    const fragResp = await fetch('home-body.html', { cache: 'no-store' });
                                    if (fragResp && fragResp.ok) {
                                        const fragText = await fragResp.text();
                                        const fragDoc = new DOMParser().parseFromString(fragText, 'text/html');
                                        const fragMain = fragDoc.querySelector('.main-content');
                                        if (fragMain) {
                                            curMain.innerHTML = fragMain.innerHTML;
                                            const fragScripts = Array.from(fragMain.querySelectorAll('script'));
                                            for (const s of fragScripts) {
                                                if (s.src) {
                                                    let resolved = null;
                                                    try { resolved = new URL(s.src, href).href; } catch(e) { resolved = s.src; }
                                                    if (window.__spa_loaded_scripts.has(resolved)) continue;
                                                    const ns = document.createElement('script'); ns.src = resolved; ns.async = false; document.body.appendChild(ns);
                                                    await new Promise((res) => { ns.onload = () => { window.__spa_loaded_scripts.add(resolved); res(); }; ns.onerror = () => { res(); }; });
                                                    } else {
                                                                const key2 = (s.textContent || '').trim();
                                                                if (!key2) continue;
                                                                if (window.__spa_loaded_inline_scripts.has(key2)) continue;
                                                                try {
                                                                    const ns = document.createElement('script');
                                                                    ns.textContent = s.textContent;
                                                                    document.body.appendChild(ns);
                                                                    try { document.body.removeChild(ns); } catch(e){}
                                                                    window.__spa_loaded_inline_scripts.add(key2);
                                                                } catch(err) { try { console.warn('Failed to execute fragment inline script', err); } catch(e){} }
                                                    }
                                            }
                                            try { if (typeof GN_I18N !== 'undefined' && GN_I18N.applyTranslations) GN_I18N.applyTranslations(curMain); } catch(e){}
                                            try { if (typeof renderWeekDots === 'function') renderWeekDots(); } catch(e){}
                                            try { if (typeof renderMainUser === 'function') renderMainUser(); } catch(e){}
                                        }
                                    }
                                } catch(e) { /* ignore fragment fallback errors */ }
                            }
                        }
                    } catch(e) {}
            } catch(e) {}
            try { if (!document.body.style.visibility || document.body.style.visibility === 'hidden') document.body.style.visibility = 'visible'; } catch(e){}
            hideLoader();
        } catch (err) {
            hideLoader();
            console.error('spaNavigate failed', err);
            window.location.href = href;
        }
    }

    // Intercept clicks for same-origin navigation
    document.addEventListener('click', function(e){
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href'); if (!href) return;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        try {
            const url = new URL(href, location.href);
            if (url.origin !== location.origin) return;
            const name = url.pathname.split('/').pop() || 'index.html';
            // `settings.html` is a standalone page and should not be embedded into the SPA.
            const spaTargets = ['index.html','home.html','routines.html','routinecrud.html','history.html','historycrud.html','statistics.html'];
            if (spaTargets.includes(name)) {
                e.preventDefault();
                spaNavigate(url.pathname);
            }
        } catch(e){}
    });

    window.addEventListener('popstate', function(e){
        try {
            // Prefer the stored SPA URL (original fetched path) when available
            if (e && e.state && e.state.url) {
                spaNavigate(e.state.url, false);
            } else {
                spaNavigate(location.pathname, false);
            }
        } catch(e){}
    });

    // expose API
    window.spaNavigate = spaNavigate;
    window.showLoading = showLoader;
    window.hideLoading = hideLoader;

    // On initial load, if the shell is opened at root, render `login.html` into the container.
    (function initRouteOnLoad(){
        try {
            const name = (location.pathname || '').split('/').pop() || 'index.html';
            // Allow overriding initial route with a `start` query param or hash
            const params = new URLSearchParams(location.search);
            const startParam = params.get('start') || null;
            const hashParam = (location.hash && location.hash.length > 1) ? location.hash.slice(1) : null;
            const startHint = startParam || hashParam;
            const allowed = ['home.html','routines.html','history.html','statistics.html','settings.html','home','routines','history','statistics','settings'];

            if (name === '' || name === 'index.html') {
                if (startHint) {
                    let candidate = startHint;
                    if (!candidate.endsWith('.html')) candidate = candidate + '.html';
                    if (allowed.includes(startHint) || allowed.includes(candidate)) {
                        spaNavigate(candidate, false).catch(() => {});
                        return;
                    }
                }
                // Default to showing the login page
                spaNavigate('login.html', false).catch(() => {});
            }
        } catch (e) {}
    })();
})();
