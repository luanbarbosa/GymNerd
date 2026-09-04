// Replaces .material-symbols-outlined / .material-symbols-rounded spans
// (icon name as text content, Google Fonts ligature style) with an inline
// <svg> built from local path data in material-symbols-data.js. No network
// font request involved, so icons can't fall back to showing their name.
(function () {
	function svgMarkup(name, family, fill) {
		var data = window.GN_ICON_DATA;
		if (!data) return null;
		var set = family === "rounded" ? data.rounded : (fill ? data.outlined_fill1 : data.outlined);
		var d = set && set[name];
		if (!d) return null;
		return (
			'<svg viewBox="0 -960 960 960" focusable="false" aria-hidden="true">' +
			'<path d="' + d + '"/></svg>'
		);
	}

	function process(el) {
		if (!el || el.nodeType !== 1) return;
		var isOutlined = el.classList.contains("material-symbols-outlined");
		var isRounded = el.classList.contains("material-symbols-rounded");
		if (!isOutlined && !isRounded) return;

		var firstChild = el.firstChild;
		if (!firstChild || firstChild.nodeType !== 3) return; // already an svg, nothing to do

		var name = firstChild.textContent.trim();
		if (!name) return;

		var fill = /'FILL'\s*1\b/.test(el.getAttribute("style") || "");
		var markup = svgMarkup(name, isRounded ? "rounded" : "outlined", fill);
		if (!markup) return;

		el.textContent = "";
		el.insertAdjacentHTML("afterbegin", markup);
	}

	function processSubtree(root) {
		if (!root.querySelectorAll) return;
		root.querySelectorAll(".material-symbols-outlined, .material-symbols-rounded").forEach(process);
	}

	function init() {
		processSubtree(document);

		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++) {
				var m = mutations[i];
				if (m.type !== "childList") continue;
				if (m.target && m.target.nodeType === 1) process(m.target);
				m.addedNodes.forEach(function (n) {
					if (n.nodeType !== 1) return;
					process(n);
					processSubtree(n);
				});
			}
		});
		observer.observe(document.documentElement, { childList: true, subtree: true });
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
