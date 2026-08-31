import{e as p,j as u,l as b}from"./chunk-S34S5PNO.js";import{g as m}from"./chunk-KJYLVAL2.js";var g="pb-affiliate-account-shell-style",d=[{id:"dashboard",label:"Dashboard",icon:"home",path:"/affiliate"},{id:"ledger",label:"Komisi",icon:"wallet",path:"/affiliate/ledger"},{id:"settlements",label:"Settlement",icon:"transaction",path:"/affiliate/settlements",featured:!0},{id:"profile",label:"Profil",icon:"user",path:"/profile"},{id:"notifications",label:"Notifikasi",icon:"bell",path:"/notifications"}];function C({activePath:t="/affiliate",title:o="Marketing",subtitle:n="",icon:e="affiliate",maxWidth:a="max-w-[1180px]",children:i=[],actions:c={}}={}){_();let r=document.createElement("section");r.className=`af-account-page mx-auto grid min-w-0 w-full max-w-[430px] gap-5 overflow-x-clip pb-28 text-[var(--pb-text)] md:${a} md:gap-6 md:pb-8`,r.dataset.ds="affiliate.account.page";let l=document.createElement("section");return l.className="af-account-content grid min-w-0 gap-6",l.append(...i.filter(Boolean)),r.append(k({activePath:t,title:o,icon:e,actions:c}),w({title:o,subtitle:n,actions:c}),l,N({activePath:t,items:d,onNavigate:s=>c.navigate?.(s)})),r}function _(){if(document.getElementById(g))return;let t=document.createElement("style");t.id=g,t.textContent=`
    /* Dulu putih karena halaman ini berdiri di atas video gelap. Kanvasnya
       sekarang krem, jadi judul dan deskripsinya ikut warna teks tema. */
    .af-account-page,
    .af-account-page > header,
    .af-account-page [data-ds="shared.section_header"],
    .af-account-page [data-ds="shared.section_header"] h1,
    .af-account-page [data-ds="shared.section_header"] p {
      color: var(--pb-text);
    }
    .af-account-page [data-ds="shared.section_header"] p {
      opacity: .82;
    }
    .af-account-page article,
    .af-account-page section,
    .af-account-page div {
      min-width: 0;
    }
    .af-account-page .account-mobile-footer {
      z-index: 58;
    }
    .af-account-page .account-mobile-footer__item {
      color: #334155;
    }
    .af-account-page .account-mobile-footer__item:hover,
    .af-account-page .account-mobile-footer__item--active {
      color: var(--pb-brand-primary);
    }
    .af-account-page .account-mobile-footer__icon,
    .af-account-page .account-mobile-footer__label,
    .af-account-page .account-mobile-footer__action-label {
      color: inherit;
      opacity: 1;
      visibility: visible;
    }
    .af-account-page .account-mobile-footer__action {
      color: #fff;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__action-label {
      color: #000;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__shell {
      height: 5.65rem;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__bar {
      height: 4.65rem;
      border-radius: 1.35rem 1.35rem 0 0;
      background:
        radial-gradient(circle at 50% -18px, transparent 0 2.7rem, rgba(255, 255, 255, 0.94) 2.73rem),
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
      box-shadow: 0 -14px 32px rgba(15, 23, 42, 0.14);
      backdrop-filter: blur(14px) saturate(1.1);
      -webkit-backdrop-filter: blur(14px) saturate(1.1);
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__items {
      height: 4.65rem;
      padding: 0 max(0.55rem, env(safe-area-inset-left, 0px)) 0 max(0.55rem, env(safe-area-inset-right, 0px));
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__item {
      min-height: 3.55rem;
      gap: 0.2rem;
      border-radius: 0.9rem;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__icon {
      width: 1.55rem;
      height: 1.55rem;
      font-size: 1rem;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__label,
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__action-label {
      font-size: 0.58rem;
      font-weight: 760;
      line-height: 1;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__center {
      transform: translate(-50%, -0.03rem);
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__action {
      width: 3.45rem;
      min-height: 4.35rem;
      gap: 0.18rem;
      border-radius: 1rem;
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__action-icon {
      width: 2.75rem;
      height: 2.75rem;
      font-size: 1.42rem;
      box-shadow: 0 14px 26px rgba(30,129,176, 0.3);
      outline: 6px solid rgba(255, 255, 255, 0.95);
    }
    .af-account-page .account-mobile-footer--affiliate .account-mobile-footer__action-label {
      width: 3.45rem;
    }
  `,document.head.append(t)}function I(t){return{navigate(o){t?.router?.navigate(o)}}}function w({title:t,subtitle:o,actions:n}){let e=document.createElement("header");e.id="afacc_mobile_header",e.className="relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden",e.dataset.ds="affiliate.account.mobile_header";let a=document.createElement("section");a.className="grid min-w-0 gap-0.5",a.append(f("p","truncate text-xs font-bold text-[var(--pb-text-muted)]",o||"Akun marketing"),f("h1","truncate text-lg font-black leading-tight tracking-normal text-[var(--pb-text-strong)]",t));let i=document.createElement("section");return i.className="inline-flex shrink-0 items-center justify-end gap-2",i.append(u({idPrefix:"af_mobile",compact:!0,onNavigate:n.navigate,withBackdrop:!0}),h({actions:n,compact:!0})),e.append(a,i),e}function k({activePath:t,title:o,icon:n,actions:e}){let a=document.createElement("nav");a.id="afacc_desktop_top_nav",a.className="sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 text-[var(--pb-text)] shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex",a.setAttribute("aria-label","Navigasi marketing desktop");let i=document.createElement("section");i.className="flex min-w-0 items-center gap-3 px-1",i.append(v(n,"h-11 w-11 rounded-full bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-soft)]"),f("strong","truncate text-sm font-black text-[var(--pb-text)]",o));let c=document.createElement("section");c.className="flex min-w-0 flex-wrap items-center justify-end gap-1 lg:gap-2",d.forEach(s=>{c.append(y(s,t,e))});let r=document.createElement("section");r.className="inline-flex shrink-0 items-center justify-end gap-2",r.append(u({idPrefix:"af_desktop",onNavigate:e.navigate,withBackdrop:!0}),h({actions:e}));let l=document.createElement("section");return l.className="flex min-w-0 items-center justify-end gap-2",l.append(c,r),a.append(i,l),a}function y(t,o,n){let e=x(t,o),a=document.createElement("a");return a.href=t.path,a.id=`afacc_nav_desktop_${t.id}`,a.className=e?"inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-xs font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] xl:px-4":"inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] xl:px-4",e&&a.setAttribute("aria-current","page"),a.addEventListener("click",i=>{i.preventDefault(),n.navigate?.(t.path)}),a.append(v(t.icon,e?"h-7 w-7 rounded-full text-[var(--pb-brand-secondary)]":"h-7 w-7 rounded-full text-[var(--pb-text-muted)]"),f("span","hidden truncate lg:inline",t.label)),a}function h({actions:t,compact:o=!1}={}){let n=p.user()??{},e=document.createElement("button");return e.type="button",e.className=o?"inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/92 text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-white/70 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]":"inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]",e.setAttribute("aria-label","Profil marketing"),e.title="Profil",e.addEventListener("click",()=>t?.navigate?.("/profile")),e.textContent=E(n),e}function x(t,o){return t.path==="/affiliate"?o==="/affiliate":String(o??"").startsWith(t.path)}function N({items:t=d,activePath:o="/affiliate",onNavigate:n=null}={}){let e=b({items:t,activePath:o,onNavigate:n});e.id="afacc_mobile_footer_nav",e.classList.remove("account-mobile-footer--buyer"),e.classList.add("account-mobile-footer--affiliate"),e.dataset.ds="affiliate.mobile.footer",e.setAttribute("aria-label","Navigasi akun marketing mobile");let a=e.querySelector("#byr_mobile_footer_nav_container");return a&&(a.id="afacc_mobile_footer_nav_container"),A(e,t,o),e}function A(t,o,n){o.forEach(e=>{let a=t.querySelector(`#byr_nav_mobile_${e.id}`);if(!a)return;let i=x(e,n);if(e.featured){a.setAttribute("aria-current",i?"page":"false");return}a.classList.toggle("account-mobile-footer__item--active",i),i?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")})}function E(t){let o=String(t?.name??t?.full_name??t?.email??"A").trim(),n=o.split(/\s+/).filter(Boolean);return n.length>=2?`${n[0][0]??""}${n[1][0]??""}`.toUpperCase():o.slice(0,2).toUpperCase()||"A"}function v(t,o){let n=document.createElement("span");return n.className=`inline-flex shrink-0 items-center justify-center ${o}`,n.append(m(t,{className:"block h-5 w-5 leading-none"})),n}function f(t,o,n){let e=document.createElement(t);return e.className=o??"",e.textContent=n??"",e}export{C as a,I as b};
