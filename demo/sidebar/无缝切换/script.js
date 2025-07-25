window.addEventListener("DOMContentLoaded",() => {
	const nav = new Nav("nav");
});

class Nav {
	constructor(qs) {
		this.el = document.querySelector(qs);
		this.expanded = true;
		this.expandBtn = null;
		this.timeout = null;
		this.init();
	}
	init() {
		this.expandBtn = this.el?.querySelector("[data-expand]");
		this.expandBtn?.addEventListener("click",this.toggleSize.bind(this));
	}
	toggleSize() {
		this.expanded = !this.expanded;
		this.el.setAttribute("data-expanded", this.expanded);
		this.expandBtn.setAttribute("aria-expanded", this.expanded);

		const label = this.expanded ? "Collapse" : "Expand";
		const timeoutValue = this.expanded ? 0 : 300;

		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => {
			this.el.querySelector("[data-expand-label]").innerText = label;
		},timeoutValue);
	}
}