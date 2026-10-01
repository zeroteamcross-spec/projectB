import{a as F}from"./chunk-5LVIJL4N.js";import{b as xe,c as ne,d as ye,h as na,i as ve,j as ra}from"./chunk-BZW72RSE.js";import{c as k,e as ea}from"./chunk-FJ6HKYXQ.js";import{a as Xe,b as Ze,c as _e}from"./chunk-6UJHYDOV.js";import{c as Qe,d as K}from"./chunk-OBX55CTF.js";import{b as ta,c as te}from"./chunk-OAAASKUM.js";import{h as A,m as aa}from"./chunk-OA2QJMIW.js";import{a as he}from"./chunk-5MST2TX3.js";import{a as X}from"./chunk-5MBPC3W4.js";import{a as Ye}from"./chunk-VQMCWAIP.js";import{a as ae,b as qe,d as Je,e as We,f as Ve,g as m,j as R,m as O,n as ke,p as j,r as Y,u as w,v as T}from"./chunk-XDEXDIEA.js";import{b as _}from"./chunk-WILMVHRH.js";var re={get(e,a=null){return m.get(`snapshot.${e}`,a)},set(e,a,t={}){m.patchState(`snapshot.${e}`,{data:a,fetchedAt:Date.now(),ttl:t.ttl??300,version:t.version??e,stale:!1},"snapshot:set")},markStale(e){let a=this.get(e,{});m.patchState(`snapshot.${e}`,{...a,stale:!0},"snapshot:stale")},clearRole(e){m.patchState(`snapshot.${e}`,{},"snapshot:clear-role")}};var Dr={async listUsers(e={},a={}){let t=new URLSearchParams;Object.entries(e).forEach(([i,o])=>{o!=null&&o!==""&&t.set(i,String(o))});let n=t.toString()?`?${t.toString()}`:"",r=await _.get(`/admin/users${n}`,a);return{users:r.data?.users??[],meta:r.meta??{}}},async pendingUsers(e={},a={}){let t=new URLSearchParams;Object.entries(e).forEach(([i,o])=>{o!=null&&o!==""&&t.set(i,String(o))});let n=t.toString()?`?${t.toString()}`:"",r=await _.get(`/auth/pending-users${n}`,a);return{users:r.data?.users??[],meta:r.meta??{}}},async userDetail(e,a={}){return(await _.get(`/users/${encodeURIComponent(e)}`,a)).data?.user??null},async approveUsers(e=[],a={}){let t=await _.post("/auth/approve-users",{user_ids:e.map(n=>Number(n)).filter(n=>Number.isInteger(n)&&n>0)},a);return{approvedCount:t.data?.approved_count??0,userIds:t.data?.user_ids??[],blocked:t.data?.blocked??[]}},async listSettlements(e={},a={}){let t=new URLSearchParams;Object.entries(e).forEach(([i,o])=>{o!=null&&o!==""&&t.set(i,String(o))});let n=t.toString()?`?${t.toString()}`:"",r=await _.get(`/admin/affiliate-settlements${n}`,a);return{settlements:r.data?.settlements??[],meta:r.meta??{}}},async settlementDetail(e,a={}){return(await _.get(`/admin/affiliate-settlements/${encodeURIComponent(e)}`,a)).data?.settlement??null},async listAffiliateLedgers(e={},a={}){let t=new URLSearchParams;Object.entries(e).forEach(([i,o])=>{o!=null&&o!==""&&t.set(i,String(o))});let n=t.toString()?`?${t.toString()}`:"",r=await _.get(`/admin/affiliate-ledgers${n}`,a);return{ledgers:r.data?.ledgers??[],meta:r.meta??{}}},async createSettlement(e={},a={}){return(await _.post("/admin/affiliate-settlements",e,a)).data?.settlement??null},async updateSettlementStatus(e,a={},t={}){return(await _.patch(`/admin/affiliate-settlements/${encodeURIComponent(e)}/status`,a,t)).data?.settlement??null},async settleSettlement(e,a={},t={}){return(await _.post(`/admin/affiliate-settlements/${encodeURIComponent(e)}/settle`,a,t)).data?.settlement??null},async cancelSettlement(e,a={},t={}){return(await _.post(`/admin/affiliate-settlements/${encodeURIComponent(e)}/cancel`,a,t)).data?.settlement??null},async startAffiliateImpersonation(e,a={}){let t=await _.post(`/admin/affiliates/${encodeURIComponent(e)}/impersonate`,{reason:typeof a?.reason=="string"?a.reason.trim():""});return this.applyImpersonationContext(t.data),t},async startSellerImpersonation(e,a={}){let t=await _.post(`/admin/sellers/${encodeURIComponent(e)}/impersonate`,{reason:typeof a?.reason=="string"?a.reason.trim():""});return this.applyImpersonationContext(t.data),t},async startImpersonation(e,a={}){let t=String(a?.targetRole??"").trim();if(t==="seller")return this.startSellerImpersonation(e,a);if(t==="affiliate_admin")return this.startAffiliateImpersonation(e,a);let n=await _.post("/admin/impersonations",{target_user_id:Number(e),reason:typeof a?.reason=="string"?a.reason.trim():""});return this.applyImpersonationContext(n.data),n},async stopImpersonation(){let e=await _.post("/admin/impersonations/stop",{});return this.applyImpersonationContext(e.data),e},applyImpersonationContext(e={}){m.destroyWorkingState(),re.clearRole("admin"),re.clearRole("seller"),re.clearRole("affiliate_admin"),m.patchState("app.routeHydrateError",null,"impersonation:clear-hydrate-error"),m.patchState("ui.sidebarOpen",!1,"impersonation:close-sidebar"),m.patchState("ui.sidebarCollapsed",!1,"impersonation:expand-sidebar"),A.setContext({user:e?.user??null,actor:e?.actor??null,impersonation:e?.impersonation??null})}};var ia={async list(e={}){return(await _.get("/admin/tasks",e)).data?.tasks??[]},async updateStatus(e,a,t={}){return(await _.patch(`/admin/tasks/${encodeURIComponent(e)}`,{status:a},t)).data?.task??null}};var ht={open:"Belum selesai",sip:"Sip"};function kt({service:e=ia}={}){let a=null,t=null,n={tasks:[],loading:!0,savingId:null,error:""},r={async refresh(){n.loading=!0,n.error="",U(a,n,r);try{n.tasks=await e.list()}catch(i){n.tasks=[],n.error=i.message||"Gagal memuat daftar tugas.",j(n.error,{type:"error"})}finally{n.loading=!1,U(a,n,r)}},async complete(i){if(!(!i||i.status==="sip"||n.savingId!==null)){n.savingId=i.id,n.error="",U(a,n,r);try{let o=await e.updateStatus(i.id,"sip");n.tasks=n.tasks.map(s=>s.id===i.id?o??{...s,status:"sip"}:s),j("Tugas ditandai sip.",{type:"success"})}catch(o){n.error=o.message||"Gagal menandai tugas.",j(n.error,{type:"error"})}finally{n.savingId=null,U(a,n,r)}}}};return T({bootstrap(i){t=i},mount(i){return t=i,a=document.createElement("div"),U(a,n,r),r.refresh(),a},hydrate(i){t=i,U(a,n,r)},dispose(){t=null,a=null}})}function Wr(){return kt()}function U(e,a,t){if(!e)return;let n=document.createElement("section");if(n.id="admintasks_page_section",n.className="grid gap-6",n.append(xt(a,t)),a.error&&n.append(wt(a.error)),n.append(yt(a)),a.loading)n.append(vt());else if(!a.tasks.length)n.append(X({title:"Belum ada tugas",description:"Permintaan baru akan muncul di halaman ini."}));else{let r=document.createElement("div");r.className="grid gap-3",r.append(...a.tasks.map(i=>_t(i,a,t))),n.append(r)}e.replaceChildren(n)}function xt(e,a){let t=document.createElement("section");t.className="grid gap-2 rounded-2xl border border-[var(--pb-border)] bg-white p-5 shadow-sm sm:p-6";let n=document.createElement("p");n.className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--pb-text-muted)]",n.textContent="Task board";let r=document.createElement("h1");r.className="text-xl font-black tracking-normal text-gray-950",r.textContent="Daftar Tugas";let i=document.createElement("p");i.className="max-w-3xl text-xs leading-6 text-[var(--pb-text-muted)]",i.textContent="Daftar tugas dan permintaan dari Anda. Klik Beres setelah pekerjaan selesai untuk mengubah status menjadi sip.";let o=w({label:e.loading?"Memuat...":"Refresh",variant:"secondary",disabled:e.loading,onClick:a.refresh});return o.classList.add("mt-2","w-fit"),t.append(n,r,i,o),t}function yt(e){let a=e.tasks.filter(r=>r.status==="open").length,t=e.tasks.filter(r=>r.status==="sip").length,n=document.createElement("div");return n.className="grid gap-3 sm:grid-cols-2",n.append(oa("Belum selesai",a),oa("Sip",t)),n}function oa(e,a){let t=document.createElement("div");t.className="rounded-2xl border border-[var(--pb-border)] bg-white p-4 shadow-sm";let n=document.createElement("p");n.className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pb-text-muted)]",n.textContent=e;let r=document.createElement("p");return r.className="mt-1 text-2xl font-black text-gray-950",r.textContent=String(a),t.append(n,r),t}function _t(e,a,t){let n=document.createElement("article");n.id=`admin_task_card_${e.id}`,n.className="grid gap-4 rounded-2xl border border-[var(--pb-border)] bg-white p-5 shadow-sm sm:p-6";let r=document.createElement("div");r.className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";let i=document.createElement("div");i.className="min-w-0 grid gap-2";let o=document.createElement("h2");o.className="break-words text-base font-black text-gray-950",o.textContent=e.title||"Tugas tanpa judul";let s=document.createElement("p");s.className="break-all text-[10px] font-semibold text-[var(--pb-text-muted)]",s.textContent=e.task_key||`task-${e.id}`,i.append(o,s);let l=document.createElement("span");l.className=`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-[10px] font-bold ${e.status==="sip"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`,l.textContent=ht[e.status]||e.status,r.append(i,l);let d=document.createElement("p");d.className="break-words text-xs leading-6 text-gray-600",d.textContent=e.description||"Tidak ada detail tambahan.";let c=document.createElement("div");c.className="flex flex-col gap-3 border-t border-[var(--pb-border)] pt-4 sm:flex-row sm:items-center sm:justify-between";let p=document.createElement("p");p.className="break-words text-[10px] leading-5 text-[var(--pb-text-muted)]",p.textContent=e.status==="sip"&&e.completed_at?`Diselesaikan ${e.completed_at}${e.completed_by_name?` oleh ${e.completed_by_name}`:""}`:`Dibuat ${e.created_at||"-"}`;let u=w({id:`admin_task_beres_${e.id}`,label:e.status==="sip"?"Sip":a.savingId===e.id?"Menyimpan...":"Beres",variant:e.status==="sip"?"secondary":"ya",disabled:e.status==="sip"||a.savingId!==null,onClick:()=>t.complete(e)});return u.classList.add("w-full","sm:w-auto"),c.append(p,u),n.append(r,d,c),n}function vt(){let e=document.createElement("div");return e.className="rounded-2xl border border-[var(--pb-border)] bg-white p-6 text-xs text-[var(--pb-text-muted)] shadow-sm",e.textContent="Memuat daftar tugas...",e}function wt(e){let a=document.createElement("div");return a.className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700",a.textContent=e,a}var St=3e4,we=new Map,ie=new Map,oe={async list({page:e=1,limit:a=12,filters:t={},affiliateSlug:n="",showroomSlug:r=""}={},i={}){let o=sa(n),s=sa(r),l=null,d=null;if(o){let x=await k.activateAffiliateBySlug(o,i);if(!x)return{cars:[],meta:{}};l=x.sellerUserId}if(s){let x=await k.activateShowroomBySlug(s,i);if(!x)return{cars:[],meta:{}};d=x.id}let c=Object.fromEntries(Object.entries(t).filter(([x,$])=>x!=="brand_names"&&$!==""&&$!==null&&$!==void 0)),p={page:la(e,1),limit:la(a,12),...c,listing_status:"published"};l?p.seller_user_id=l:d&&(p.showroom_id=d);let u=l||d?p:k.applyCatalogFilters(p),g=Et({affiliateSlug:o,showroomSlug:s,filters:u}),b=At(g);if(b)return b;let v=ie.get(g);if(v)return v;let L=he.list(u,i).then(x=>(we.set(g,{data:x,expiresAt:Date.now()+St}),x));return i.signal||(ie.set(g,L),L.then(()=>ie.delete(g),()=>ie.delete(g))),L},async detail(e,a={}){let t=null,n=null;if(a.affiliateSlug){let d=await k.activateAffiliateBySlug(a.affiliateSlug,a);if(!d)return null;t=d.sellerUserId}if(a.showroomSlug){let d=await k.activateShowroomBySlug(a.showroomSlug,a);if(!d)return null;n=d.id}let r=null;try{r=await he.detail(e,a)}catch(d){if(d.status===404)return null;throw d}if(!r||t&&Number(r.seller_user_id)!==Number(t)||n&&Number(r.showroom_id)!==Number(n))return null;let[i,o]=await Promise.allSettled([Xe.listByCar(e,a),Ze.byCar(e,a)]),s=i.status==="fulfilled"?i.value:[],l=o.status==="fulfilled"?o.value:null;return{car:{...r,images:s.length?s:r.images??[]},images:s,inspection:l}}};function sa(e){return String(e??"").trim().toLowerCase()}function la(e,a){let t=Number(e);return Number.isFinite(t)&&t>0?Math.floor(t):a}function Et({affiliateSlug:e="",showroomSlug:a="",filters:t={}}={}){return JSON.stringify({affiliateSlug:e,showroomSlug:a,filters:Se(t)})}function Se(e){return Array.isArray(e)?e.map(a=>Se(a)):e&&typeof e=="object"?Object.fromEntries(Object.keys(e).sort().map(a=>[a,Se(e[a])])):e}function At(e){let a=we.get(e);return a?a.expiresAt<=Date.now()?(we.delete(e),null):a.data:null}var Ct={brand:{logoMark:"",logoWordmark:""},placeholders:{carCard:"",showroom:""},illustrations:{emptyState:""}};function da(e,a=""){let t=String(e??"").trim();return/^(https?:|data:|blob:)/.test(t)||t.startsWith("/")?t:t.split(".").reduce((n,r)=>n&&r in n?n[r]:a,Ct)}var Nt="/admin/design-studio-v2";function ti({store:e=null,currentUser:a=null}={}){let n=(a??e?.get?.("auth.user",null)??null)?.role??e?.get?.("auth.role","public")??"public",r=!!e?.get?.("runtime.designStudioV2.enabled",!1),i=!!e?.get?.("runtime.designStudioV2.designMode",!1);return r&&i&&n==="super_admin"}function ni(){return{href:Nt,label:"Design Studio V2",icon:"sparkles"}}var ca="pb-background-video-style",jt="assets/images/bg-vid.mp4";var Lt="bg-white";function se({src:e=jt,id:a="",className:t="",fallbackClassName:n="bg-[var(--pb-page-bg)]",overlayClassName:r="",preload:i="metadata"}={}){$t();let o=document.createElement("section");a&&(o.id=a),o.className=["pb-background-video",t].filter(Boolean).join(" "),o.setAttribute("aria-hidden","true");let s=document.createElement("span"),l=Lt;s.className=["pb-background-video__fallback",l].filter(Boolean).join(" "),o.append(s);let d=document.createElement("video");d.className="pb-background-video__media",d.autoplay=!0,d.muted=!0,d.defaultMuted=!0,d.loop=!0,d.playsInline=!0,d.preload=i,d.tabIndex=-1,d.setAttribute("muted",""),d.setAttribute("playsinline",""),d.setAttribute("aria-hidden","true");let c=document.createElement("span"),p="";c.className=["pb-background-video__overlay",p].filter(Boolean).join(" ");let u=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??!1,g=!1,b=null,v=null,L=()=>{g||(o.classList.add("is-ready"),d.play?.().catch(()=>{}))},x=()=>{g||(o.classList.add("is-error"),console.warn?.("Background video failed to load; fallback background remains active."))},$=()=>{};return d.addEventListener("loadeddata",L),d.addEventListener("canplay",L),d.addEventListener("error",x),o.append(d,c),o.classList.add("is-reduced-motion"),o.dispose=()=>{g=!0,b&&typeof window.cancelIdleCallback=="function"&&window.cancelIdleCallback(b),v&&window.clearTimeout(v),d.pause?.(),d.removeAttribute("src"),d.replaceChildren(),d.load?.()},o.setEnabled=B=>{if(!g){if(!B){d.pause?.();return}o.classList.contains("is-ready")&&d.play?.().catch(()=>{})}},o}function $t(){if(document.getElementById(ca))return;let e=document.createElement("style");e.id=ca,e.textContent=`
    .pb-background-video {
      position: fixed;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
    }

    .pb-background-video__fallback,
    .pb-background-video__media,
    .pb-background-video__overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .pb-background-video__fallback {
      z-index: 0;
    }

    .pb-background-video__media {
      z-index: 1;
      object-fit: cover;
      opacity: 0;
      transition: opacity 420ms ease;
    }

    .pb-background-video__overlay {
      z-index: 2;
    }

    .pb-background-video.is-ready .pb-background-video__media {
      opacity: 1;
    }

    .pb-background-video.is-error .pb-background-video__media,
    .pb-background-video.is-reduced-motion .pb-background-video__media {
      opacity: 0;
    }

    

    .pb-bgv-buyer-content [class*="bg-[var(--pb-surface-card)]"],
    .pb-bgv-buyer-content [class*="bg-[var(--pb-surface-muted)]"],
    .pb-bgv-buyer-content [class*="bg-[var(--pb-surface-inset)]"],
    .pb-bgv-buyer-content [class*="bg-[var(--pb-form-search-bg)]"],
    .pb-bgv-buyer-content [class*="var(--pb-surface-card)"],
    .pb-bgv-buyer-content [class*="var(--pb-surface-muted)"],
    .pb-bgv-buyer-content [class*="var(--pb-surface-inset)"],
    .pb-bgv-buyer-content [class*="var(--pb-form-search-bg)"],
    .pb-bgv-buyer-content [class*="bg-[color-mix(in_srgb,var(--pb-surface-card)"],
    .pb-bgv-buyer-content [class*="bg-white"],
    .pb-bgv-buyer-content [class*="bg-gray-"],
    .pb-bgv-buyer-content [class*="bg-orange-"],
    .pb-bgv-buyer-content [class*="bg-green-"],
    .pb-bgv-buyer-content [class*="bg-amber-"],
    .pb-bgv-buyer-content [class*="bg-red-"] {
      --pb-text: #111827;
      --pb-text-strong: #374151;
      --pb-text-muted: #6b7280;
    }
  `,document.head.append(e)}var Bt=500,pe=[],Ae=new Set,Z=new Set,pa=new Map,le=new Map,Ee=null,de=!1,ua={enqueueCars(e=[],a={}){let t=String(a.affiliateSlug??"").trim(),n=String(a.showroomSlug??"").trim();(Array.isArray(e)?e:[]).forEach(i=>{let o=je(i?.id);!o||Ae.has(o)||Z.has(o)||Ce(o)||(Ae.add(o),pe.push({id:o,affiliateSlug:t,showroomSlug:n}))}),ce()},async detailOrFetch(e,a={}){let t=je(e),n=Ce(t);if(n)return Ne(t,n),n;let r=await ma(t,e,a);return Z.add(t),ga(t,r),Ne(t,r),r}};function ce(){Ee||de||pe.length===0||(Ee=window.setTimeout(()=>{Ee=null,Mt()},Bt))}async function Mt(){if(de||pe.length===0){ce();return}let e=pe.shift();if(Ae.delete(e.id),Z.has(e.id)||Ce(e.id)){ce();return}de=!0;try{if(e.affiliateSlug&&!Tt(e.affiliateSlug)||e.showroomSlug&&!zt(e.showroomSlug))return;let a=await ma(e.id,e.id,{affiliateSlug:e.affiliateSlug,showroomSlug:e.showroomSlug});Z.add(e.id),ga(e.id,a),Ne(e.id,a)}catch{}finally{de=!1,ce()}}function ma(e,a,t={}){if(le.has(e))return le.get(e);let n=oe.detail(a,t).finally(()=>{le.delete(e)});return le.set(e,n),n}function ga(e,a){!e||!a||(Z.add(e),pa.set(e,a))}function Ce(e){return e?pa.get(e)??null:null}function Ne(e,a){if(!e||!a)return;let t=m.get("app.currentRoute",null),n=je(t?.params?.id),r=String(t?.name??"");n!==e||!r.includes("car-detail")||m.patchState("working.publicCarDetail.detail",{data:a,hydratedAt:Date.now()},"public:car-detail-preload-hit")}function je(e){return String(e??"").trim()||""}function Tt(e){let a=m.get("app.currentRoute",null),t=String(e??"").trim().toLowerCase();return t?String(a?.name??"").includes("affiliate")?String(a?.params?.marketingSlug??a?.params?.slug??"").trim().toLowerCase()===t:!1:!0}function zt(e){let a=m.get("app.currentRoute",null),t=String(e??"").trim().toLowerCase();return t?String(a?.name??"").includes("affiliate")?!1:String(a?.params?.slug??"").trim().toLowerCase()===t:!0}var fa="projectB:affiliate-click-log",Rt=300*1e3,ba={async trackCurrentPage(){let e=k.activeAffiliate();if(!e?.slug)return null;let a=Pt();if(!a||It(e.slug,a))return null;let t=await Ye.recordClick({referral_code:e.slug,landing_url:a}).catch(()=>null);return Dt(e.slug,a),t}};function Pt(){try{return window.location.href}catch{return""}}function It(e,a){let t=ha(),n=`${e}:${a}`,r=Number(t[n]??0);return r?Date.now()-r<Rt:!1}function Dt(e,a){let t=ha();t[`${e}:${a}`]=Date.now(),Ot(t)}function ha(){try{let e=window.sessionStorage.getItem(fa);return e?JSON.parse(e):{}}catch{return{}}}function Ot(e){try{window.sessionStorage.setItem(fa,JSON.stringify(e))}catch{}}function ka({showroomName:e=""}={}){let a=document.createElement("section");a.id="public_maintenance_section",a.className="grid min-h-[70vh] place-items-center px-4 py-12";let t=document.createElement("div");t.className="grid max-w-md gap-5 justify-items-center rounded-[2rem] border border-[var(--pb-card-border)] bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl";let n=document.createElement("div");n.className="grid h-20 w-20 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] text-[var(--pb-brand-secondary)]",n.append(R("wrench",{className:"h-9 w-9"}));let r=document.createElement("h1");r.id="public_maintenance_title",r.className="text-xl font-black tracking-tight text-gray-950",r.textContent="Halaman Sedang Tidak Tersedia";let i=document.createElement("p");i.className="text-sm leading-6 text-gray-600",i.textContent=e?`Halaman showroom "${e}" sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.`:"Halaman showroom ini sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.";let o=document.createElement("p");o.className="text-xs leading-6 text-gray-500",o.textContent="Silakan coba lagi beberapa saat lagi, atau kembali ke beranda untuk melihat showroom lain.";let s=w({label:"Kembali ke Beranda",variant:"primary",onClick:()=>window.location.assign("/")});return s.id="public_maintenance_home_button",s.classList.add("w-full","sm:w-fit"),t.append(n,r,i,o,s),a.append(t),a}var S="modules.public.catalog",Ft=300*1e3,Le=new Map,h={get(){return m.get(S,{})},filters(){return m.get(`${S}.filters`,{})},quickFilter(){return m.get(`${S}.quickFilter`,"newest")},page(){return m.get(`${S}.page`,1)},limit(){return m.get(`${S}.limit`,12)},setFilters(e){m.patchState(`${S}.filters`,{...this.filters(),...e},"public:filters"),m.patchState(`${S}.page`,1,"public:page-reset")},resetFilters(){m.patchState(`${S}.filters`,{keyword:"",brand_name:"",brand_names:[],transmission:"",location_name:"",location_names:[],min_price_cash:"",max_price_cash:""},"public:filters-reset"),m.patchState(`${S}.page`,1,"public:page-reset")},setQuickFilter(e){m.patchState(`${S}.quickFilter`,e,"public:quick-filter")},setFilterOpen(e){m.patchState(`${S}.isFilterOpen`,!!e,"public:filter-sheet")},incrementPage(){m.patchState(`${S}.page`,this.page()+1,"public:page-next")},setSelectedCar(e){m.patchState(`${S}.selectedCarId`,e,"public:selected-car")},selectedCarSummary(e=this.get().selectedCarId,a={}){let t=String(e??""),n=this.workingCatalog({cars:[]})?.cars??[],r=this.cachedCatalog(a)?.cars??[],i=this.snapshotCatalog({cars:[]})?.cars??[];return[...n,...r,...i].find(o=>String(o.id)===t)??null},saveScrollPosition(e){let a=Number.isFinite(Number(e))?Number(e):0;m.patchState(`${S}.scrollPosition`,a,"public:scroll-save")},consumeScrollPosition(){let e=m.get(`${S}.scrollPosition`,null);return m.patchState(`${S}.scrollPosition`,null,"public:scroll-consume"),Number.isFinite(Number(e))?Number(e):null},snapshotCatalog(e=null){return m.get("snapshot.public.catalog.data",e)},workingCatalog(e=null){return m.get("working.publicCatalog.catalog.data",e)},setWorkingCatalog(e){m.patchState("working.publicCatalog.catalog",{data:e,hydratedAt:Date.now()},"public:catalog-set")},cachedCatalog(e={}){let a=xa(e),t=Le.get(a);return t?Date.now()-t.storedAt>Ft?(Le.delete(a),null):t.catalog:null},rememberCatalog(e,a={}){!e||!Array.isArray(e.cars)||Le.set(xa(a),{catalog:e,storedAt:Date.now()})}};function xa({affiliateSlug:e="",showroomSlug:a="",filters:t={},page:n=1}={}){return JSON.stringify({affiliateSlug:String(e??"").trim().toLowerCase(),showroomSlug:String(a??"").trim().toLowerCase(),filters:$e(t),page:Number(n)>0?Math.floor(Number(n)):1})}function $e(e){return Array.isArray(e)?e.map(a=>$e(a)):e&&typeof e=="object"?Object.fromEntries(Object.keys(e).sort().map(a=>[a,$e(e[a])])):e}function ya({affiliate:e=null,onClear:a=null}={}){if(!e)return null;let t=document.createElement("section");t.className="hidden relative grid gap-3 overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white/96 p-4 shadow-card",Y(t,"public.affiliate.banner");let n=document.createElement("div");n.className="hidden absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_35%),linear-gradient(135deg,rgba(250,244,237,0.92),rgba(255,255,255,0.98))]";let r=document.createElement("div");r.className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";let i=document.createElement("div");i.className="grid min-w-0 gap-1";let o=document.createElement("p");o.className="inline-flex w-fit rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] px-3 py-1 text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]",o.textContent="Context marketing aktif";let s=document.createElement("h2");s.className="break-words text-sm font-bold tracking-normal text-gray-950 sm:text-base",s.textContent=e.showroom?.name?`Katalog ${e.showroom.name}`:e.seller?.name?`Katalog seller ${e.seller.name}`:"Katalog marketing";let l=document.createElement("p");if(l.className=`break-words text-xs leading-6 ${ke.text.muted}`,l.textContent=e.profile?.name?`Anda sedang masuk lewat marketing ${e.profile.name}. CTA konsultasi dan transaksi tetap membawa context ini selama sesi aktif.`:"Anda sedang melihat katalog dengan context marketing aktif.",i.append(o,s,l),r.append(i),a){let d=w({label:"Lepas context",variant:"secondary",onClick:a,designHook:"shared.button.secondary"});d.classList.add("w-full","sm:w-auto"),r.append(d)}return t.append(n,r),t}var wa="pub-local-filter-modal";function Sa({open:e=!1,filters:a={},options:t={},onApply:n=null,onClose:r=null,onReset:i=null}={}){let o=document.createElement("span");if(o.hidden=!0,!e)return Ht(),o;let s=document.createElement("section");s.id="pub_filter_modal_content",s.className="grid min-w-0 gap-5";let l={brands:qt(a),locations:Jt(a)};s.append(Be("Merek",Me(t.brands??[],"Semua merek").map(u=>({label:u.label,value:u.value,icon:"car",active:u.value===""?l.brands.length===0:l.brands.includes(u.value),onClick:(g,b)=>{u.value===""?l.brands=[]:l.brands=va(l.brands,u.value),_a(b,l.brands)}}))),Be("Transmisi",Me(t.transmissions??[],"Semua transmisi").map(u=>({label:u.label,value:u.value,icon:"sort",active:String(a.transmission??"")===u.value,onClick:(g,b)=>Gt(g,b)})),"transmission"),Be("Lokasi",Me(t.locations??[],"Semua lokasi").map(u=>({label:u.label,value:u.value,icon:"location",active:u.value===""?l.locations.length===0:l.locations.includes(u.value),onClick:(g,b)=>{u.value===""?l.locations=[]:l.locations=va(l.locations,u.value),_a(b,l.locations)}}))),Kt(a));let d=document.createElement("section");d.className="grid grid-cols-2 gap-3";let c=w({label:"Reset",variant:"secondary",onClick:()=>{te({notify:!1}),i?.()},designHook:"shared.button.secondary"});c.id="pub_filter_reset_button",c.classList.add("w-full","min-h-11","px-4","py-2","text-xs");let p=w({label:"Terapkan",onClick:()=>{te({notify:!1});let u=Ut(s);n?.({...u,brand_name:"",brand_names:[...l.brands],location_name:"",location_names:[...l.locations]})},designHook:"shared.button.primary"});return p.id="pub_filter_apply_button",p.classList.add("w-full","min-h-11","px-4","py-2","text-xs"),d.append(c,p),s.append(d),ta(s,{key:wa,title:"Filter Mobil",description:"Filter lokal dari data mobil yang sudah tersedia di halaman.",size:"lg",footer:null,panelId:"pub_filter_modal",headerId:"pub_filter_modal_header",bodyId:"pub_filter_modal_body",closeButtonId:"pub_filter_modal_close_button",onClose:r}),o}function Ht(){m.get("ui.modal",null)?.key===wa&&te({notify:!1})}function Kt(e){let a=document.createElement("section");return a.className="grid gap-4",a.append(_e({name:"min_price_cash",type:"number",label:"Harga minimum",value:e.min_price_cash??"",placeholder:"Contoh 100000000"}),_e({name:"max_price_cash",type:"number",label:"Harga maksimum",value:e.max_price_cash??"",placeholder:"Contoh 300000000"})),a}function Ut(e){let a={transmission:"",location_name:"",min_price_cash:"",max_price_cash:""};return e.querySelectorAll("[data-filter-name]").forEach(t=>{t.dataset.active==="true"&&(a[t.dataset.filterName]=t.dataset.value??"")}),e.querySelectorAll("input").forEach(t=>{a[t.name]=t.value??""}),a}function Be(e,a,t=""){let n=document.createElement("section");n.className="grid min-w-0 gap-3";let r=document.createElement("h3");r.className="text-xs font-black text-[var(--pb-text)]",r.textContent=e;let i=document.createElement("section");i.className="grid grid-cols-2 gap-2 sm:grid-cols-3";let o=[];return a.forEach(s=>{let l=document.createElement("button");l.type="button",l.className=Te(s.active),l.dataset.active=s.active?"true":"false",l.dataset.value=s.value??"",t&&(l.dataset.filterName=t),l.append(Wt({icon:s.icon}),Vt("span","min-w-0 truncate text-left",s.label)),l.addEventListener("click",()=>s.onClick(l,o)),o.push(l),i.append(l)}),n.append(r,i),n}function Te(e){return e?"inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_30%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-xs font-black text-[var(--pb-brand-secondary)]":"inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 py-2 text-xs font-bold text-[var(--pb-text-strong)] transition hover:bg-[var(--pb-surface-muted)]"}function _a(e,a){let t=new Set(a.map(String));e.forEach(n=>{let r=String(n.dataset.value??""),i=r===""?t.size===0:t.has(r);n.dataset.active=i?"true":"false",n.className=Te(i)})}function Gt(e,a){a.forEach(t=>{let n=t===e;t.dataset.active=n?"true":"false",t.className=Te(n)})}function qt(e){if(Array.isArray(e?.brand_names))return[...new Set(e.brand_names.map(String).filter(Boolean))];let a=String(e?.brand_name??"");return a?[a]:[]}function Jt(e){if(Array.isArray(e?.location_names))return[...new Set(e.location_names.map(String).filter(Boolean))];let a=String(e?.location_name??"");return a?[a]:[]}function va(e,a){let t=new Set((Array.isArray(e)?e:[]).map(String).filter(Boolean));return t.has(a)?t.delete(a):t.add(a),[...t]}function Wt({icon:e="info"}={}){let a=document.createElement("span");return a.className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--pb-brand-secondary)]",a.append(R(e,{className:"h-4 w-4"})),a}function Vt(e,a,t){let n=document.createElement(e);return n.className=a,n.textContent=t,n}function Me(e,a){return[{value:"",label:a},...e.filter(Boolean).map(t=>({value:t,label:t}))]}var Ie="bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-accent)_22%,transparent),transparent_22%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_12%),linear-gradient(180deg,var(--pb-public-canvas-start)_0%,var(--pb-public-canvas-mid)_45%,var(--pb-public-canvas-end)_100%)]",Ea=[];function $a({notFound:e=!1}={}){let a=null,t=null,n=null,r=!1,i=!1,o=()=>(n??(n=se({id:"public_catalog_background_video_layer",fallbackClassName:Ie,overlayClassName:"bg-black/35"})),n);return T({async bootstrap(s){k.syncRouteContext(s);let l=k.routeAffiliateSlug(s),d=k.routeShowroomSlug(s);l&&await k.activateAffiliateBySlug(l).catch(()=>null),d&&await k.activateShowroomBySlug(d).catch(()=>null),(l||d)&&xe()&&await ne.load().catch(()=>null)},mount(s){return a=document.createElement("div"),a.className="min-h-screen",Q(a,s,{notFound:e,isLoadingMore:r,isRefreshing:i,getBackgroundVideoLayer:o}),ba.trackCurrentPage(),rn(s),a},hydrate(s){Q(a,s,{notFound:e,isLoadingMore:r,isRefreshing:i,getBackgroundVideoLayer:o})},bindEvents(s){return t=m.subscribe((l,d)=>{Yt(d)&&Q(a,s,{notFound:e,isLoadingMore:r,isRefreshing:i,getBackgroundVideoLayer:o})}),()=>t?.()},unmount(){h.setFilterOpen(!1)},dispose(){Re(a),n?.dispose?.(),n=null,t=null}})}function Yt(e){let a=String(e??"");return a?a.startsWith("ui:")||a==="public:selected-car"||a==="public:scroll-save"||a==="public:scroll-consume"?!1:["auth.","auth:","favorites:","public:","public-context:","working:","snapshot:set","route:","app.route"].some(t=>a.startsWith(t)||a.includes(t)):!0}function Q(e,a,t){if(!e)return;let n=k.activeAffiliate(),r=k.activeShowroom(),i=k.routeAffiliateSlug(a),o=k.routeShowroomSlug(a),s=!!i,l=!!o,d=s&&k.invalidSlug()===i,c=l&&k.invalidSlug()===o,p=n||r;if(s||l){let y=k.inactiveShowroomContext();if(y.isInactive){e.replaceChildren(ka({showroomName:y.showroomName}));return}}let u=h.get(),g=u.filters??{},b={affiliateSlug:i,showroomSlug:o,filters:g,page:u.page},v=h.cachedCatalog(b),L=h.snapshotCatalog({cars:[],meta:{}}),x=h.workingCatalog(null),B=Pa(x??v??(s||l?{cars:[],meta:{}}:L),v,u.page),Ke=m.get("working.publicCatalog.catalog.hydratedAt",0)??0;Ke&&B&&h.rememberCatalog(B,b);let ge=B?.meta??{},Ue=De(B?.cars??[]),W=un(mn(Ue,g),u.quickFilter),fe=ln(Ue,dn()),gt=pn(ge,W.length,u.page,u.limit),ft=(!s||(n?.slug??"")===i)&&(!l||(r?.slug??"")===o),ee=ja(a),Ge=Ba();if((s||l)&&!d&&!c&&(!ft||!Ke&&!v)){Re(e),e.replaceChildren(tn(g,u.quickFilter,fe,ee?t.getBackgroundVideoLayer?.():null,ee,p));return}let V=document.createElement("div");V.className=ee?"relative isolate min-h-screen overflow-x-clip bg-transparent":`relative isolate min-h-screen overflow-x-clip ${Ie}`,Y(V,"catalog.page"),Ra(V,ee?t.getBackgroundVideoLayer?.():null,za());let be=A.isAuthenticated(),D=A.role(),bt=be&&D==="buyer"&&ja(a)||l||s,M=document.createElement("div");if(M.className=bt?"relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-3 pb-28 pt-4 sm:gap-6 sm:px-6 sm:pb-32 sm:pt-6 md:pb-6 2xl:max-w-[1240px]":"relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 2xl:max-w-[1240px]",be&&(D==="buyer"||D==="seller")&&M.append(ra({activePath:a?.path??"/",brandLabel:D==="seller"?"Marketing":"Premium Buyer",brandIcon:D==="seller"?"showroom":"car",user:A.user(),onNavigate:y=>a.router?.navigate(y)})),be&&(D==="buyer"||D==="seller")&&M.append(bn({user:A.user(),actions:{navigate:y=>a.router?.navigate(y)}})),p){let y=ya({affiliate:p,onClear:()=>{k.clear(),a.router.navigate("/public")}});y&&M.append(y)}d||c?M.append(X({title:c?"Showroom tidak ditemukan":"Marketing tidak ditemukan",description:"Slug ini tidak aktif atau tidak tersedia lagi. Kembali ke landing utama untuk melihat katalog publik."})):(M.append(ve({filters:g,quickFilter:u.quickFilter,activeFilterCount:Ia(g),options:fe,onSearch:y=>h.setFilters(y),onQuickFilter:y=>h.setQuickFilter(y),onOpenFilter:()=>h.setFilterOpen(!0)})),M.append(Ge.length?ye({sliders:Ge,idPrefix:"pubcat",context:"public",onNavigate:y=>a.router?.navigate(y),resolveCtaUrl:y=>s?Xt(y,i,n?.showroom?.slug??""):l?Zt(y,o):y,fallback:()=>ue()}):ue()),M.append(Ta({count:W.length,meta:ge,affiliate:p})),M.append(en(W.length,ge,p),an({cars:W,router:a.router,isRefreshing:t.isRefreshing,showFavorite:(l||s)&&xe()}),on({canLoadMore:gt,isLoadingMore:t.isLoadingMore,onLoadMore:()=>sn(e,a,t)}))),V.append(M,Sa({open:!!u.isFilterOpen,filters:g,options:fe,onApply:y=>{h.setFilterOpen(!1),h.setFilters(y)},onReset:()=>{h.resetFilters(),h.setFilterOpen(!1)},onClose:()=>h.setFilterOpen(!1)})),Re(e),e.replaceChildren(V),ua.enqueueCars(W,{affiliateSlug:i,showroomSlug:o})}function Ba(){let e=m.get("working.publicCatalog.sliders.data",null),a=m.get("snapshot.public.slidersPublicHome.data",null),t=m.get("snapshot.public.slidersLandingHero.data",null),n=[...ze(e),...ze(a),...ze(t)],r=new Set,i=n.filter(o=>{let s=String(o?.id??o?.code??"");return!s||r.has(s)?!1:(r.add(s),!0)}).slice(0,5);return i.length?(Ea=i,i):Ea}function Xt(e,a,t=""){let n=t?`/${encodeURIComponent(t)}/${encodeURIComponent(a)}`:`/af/${encodeURIComponent(a)}`,r=String(e||"").trim();if(!r)return n;let i=Ma(r);return!i||i==="/"||i==="/public"?n:i.startsWith("/cars/")||i.startsWith("/transactions/")?`${n}${i}`:i.startsWith("/af/")||i.startsWith("/a/")?i:n}function Zt(e,a){let t=`/${encodeURIComponent(a)}`,n=String(e||"").trim();if(!n)return t;let r=Ma(n);return!r||r==="/"||r==="/public"?t:r.startsWith("/cars/")||r.startsWith("/transactions/")?`/${encodeURIComponent(a)}${r}`:r.startsWith("/showrooms/")||r.startsWith("/s/")?r:t}function Ma(e){let a=String(e||"").trim();if(a.startsWith("#/"))return a.slice(1);if(a.startsWith("/#/"))return a.slice(2);if(a.startsWith("/"))return a.replace(/\/$/,"")||"/";try{let t=new URL(a,window.location.origin);if(t.hash.startsWith("#/"))return t.hash.slice(1);if(t.origin===window.location.origin||Qt(t.hostname))return t.pathname.replace(/\/$/,"")||"/"}catch{}return""}function Qt(e){let a=We(e),t=ae(),n=t.default;return a?Object.keys(t).some(r=>t[r]===a)?!0:!!n&&a.endsWith(`.${n}`):!1}function ze(e){return Array.isArray(e)?e.filter(Boolean):Array.isArray(e?.sliders)?e.sliders.filter(Boolean):Array.isArray(e?.data?.sliders)?e.data.sliders.filter(Boolean):[]}function en(e,a,t=null){let n=document.createElement("div");n.className="mt-1 rounded-[24px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur md:flex md:items-center md:justify-between xl:px-5",Y(n,"catalog.filter.toolbar");let r=document.createElement("div");r.className="";let i=document.createElement("h2");i.className="break-words text-xs font-bold tracking-normal text-[var(--pb-text-strong)]",i.textContent=t?.showroom?.name?`Mobil Pilihan ${t.showroom.name}`:"Mobil Pilihan Terbaik";let o=document.createElement("p");o.className="text-xs font-medium text-[var(--pb-text-muted)]";let s=document.createElement("a");return s.href=k.catalogPath(),s.className="hidden inline-flex w-fit items-center gap-1 text-xs font-semibold text-[var(--pb-brand-accent)] no-underline",s.textContent="Semua >",r.append(i,o),n.append(r,s),n}function an({cars:e,router:a,isRefreshing:t,showFavorite:n=!1}){if(t){let i=document.createElement("div");return i.className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3",i.append(K({lines:4}),K({lines:4}),K({lines:4}),K({lines:4})),i}if(!e.length)return X({title:"Mobil tidak ditemukan",description:"Ubah kata kunci atau filter untuk melihat katalog lainnya."});let r=document.createElement("div");return r.className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3",e.forEach(i=>{r.append(na({car:i,showFavorite:n,isFavorite:n&&ne.isFavorited(i.id),onToggleFavorite:o=>ne.toggle(o.id).catch(s=>{j(s?.message||"Favorit gagal disimpan.",{type:"error",key:"favorite-toggle-error",dedupeMs:3e3})}),onOpenDetail:o=>{h.saveScrollPosition(window.scrollY),h.setSelectedCar(o.id),a.navigate(k.carDetailPath(o.id))}}))}),r}function tn(e={},a="newest",t={},n=null,r=!1,i=null){let o=document.createElement("div");o.className=r?"relative isolate min-h-screen overflow-x-clip bg-transparent":`relative isolate min-h-screen overflow-x-clip ${Ie}`,Ra(o,n,za());let s=Ba(),l=document.createElement("div");return l.className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-4 py-4 sm:px-6 sm:py-6 2xl:max-w-[1240px]",l.append(ve({filters:e,quickFilter:a,options:t,activeFilterCount:Ia(e)}),s.length?ye({sliders:s,idPrefix:"pubcat",context:"public",fallback:()=>ue()}):ue(),Ta({count:0,meta:{},affiliate:i}),K({lines:8})),o.append(l),o}function ue(){let e=document.createElement("section");e.id="pubcat_slider_skeleton",e.className="relative overflow-hidden rounded-[24px] border border-white/45 bg-white/20 shadow-[0_22px_58px_rgba(15,23,42,.10)] backdrop-blur",e.style.aspectRatio="16 / 5",e.setAttribute("aria-hidden","true");let a=document.createElement("span");a.className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent)] animate-[pbPublicSliderShimmer_1.2s_infinite]";let t=document.createElement("span");t.className="absolute inset-4 grid grid-cols-[minmax(0,1fr)_34%] items-center gap-4";let n=document.createElement("span");n.className="grid gap-3",["h-4 w-24","h-8 w-3/4","h-4 w-1/2"].forEach(i=>{let o=document.createElement("span");o.className=`${i} rounded-full bg-white/55`,n.append(o)});let r=document.createElement("span");return r.className="h-full min-h-0 rounded-[18px] bg-white/45",t.append(n,r),e.append(a,t),nn(),e}var Aa=!1;function nn(){if(Aa||typeof document>"u")return;Aa=!0;let e=document.createElement("style");e.id="pubcat-slider-skeleton-style",e.textContent="@keyframes pbPublicSliderShimmer{100%{transform:translateX(100%)}}",document.head.append(e)}function rn(e){let a=h.consumeScrollPosition();a!==null&&(e?.router?.tahanGulirSekali?.(),requestAnimationFrame(()=>{window.scrollTo({top:a,left:0,behavior:"instant"})}))}function on({canLoadMore:e,isLoadingMore:a,onLoadMore:t}){let n=document.createElement("div");if(n.className="mt-6 grid gap-4 place-items-center",!e){let i=document.createElement("p");return i.className="text-xs text-[var(--pb-text-muted)]",i.textContent="Semua mobil yang cocok sudah ditampilkan.",n.append(i,Ca()),n}let r=w({label:a?"Memuat...":"Muat lebih banyak",variant:"secondary",disabled:a,onClick:t,designHook:"catalog.load_more.button"});return r.classList.add("w-full","xsm:w-auto","px-6","py-3"),n.append(r,Ca()),n}function Ta({count:e,meta:a,affiliate:t}){return""}function za(){let e=document.createElement("div");return e.className="pointer-events-none absolute inset-0",e.innerHTML=`
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.18)_0,transparent_2px),radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.14)_0,transparent_2px),radial-gradient(circle_at_36%_42%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_83%_34%,rgba(255,255,255,0.14)_0,transparent_2px),radial-gradient(circle_at_22%_62%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_64%_72%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_48%_88%,rgba(255,255,255,0.14)_0,transparent_2px)] bg-[length:100%_100%] opacity-70"></div>
  `,e}function Ra(e,...a){a.filter(Boolean).forEach(t=>e.append(t))}function Re(e){Array.from(e?.querySelectorAll?.(".pb-slider-banner")??[]).forEach(t=>t.dispose?.())}function Ca(){let e=document.createElement("div");return e.className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-medium text-[var(--pb-text-muted)]",["Inspeksi jelas","Harga terarah","Support cepat"].forEach(a=>{let t=document.createElement("span");t.className="inline-flex items-center gap-2";let n=document.createElement("span");n.className="h-2 w-2 rounded-full bg-[var(--pb-brand-primary)]";let r=document.createElement("span");r.textContent=a,t.append(n,r),e.append(t)}),e}async function sn(e,a,t){t.isLoadingMore=!0,Q(e,a,t);try{let n=k.routeAffiliateSlug(a),r=k.routeShowroomSlug(a),i=h.page()+1,o={affiliateSlug:n,showroomSlug:r,filters:h.filters(),page:h.page()},s=h.cachedCatalog(o),l=Pa(h.workingCatalog(null)??s??{cars:[],meta:{}},s,h.page()),d=await oe.list({page:i,limit:h.limit(),filters:h.filters(),affiliateSlug:n,showroomSlug:r});h.incrementPage(),h.setWorkingCatalog({cars:[...l?.cars??[],...d?.cars??[]],meta:d?.meta??l?.meta??{}})}catch(n){j(n.message||"Gagal memuat mobil tambahan.",{type:"error"})}finally{t.isLoadingMore=!1,Q(e,a,t)}}function Pa(e,a,t){if(!e||!a||Number(t)<=1)return e;let n=Array.isArray(e.cars)?e.cars:[],r=Array.isArray(a.cars)?a.cars:[];if(r.length<=n.length)return e;let i=new Set(n.map(o=>String(o?.id??"")));return{...a,...e,cars:[...n,...r.filter(o=>!i.has(String(o?.id??"")))]}}function Ia(e){return Object.entries(e).reduce((a,[t,n])=>t==="keyword"||t==="brand_name"||t==="location_name"?a:t==="brand_names"&&Array.isArray(n)||t==="location_names"&&Array.isArray(n)?a+n.filter(Boolean).length:n!==""&&n!==null&&n!==void 0?a+1:a,0)}function ln(e,a=null){return e=De(e),{brands:Na(e.map(t=>t.brand_name)),transmissions:Na(e.map(t=>t.transmission)),locations:cn(a)}}function Na(e){return[...new Set(e.filter(Boolean))].sort()}function dn(){return Qe.normalizeLocationMaster(m.get("working.publicCatalog.masterLocation.data",null)??m.get("snapshot.public.masterLocation.data",null))}function cn(e){return(e?.data?.cities??[]).filter(a=>a.status==="active").map(a=>a.name).filter(Boolean).sort((a,t)=>a.localeCompare(t))}function pn(e,a,t,n){return e?.total?a<Number(e.total):a>=t*n}function un(e,a){let t=[...e];return a==="promo"?t.filter(n=>Number(n.price_discount??0)>0&&Number(n.price_discount)<Number(n.price_cash??0)):a==="price-low"?t.sort((n,r)=>Pe(n)-Pe(r)):a==="mileage-low"?t.sort((n,r)=>Number(n.mileage_km??999999999)-Number(r.mileage_km??999999999)):t.sort((n,r)=>{let i=Date.parse(n.published_at??n.created_at??"")||Number(n.id??0);return(Date.parse(r.published_at??r.created_at??"")||Number(r.id??0))-i})}function mn(e,a={}){let t=String(a.keyword??"").trim().toLowerCase(),n=gn(a).map(l=>l.toLowerCase()),r=String(a.transmission??"").trim().toLowerCase(),i=fn(a).map(l=>l.toLowerCase()),o=Number(a.min_price_cash??0),s=Number(a.max_price_cash??0);return De(e).filter(l=>{let d=[l.brand_name,l.model_name,l.sub_model_name,l.location_name,l.transmission].filter(Boolean).join(" ").toLowerCase(),c=Pe(l);return!(t&&!d.includes(t)||n.length>0&&!n.includes(String(l.brand_name??"").toLowerCase())||r&&String(l.transmission??"").toLowerCase()!==r||i.length>0&&!i.includes(String(l.location_name??"").toLowerCase())||o>0&&c<o||s>0&&c>s)})}function gn(e){if(Array.isArray(e?.brand_names))return[...new Set(e.brand_names.map(String).filter(Boolean))];let a=String(e?.brand_name??"");return a?[a]:[]}function fn(e){if(Array.isArray(e?.location_names))return[...new Set(e.location_names.map(String).filter(Boolean))];let a=String(e?.location_name??"");return a?[a]:[]}function De(e=[]){return(Array.isArray(e)?e:[]).filter(a=>["published","view_sold"].includes(String(a?.listing_status??"").toLowerCase()))}function Pe(e){let a=Number(e.price_discount??0),t=Number(e.price_cash??0);return a>0&&a<t?a:t}function ja(e){let a=String(e?.name??e?.route?.name??""),t=String(e?.path??"");return a==="public.catalog"||a==="public.catalog-alias"||t==="/"||t==="/public"}function bn({user:e,actions:a}){let t=document.createElement("header");t.id="byr_profile_header",t.className="relative flex min-w-0 items-start justify-between gap-3 px-1 py-1 md:hidden",t.dataset.ds="buyer.dashboard.profile_header";let n=document.createElement("section");n.className="flex min-w-0 flex-1 items-start gap-3";let r=document.createElement("button");r.id="byr_mobile_menu_button",r.type="button",r.hidden=!0,r.className="hidden",r.setAttribute("aria-hidden","true"),r.setAttribute("aria-label","Open menu"),r.append(R("bars",{className:"block h-5 w-5 leading-none"})),n.append(r,hn(e));let i=document.createElement("section");return i.className="relative z-20 inline-flex shrink-0 items-center justify-end gap-2",i.append(aa({idPrefix:"byr_mobile",compact:!0,onNavigate:a.navigate,withBackdrop:!0}),kn({user:e,actions:a,compact:!0})),t.append(n,i),t}function hn(e){let a=Da(e)||"User",t=document.createElement("section");t.className="grid min-w-0 gap-0.5";let n=document.createElement("h1");return n.className="truncate text-lg font-black leading-tight tracking-normal text-[var(--pb-text-strong)]",n.textContent=` ${a}`,t.append(n,yn("p","truncate text-[5] font-semibold text-[var(--pb-text-muted)]","Selamat datang kembali!")),t}function Da(e={}){return e.name??e.full_name??e.username??e.email?.split("@")[0]??"User"}function La(e={}){return Da(e).split(/\s+/).filter(Boolean).slice(0,2).map(a=>a[0]?.toUpperCase()).join("")||"U"}function kn({user:e,actions:a,compact:t=!1}={}){let n=document.createElement("button");n.type="button",n.className=t?"inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]":"inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]",n.setAttribute("aria-label","Buka profil buyer"),n.title="Profil",n.addEventListener("click",()=>a?.navigate?.("/profile"));let r=e?.avatar_url??e?.photo_url??e?.profile_photo_url??"";if(r){let i=document.createElement("img");return i.src=xn(r),i.alt="Avatar buyer",i.loading="lazy",i.className="block h-full w-full object-cover",i.addEventListener("error",()=>{n.textContent=La(e)},{once:!0}),n.append(i),n}return n.textContent=La(e),n}function xn(e){let a=String(e??"").trim();return a?/^(https?:|data:|blob:)/.test(a)||a.startsWith("/")?a:`/storage/${a.replace(/^\/+/,"")}`:""}function yn(e,a,t){let n=document.createElement(e);return n.className=a,n.textContent=t??"",n}var _n={brand:{appName:"BeliMobil",shortMark:"BM",tagline:"Jual beli mobil terpercaya",logoIcon:"brandMark",logoMarkAsset:"brand.logoMark"},contact:{whatsapp:""},colors:{primary:"#1e81b0",secondary:"#17698f",accent:"#eab676",pageBg:"#faf4ed",surface:"#ffffff",surfaceMuted:"#faf4ed",inset:"#f5ece1",text:"#1c1917",textStrong:"#2f2a26",textMuted:"#6f665e",border:"#e7dccd",borderStrong:"#d8c9b4",overlay:"rgba(28, 25, 23, 0.55)",success:"#15803d",warning:"#b45309",danger:"#b91c1c",info:"#1e81b0",publicCanvasStart:"#ffffff",publicCanvasMid:"#faf4ed",publicCanvasEnd:"#f5ece1"},shell:{publicHeaderBg:"rgba(255, 255, 255, 0.92)",appHeaderBg:"rgba(255, 255, 255, 0.95)",sidebarStart:"#1e81b0",sidebarEnd:"#17698f",navActiveBg:"rgba(255, 255, 255, 0.18)",navText:"#ffffff"},button:{primaryFrom:"#15803d",primaryTo:"#1a9a49",secondaryBg:"#ffffff",secondaryText:"#17698f",ghostText:"#17698f"},surface:{cardBg:"#ffffff",cardBorder:"#e7dccd",panelBg:"#ffffff",insetBg:"#faf4ed"},form:{searchBg:"#ffffff",inputBg:"#ffffff",controlBorder:"#d8c9b4",focus:"#1e81b0",chipBg:"#ffffff",chipText:"#4a423b",chipActiveFrom:"#1e81b0",chipActiveTo:"#17698f"},state:{emptyBg:"#ffffff",errorBg:"#ffffff",errorBorder:"#f0c9c9",badgeNeutralBg:"#f3ece3"},layout:{spacingScale:1,radiusScale:1,shadowDepth:1}},Oa=globalThis.__PROJECTB_THEME_DEFAULTS__?typeof structuredClone=="function"?structuredClone(globalThis.__PROJECTB_THEME_DEFAULTS__):JSON.parse(JSON.stringify(globalThis.__PROJECTB_THEME_DEFAULTS__)):_n;function Fa(){return Ve(globalThis.__PROJECTB_GET_THEME__?.()??globalThis.__PROJECTB_THEME__??Oa)}var Ha={public:"/",buyer:"/buyer",seller:"/seller",admin:"/admin",affiliate_admin:"/affiliate"},C={async loginForRole(e,a){let t=await F.login(a),n=F.user()?.role??"public";if(n!==e){await F.logout();let r=new Error(this.roleMismatchMessage(e,n));throw r.code="ROLE_MISMATCH",r.selectedRole=e,r.actualRole=n,r}return t},login(e){return F.login(e)},async registerForRole(e,a){if(!this.canRegisterRole(e))throw new Error(`Registrasi ${this.roleLabel(e)} tidak tersedia dari halaman ini.`);return await F.register({...a,role:e}),e!=="buyer"?{authenticated:!1}:(await this.loginForRole(e,{email:a.email,password:a.password}),{authenticated:!0})},logout(){return F.logout()},supportedRoles(){return["buyer","seller","admin","affiliate_admin"]},normalizeRole(e){return this.supportedRoles().includes(e)?e:"buyer"},normalizeAuthMode(e){return e==="register"?"register":"login"},canRegisterRole(e){return e==="buyer"},registerPathForRole(e){return e==="seller"?"/daftar-showroom":null},homeForRole(e){return Ha[e]??Ha.public},canOpenPath(e,a){return!a||typeof a!="string"?!1:e==="admin"?a==="/admin"||a.startsWith("/admin/"):e==="affiliate_admin"?a==="/affiliate"||a.startsWith("/affiliate/"):e==="buyer"?a==="/buyer"||a.startsWith("/buyer/"):e==="seller"?a==="/seller"||a.startsWith("/seller/"):a==="/"||a.startsWith("/cars/")||a.startsWith("/transactions/")},resolveAfterLogin({selectedRole:e,actualRole:a,fromPath:t}){return a===e&&this.canOpenPath(a,t)?t:this.homeForRole(a)},roleMismatchMessage(e,a){return`Akun ${this.roleLabel(a)} tidak bisa masuk lewat jalur ${this.roleLabel(e)}.`},roleLabel(e){return ea(e)},roleCopy(e){return e==="seller"?{title:"Masuk sebagai showroom",description:"Kelola showroom, listing, dan transaksi."}:e==="admin"?{title:"Masuk sebagai admin",description:"Pantau user, approval, dan operasional."}:e==="affiliate_admin"?{title:"Masuk sebagai marketing",description:"Pantau aktivitas, ledger, dan settlement."}:{title:"Masuk sebagai buyer",description:"Lanjutkan transaksi dan pembayaran."}}};var vn=[{role:"buyer",label:"Buyer",icon:"transaction",futureCopy:"Transaksi dan pembayaran."},{role:"seller",label:"Showroom",icon:"showroom",futureCopy:"Showroom dan listing."},{role:"admin",label:"Admin",icon:"dashboard",futureCopy:"Operasi dan approval."},{role:"affiliate_admin",label:"Marketing",icon:"affiliate",futureCopy:"Aktivitas dan komisi."}],wn=Object.freeze({seller:"seller",admin:"admin",affiliate_admin:"affiliate"}),z=!1,Sn="bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#faf4ed,#f8fafc_44%,#eaf4f9)]";function Ga(){let e=null,a=null,t={selectedRole:"buyer",authMode:"login",isSubmitting:!1,error:""},n=()=>(a??(a=se({id:"auth_background_video_layer",fallbackClassName:Sn,overlayClassName:"bg-white/42"})),a);return t.getBackgroundVideoLayer=n,T({bootstrap(r){t.selectedRole=C.normalizeRole(r.query.role),t.authMode=C.normalizeAuthMode(r.query.mode),t.error="",t.isSubmitting=!1},mount(r){return e=document.createElement("div"),e.className="relative isolate min-h-screen overflow-hidden bg-transparent",P(e,r,t,n),e},hydrate(r){P(e,r,t,n)},dispose(){a?.dispose?.(),a=null}})}function P(e,a,t,n=null){if(!e)return;let r=A.role(),i=Oe(a.query.from),o=wn[t.selectedRole];if(o&&!A.isAuthenticated()&&ae()[o]){a.router.navigate(`/login/${o}`);return}let s=document.createElement("main");s.id="hr_auth_frame",s.className=z?"relative z-10 mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-center":"relative z-10 mx-auto grid min-h-screen w-full items-center justify-items-center px-4 py-6 sm:px-6 sm:py-10 lg:justify-items-end lg:px-10";let l=document.createElement("div");l.className=z?"grid gap-5":"hidden",z||l.setAttribute("aria-hidden","true"),l.append(Cn({requestedPath:i}),Nn({selectedRole:t.selectedRole,onChange:p=>{t.selectedRole=p,C.canRegisterRole(p)||(t.authMode="login"),t.error="",P(e,a,t)}}));let d=document.createElement("aside");if(d.className="grid w-full max-w-[460px] gap-4",d.append(An(a.router)),A.isAuthenticated()){let p=C.resolveAfterLogin({selectedRole:r,actualRole:r,fromPath:i});d.append(En(C.roleLabel(r))),window.setTimeout(()=>{A.isAuthenticated()&&a.router.navigate(p)},0)}else d.append(jn({selectedRole:t.selectedRole,authMode:t.authMode,requestedPath:i,isSubmitting:t.isSubmitting,error:t.error,onModeChange:p=>{t.authMode=p,t.error="",P(e,a,t)},onLogin:p=>Tn(p,a,t,e),onRegister:p=>zn(p,a,t,e),onNavigate:p=>a?.router?.navigate(p)}));s.append(l,d);let c=n?.()??t.getBackgroundVideoLayer?.();e.replaceChildren(...[c,s].filter(Boolean)),Mn(s)}function En(e){let a=document.createElement("section");a.id="hr_auth_redirecting_section",a.className="grid gap-2 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 px-5 py-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl";let t=document.createElement("p");t.className="text-xs font-black text-gray-900",t.textContent="Sesi Anda masih aktif";let n=document.createElement("p");return n.className="text-xs leading-6 text-gray-600",n.textContent=`Mengarahkan ke dashboard ${e}...`,a.append(t,n),a}function An(e){let a=w({label:"Kembali ke landing page",variant:"secondary",onClick:()=>e.navigate("/")});return a.id="hr_auth_back_landing_button",a.classList.add("justify-self-start","rounded-full","px-4","shadow-sm","backdrop-blur","transition","duration-200","hover:-translate-y-0.5"),a}function Cn({requestedPath:e}){let a=document.createElement("section");a.id="hr_auth_brand_section",a.hidden=!z,a.setAttribute("aria-hidden",String(!z)),a.className=z?"relative overflow-hidden rounded-[2rem] border border-[var(--pb-card-border)] bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8":"hidden";let t=document.createElement("div");t.className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_20%,transparent)] blur-3xl";let n=document.createElement("div");n.className="relative grid max-w-xl gap-5";let r=document.createElement("div");r.className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-base font-black text-white shadow-[0_16px_40px_rgba(30,129,176,0.28)] transition duration-200 hover:scale-[1.02]",r.textContent="BM";let i=document.createElement("h1");i.className="max-w-lg text-3xl font-black leading-[0.98] tracking-[-0.04em] text-gray-950 sm:text-4xl",i.textContent="Masuk dengan akun yang tepat.";let o=document.createElement("p");o.className="max-w-md text-xs leading-6 text-gray-600 sm:text-sm",o.textContent=e?"Pilih level user, lalu lanjutkan ke halaman tujuan.":"Satu pintu untuk buyer, showroom, admin, dan marketing.";let s=document.createElement("div");return s.className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-600",["Cepat","Aman","Ringkas"].forEach((l,d)=>{let c=document.createElement("span");c.className="rounded-full border border-[var(--pb-card-border)] bg-white/75 px-3 py-1 shadow-sm",c.textContent=l,c.id=`hr_auth_brand_pill_${d+1}`,s.append(c)}),n.append(r,i,o,s),a.append(t,n),a}function Nn({selectedRole:e,onChange:a}){let t=document.createElement("section");return t.id="hr_auth_role_section",t.hidden=!z,t.setAttribute("aria-hidden",String(!z)),t.className=z?"grid gap-3 sm:grid-cols-2":"hidden",vn.forEach(n=>{let r=document.createElement("button");r.id=`hr_auth_role_${n.role}_button`,r.type="button",r.className=n.role===e?"group grid gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white/90 p-4 text-left shadow-[0_18px_45px_rgba(30,129,176,0.16)] ring-2 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] transition duration-200 hover:-translate-y-0.5":"group grid gap-3 rounded-[1.35rem] border border-[var(--pb-card-border)] bg-white/65 p-4 text-left shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]",r.addEventListener("click",()=>a(n.role));let i=document.createElement("div");i.className="flex items-center gap-3";let o=document.createElement("div");o.className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_12%,white),color-mix(in_srgb,var(--pb-brand-accent)_16%,white))] text-[var(--pb-brand-secondary)] shadow-sm transition duration-200 group-hover:scale-105",o.append(R(n.icon,{className:"h-5 w-5"}));let s=document.createElement("div");s.className="grid gap-1";let l=document.createElement("strong");l.className="text-xs font-black text-gray-950",l.textContent=n.label;let d=document.createElement("span");d.className="text-[10px] leading-5 text-gray-500",d.textContent=n.futureCopy,s.append(l,d),i.append(o,s);let c=document.createElement("span");c.className=n.role===e?"w-fit rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] px-2.5 py-1 text-[10px] font-bold text-[var(--pb-brand-secondary)]":"w-fit rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-gray-500",c.textContent=n.role===e?"Aktif":"Pilih",r.append(i,c),t.append(r)}),t}function jn({selectedRole:e,authMode:a,requestedPath:t,isSubmitting:n,error:r,onModeChange:i,onLogin:o,onRegister:s,onNavigate:l}){let d=C.roleCopy(e),c=C.canRegisterRole(e),p=c?a:"login",u=document.createElement("section");u.id="hr_auth_panel_section",u.className="relative grid gap-5 overflow-hidden rounded-[2rem] border border-[var(--pb-card-border)] bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl transition duration-300 sm:p-6";let g=document.createElement("div");g.className="grid gap-1.5";let b=document.createElement("h2");b.className="text-xl font-black tracking-[-0.03em] text-gray-950",b.textContent=p==="register"?`Daftar ${C.roleLabel(e)}`:"Masuk ke akun";let v=document.createElement("p");if(v.className="text-xs leading-6 text-gray-600",v.textContent=t?"Masuk, lalu kembali ke halaman tujuan.":"Gunakan email dan password sesuai akun Anda.",g.append(b,v),u.append(g),c&&u.append(Ln({activeMode:p,onModeChange:i})),!c){let L=C.registerPathForRole(e),x=document.createElement("p");if(x.id=`hr_auth_${e}_no_register_note`,x.className="rounded-2xl bg-[var(--pb-surface-muted)] px-3 py-2 text-xs leading-6 text-gray-600",L){x.append(document.createTextNode("Belum punya showroom? Pendaftaran ada di halaman terpisah."));let $=document.createElement("button");$.id="hr_auth_seller_register_link",$.type="button",$.className="ml-1 font-bold text-[var(--pb-brand-secondary)] underline underline-offset-2",$.textContent="Daftarkan showroom",$.addEventListener("click",()=>l?.(L)),x.append($)}else x.textContent="Level User ini memakai akun dari admin.";u.append(x)}return u.append(p==="register"?Bn({selectedRole:e,isSubmitting:n,error:r,onSubmit:s}):$n({selectedRole:e,isSubmitting:n,error:r,onSubmit:o})),u}function Ln({activeMode:e,onModeChange:a}){let t=document.createElement("div");return t.className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--pb-card-border)] bg-gray-100/80 p-1",t.append(Ka("login","Masuk",e,a),Ka("register","Daftar",e,a)),t}function Ka(e,a,t,n){let r=document.createElement("button");return r.id=`hr_auth_tab_${e}_button`,r.type="button",r.className=e===t?"rounded-xl bg-white px-3 py-2.5 text-xs font-black text-gray-950 shadow-sm transition duration-200":"rounded-xl px-3 py-2.5 text-xs font-bold text-gray-500 transition duration-200 hover:bg-white/70 hover:text-gray-800",r.textContent=a,r.addEventListener("click",()=>n?.(e)),r}function $n({selectedRole:e,isSubmitting:a,error:t,onSubmit:n}){let r=document.createElement("form");if(r.className="grid gap-3",r.append(H({id:`hr_auth_login_${e}_email_input`,name:"email",label:"Email",type:"email",placeholder:Rn(e)}),H({id:`hr_auth_login_${e}_password_input`,name:"password",label:"Password",type:"password",placeholder:"Password akun"})),t){let o=document.createElement("p");o.className="rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]",o.textContent=t,r.append(o)}let i=w({label:a?"Memproses...":`Masuk ${e}`,variant:"primary",disabled:a});return i.id=`hr_auth_login_${e}_submit_button`,i.type="submit",i.classList.add("w-full","shadow-[0_16px_34px_rgba(30,129,176,0.24)]","transition","duration-200","hover:-translate-y-0.5","active:translate-y-0"),r.append(i),r.addEventListener("submit",o=>{o.preventDefault();let s=Object.fromEntries(new FormData(r));n?.({email:s.email,password:s.password})}),r}function Bn({selectedRole:e,isSubmitting:a,error:t,onSubmit:n}){let r=document.createElement("form");if(r.className="grid gap-3",r.append(H({id:`hr_auth_register_${e}_name_input`,name:"name",label:"Nama",placeholder:e==="seller"?"Nama pemilik showroom":"Nama buyer"}),H({id:`hr_auth_register_${e}_phone_input`,name:"phone_number",label:"Nomor WhatsApp",placeholder:"081234567890",required:!1}),H({id:`hr_auth_register_${e}_email_input`,name:"email",label:"Email",type:"email",placeholder:Pn(e)}),H({id:`hr_auth_register_${e}_password_input`,name:"password",label:"Password",type:"password",placeholder:"Minimal 6 karakter"}),Ua({id:`hr_auth_register_${e}_address_input`,name:"address",label:"Alamat",placeholder:"Alamat domisili",required:!1})),e==="seller"&&r.append(H({id:"hr_auth_register_seller_showroom_name_input",name:"showroom_name",label:"Nama showroom",placeholder:"Nama showroom"}),Ua({id:"hr_auth_register_seller_showroom_address_input",name:"showroom_address",label:"Alamat showroom",placeholder:"Alamat showroom",required:!1})),t){let s=document.createElement("p");s.className="rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]",s.textContent=t,r.append(s)}let i=w({label:a?"Mendaftarkan...":In(e),variant:"primary",disabled:a});i.id=`hr_auth_register_${e}_submit_button`,i.type="submit",i.classList.add("w-full","shadow-[0_16px_34px_rgba(30,129,176,0.24)]","transition","duration-200","hover:-translate-y-0.5","active:translate-y-0"),r.append(i);let o=document.createElement("p");return o.className="text-xs leading-6 text-gray-600",o.textContent=e==="seller"?"Akun showroom akan masuk antrean approval admin sebelum bisa login.":"Akun buyer aktif setelah registrasi dan akan langsung diarahkan ke area buyer.",r.append(o),r.addEventListener("submit",s=>{s.preventDefault();let l=Object.fromEntries(new FormData(r)),d={name:l.name,phone_number:l.phone_number,email:l.email,password:l.password,address:l.address};e==="seller"&&(d.showroom={name:l.showroom_name,address:l.showroom_address,phone_number:l.phone_number}),n?.(d)}),r}function H({id:e,name:a,label:t,type:n="text",placeholder:r="",required:i=!0}){let o=document.createElement("label");o.className="grid gap-1.5 text-xs font-semibold text-gray-700",o.textContent=t;let s=document.createElement("input");return s.id=e,s.name=a,s.type=n,s.required=i,s.placeholder=r,s.className="min-h-11 min-w-0 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-xs text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]",o.append(s),o}function Ua({id:e,name:a,label:t,placeholder:n="",required:r=!0}){let i=document.createElement("label");i.className="grid gap-1.5 text-xs font-semibold text-gray-700",i.textContent=t;let o=document.createElement("textarea");return o.id=e,o.name=a,o.required=r,o.placeholder=n,o.rows=3,o.className="min-h-24 min-w-0 w-full resize-y rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-xs text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]",i.append(o),i}function Mn(e){!e||typeof e.animate!="function"||e.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"translateY(0)"}],{duration:240,easing:"cubic-bezier(0.22, 1, 0.36, 1)"})}async function Tn(e,a,t,n){t.isSubmitting=!0,t.error="",P(n,a,t);try{await C.login(e);let r=A.role(),i=Oe(a.query.from),o=C.resolveAfterLogin({selectedRole:r,actualRole:r,fromPath:i});j(`Login ${r} berhasil.`,{type:"success",key:"auth-login-success",dedupeMs:3e3}),a.router.navigate(o);return}catch(r){t.error=r.message||"Login gagal.",j(t.error,{type:"error",key:"auth-login-error",dedupeMs:3e3})}t.isSubmitting=!1,P(n,a,t)}async function zn(e,a,t,n){t.isSubmitting=!0,t.error="",P(n,a,t);try{if((await C.registerForRole(t.selectedRole,e))?.authenticated){let i=A.role(),o=t.selectedRole,s=Oe(a.query.from),l=C.resolveAfterLogin({selectedRole:o,actualRole:i,fromPath:s});j(`Registrasi ${o} berhasil.`,{type:"success"}),a.router.navigate(l);return}t.authMode="login",j("Registrasi showroom berhasil. Tunggu approval admin sebelum login.",{type:"success"})}catch(r){t.error=r.message||"Registrasi gagal.",j(t.error,{type:"error"})}finally{t.isSubmitting=!1,P(n,a,t)}}function Oe(e){return!e||typeof e!="string"||!e.startsWith("/")?"":e}function Rn(e){return e==="seller"?"seller@projectb.local":e==="admin"?"admin@projectb.local":e==="affiliate_admin"?"affiliate@projectb.local":"buyer@projectb.local"}function Pn(e){return e==="seller"?"seller-baru@projectb.local":"buyer-baru@projectb.local"}function In(e){return e==="seller"?"Daftar showroom":"Daftar buyer"}var E=`${/^(.*\/assets\/(?:v-[^/]+\/)?)/.exec(import.meta.url)?.[1]??""}images/landing/`,N=Object.freeze({nav:{logoTeal:`${E}logo-carlynk-teal.webp`,logoPutih:`${E}logo-carlynk-putih.webp`,daftar:"Daftar",masuk:"Masuk"},hero:{judul:"Bikin Showroom Digital Profesional *Dalam Hitungan Menit*",deskripsi:"Kelola katalog, jangkau pembeli nasional serta terima DP otomatis dalam satu platform terpadu.",gambar:`${E}hero-showroom-digital.webp`,alt:"Katalog mobil showroom tampil di layar ponsel",tombolUtama:"Buat Showroom Sekarang",tombolKedua:"Contoh Katalog"},masalah:{judul:"*Masih Mengandalkan* Jualan Mobil Hanya Lewat Media Sosial & Brosur?",subjudul:"Hambatan utama dalam meningkatkan omzet penjualan di era digital",latar:`${E}bg-showroom-teal.jpg`,slides:[[{teks:"Calon pembeli sering *bingung mencari stok* mobil yang masih ready karena *postingan tertimbun*.",gambar:`${E}masalah-bingung-cari-stok.webp`,alt:"Pembeli kebingungan mencari stok mobil"},{teks:"Harus *membalas chat satu per satu* untuk menanyakan spesifikasi, harga, atau kondisi unit.",gambar:`${E}masalah-balas-chat.webp`,alt:"Penjual membalas chat satu per satu"}]]},fitur:{judul:"Semua Fitur yang Dibutuhkan Showroom Mobil Anda Ada di Carlynk",slides:[[{ikon:`${E}ikon-katalog.webp`,judul:"Katalog Digital Interaktif & Real-Time",deskripsi:"Upload foto HD, detail spesifikasi, jarak tempuh (KM), status unit (Ready/Sold/Booked) dengan mudah."},{ikon:`${E}ikon-pembayaran.webp`,judul:"Sistem Pembayaran & DP Otomatis",deskripsi:"Terima pembayaran DP/Tanda Jadi secara aman menggunakan Payment Gateway."}]]},kenapa:{judul:"Kenapa Harus Carlynk?",gambar:`${E}kenapa-carlynk-orang.webp`,alt:"Pemilik showroom menunjukkan halaman Carlynk di ponsel",poin:[{judul:"Tanpa Perlu Coding / Keahlian IT",deskripsi:"Siapa pun bisa mengoperasikannya, upload unit semudah bikin status di media sosial."},{judul:"Website Mobile-Friendly",deskripsi:"Didesain khusus agar nyaman dibuka di HP pembeli dengan koneksi apa saja."},{judul:"Transaksi Transparan",deskripsi:"Meningkatkan kepercayaan (trust rate) pembeli luar kota untuk bertransaksi."}]},testimoni:{judul:"Review Jujur Pengguna Carlynk",bintang:5,slides:[[{kutipan:"Dulu sering kehilangan pembeli luar kota karena ragu mau DP. Sekarang pakai Carlynk, showroom kelihatan jauh lebih profesional dan closing DP jadi lebih cepat.",nama:"Randy Utama",jabatan:"Owner AutoMobil, Jakarta",foto:`${E}testimoni-randy-utama.jpg`},{kutipan:"Manajemen stok jadi rapi banget. Pembeli tinggal saya kasih link website, langsung bisa pilih unit, cek harga, dan langsung WhatsApp unit yang ditaksir.",nama:"Ridwan Widada",jabatan:"Owner GibranAuto, Solo",foto:`${E}testimoni-ridwan-widada.jpg`}]]},partner:{label:"Our Partner",latar:`${E}bg-partner.jpg`,logo:[{nama:"KT88 Cars",gambar:`${E}partner-kt88cars.webp`},{nama:"Garasi.id",gambar:`${E}partner-garasi-id.webp`},{nama:"Kacunk Motor",gambar:""}]},penutup:{judul:"Siap Bikin Showroom Mobil Anda *Naik Kelas* dan *Jual Lebih Banyak* Unit?",deskripsi:"Bergabunglah dengan puluhan showroom digital lainnya di seluruh Indonesia sekarang.",tombolUtama:"Buat Showroom Sekarang",tombolKedua:"Chat Konsultasi"},footer:{latar:`${E}bg-footer.jpg`,kolom:[[{label:"Tentang Carlynk",kunci:"tentang"},{label:"Fitur",kunci:"fitur"},{label:"Harga",kunci:"harga"}],[{label:"Demo Showroom",kunci:"demo"},{label:"Syarat & Ketentuan",kunci:"syarat"},{label:"Kebijakan Privasi",kunci:"privasi"}]],sosial:[{label:"Facebook",ikon:"facebook",kunci:"facebook"},{label:"Instagram",ikon:"instagram",kunci:"instagram"},{label:"WhatsApp",ikon:"whatsapp",kunci:"konsultasi"}],hakCipta:"Copyright \xA9 2026 Carlynk"}});function qa(e="",a=""){let t=e||"#";return Object.freeze({daftar:"#/daftar-showroom",masuk:a||"#/login/seller",demo:"#/contoh-katalog",konsultasi:t,tentang:t,fitur:"#fitur",harga:t,syarat:t,privasi:t,facebook:t,instagram:t})}function Wa({rute:e}){return[Dn(e),Fn(e),Hn(),Un(),qn(),Jn(),Vn(),Yn(e),Xn(e)].join("")}function Dn({daftar:e,masuk:a}){let{logoTeal:t}=N.nav;return`
<header class="ck-nav" data-nav style="--ck-latar:url('${N.masalah.latar}')">
  ${On()}
  <div class="ck-lajur ck-nav__isi">
    <a href="#/" aria-label="Carlynk">
      <img class="ck-nav__logo" src="${t}" alt="Carlynk" width="1930" height="365">
    </a>
    <div class="ck-nav__aksi">
      <a class="ck-tombol ck-tombol--emas" href="${e}">${f(N.nav.daftar)}</a>
      <a class="ck-tombol ck-tombol--putih" href="${a}">${f(N.nav.masuk)}</a>
    </div>
  </div>
</header>`}function On(){return`
<div class="ck-nav__putih" aria-hidden="true"></div>
<svg class="ck-nav__lengkung" viewBox="0 0 308 318" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path d="M0 0 C12 110 85 315 308 318 H0 Z" fill="#ffffff"/>
</svg>`}function Fn({daftar:e,demo:a}){let t=N.hero;return`
<section class="ck-hero">
  <div class="ck-lajur ck-hero__kisi">
    <div class="ck-hero__teks">
      <h1 data-reveal>${me(t.judul)}</h1>
      <p class="ck-hero__deskripsi" data-reveal>${f(t.deskripsi)}</p>
      <div class="ck-hero__aksi" data-reveal>
        <a class="ck-tombol ck-tombol--emas" href="${e}">${f(t.tombolUtama)}</a>
        <a class="ck-tombol ck-tombol--abu" href="${a}">${f(t.tombolKedua)}</a>
      </div>
    </div>
    <img class="ck-hero__gambar" src="${t.gambar}" alt="${f(t.alt)}" width="894" height="745" fetchpriority="high">
  </div>
</section>`}function Hn(){let e=N.masalah,a=e.slides.map(t=>t.map(Kn).join("")).join("|");return`
<section class="ck-masalah" style="--ck-latar:url('${e.latar}')">
  <div class="ck-lajur">
    <h2 data-reveal>${me(e.judul)}</h2>
    <p class="ck-masalah__subjudul" data-reveal>${f(e.subjudul)}</p>
    ${Fe({nama:"masalah",slides:a,gelap:!0})}
  </div>
</section>`}function Kn(e){return`
<article class="ck-masalah__kartu" data-reveal>
  <p>${ar(e.teks)}</p>
  <img class="ck-masalah__foto" src="${e.gambar}" alt="${f(e.alt)}" loading="lazy">
</article>`}function Un(){let e=N.fitur,a=e.slides.map(t=>t.map(Gn).join("")).join("|");return`
<section class="ck-fitur" id="fitur">
  <div class="ck-lajur">
    <h2 data-reveal>${me(e.judul)}</h2>
    ${Fe({nama:"fitur",slides:a,satuLajur:!0})}
  </div>
</section>`}function Gn(e){return`
<article class="ck-fitur__kartu" data-reveal>
  <img class="ck-fitur__ikon" src="${e.ikon}" alt="" aria-hidden="true" loading="lazy" width="604" height="604">
  <div>
    <h3>${f(e.judul)}</h3>
    <p>${f(e.deskripsi)}</p>
  </div>
</article>`}function qn(){let e=N.kenapa;return`
<section class="ck-kenapa">
  <div class="ck-kenapa__hias" aria-hidden="true">
    <div class="ck-kenapa__busur"></div>
    <div class="ck-kenapa__kotak"></div>
  </div>
  <div class="ck-lajur ck-kenapa__kisi">
    <div class="ck-kenapa__kiri">
      <h2 data-reveal>${f(e.judul)}</h2>
      <img class="ck-kenapa__foto" src="${e.gambar}" alt="${f(e.alt)}" loading="lazy" width="1000" height="1568">
    </div>
    <ul class="ck-kenapa__poin">
      ${e.poin.map(a=>`
      <li data-reveal>
        <h3>${f(a.judul)}</h3>
        <p>${f(a.deskripsi)}</p>
      </li>`).join("")}
    </ul>
  </div>
</section>`}function Jn(){let e=N.testimoni,a=e.slides.map(t=>t.map(Wn).join("")).join("|");return`
<section class="ck-testimoni">
  ${er()}
  <div class="ck-lajur">
    <h2 data-reveal>${f(e.judul)}</h2>
    <div class="ck-testimoni__bintang" data-reveal aria-label="${e.bintang} dari 5">
      ${Array.from({length:e.bintang},Qn).join("")}
    </div>
    ${Fe({nama:"testimoni",slides:a,berpanah:!0})}
  </div>
</section>`}function Wn(e){return`
<figure class="ck-testimoni__kartu" data-reveal>
  <img class="ck-testimoni__foto" src="${e.foto}" alt="${f(e.nama)}" loading="lazy" width="310" height="310">
  <blockquote class="ck-testimoni__kutipan">&ldquo;${f(e.kutipan)}&rdquo;</blockquote>
  <figcaption>
    <div class="ck-testimoni__nama">${f(e.nama)}</div>
    <div class="ck-testimoni__jabatan">${f(e.jabatan)}</div>
  </figcaption>
</figure>`}function Vn(){let e=N.partner;return`
<section class="ck-partner" style="--ck-latar:url('${e.latar}')">
  <div class="ck-lajur">
    <div class="ck-partner__label">${f(e.label)}</div>
    <div class="ck-partner__daftar" data-reveal>
      ${e.logo.map(a=>a.gambar?`<img src="${a.gambar}" alt="${f(a.nama)}" loading="lazy">`:`<div class="ck-partner__teks">${f(a.nama).replace(" ","<br>")}</div>`).join("")}
    </div>
  </div>
</section>`}function Yn({daftar:e,konsultasi:a}){let t=N.penutup;return`
<section class="ck-penutup">
  <div class="ck-lajur">
    <h2 data-reveal>${me(t.judul)}</h2>
    <p data-reveal>${f(t.deskripsi)}</p>
    <div class="ck-penutup__aksi" data-reveal>
      <a class="ck-tombol ck-tombol--emas" href="${e}">${f(t.tombolUtama)}</a>
      <a class="ck-tombol ck-tombol--teal" href="${a}">${Va("whatsapp")}${f(t.tombolKedua)}</a>
    </div>
  </div>
</section>`}function Xn(e){let a=N.footer;return`
<footer class="ck-footer" style="--ck-latar:url('${a.latar}')">
  <div class="ck-lajur ck-footer__kisi">
    <div>
      <img class="ck-footer__logo" src="${N.nav.logoPutih}" alt="Carlynk" loading="lazy" width="1412" height="267">
    </div>
    ${a.kolom.map(t=>`
    <nav class="ck-footer__kolom">
      ${t.map(n=>`<a href="${e[n.kunci]??"#"}">${f(n.label)}</a>`).join("")}
    </nav>`).join("")}
    <div>
      <div class="ck-footer__sosial">
        ${a.sosial.map(t=>`
        <a href="${e[t.kunci]??"#"}" aria-label="${f(t.label)}" rel="noopener">${Va(t.ikon)}</a>`).join("")}
      </div>
      <div class="ck-footer__hak">${f(a.hakCipta)}</div>
    </div>
  </div>
</footer>`}function Fe({nama:e,slides:a,gelap:t=!1,berpanah:n=!1,satuLajur:r=!1}){let i=a.split("|").filter(Boolean),o=i.length>1,s=["ck-korsel",t?"ck-korsel--gelap":"",o&&n?"ck-korsel--berpanah":""].filter(Boolean).join(" "),l=r?' style="grid-template-columns:1fr"':"";return`
<div class="${s}" data-korsel="${e}">
  ${o&&n?Ja("kiri"):""}
  <div class="ck-korsel__bingkai">
    <div class="ck-korsel__rel" data-korsel-rel>
      ${i.map(d=>`<div class="ck-korsel__slide"${l}>${d}</div>`).join("")}
    </div>
  </div>
  ${o&&n?Ja("kanan"):""}
  ${o?Zn(i.length):""}
</div>`}function Zn(e){return`
<div class="ck-korsel__titik" role="tablist">
  ${Array.from({length:e},(a,t)=>`
  <button type="button" role="tab" data-korsel-titik="${t}"
          aria-label="Slide ${t+1}" aria-current="${t===0}"></button>`).join("")}
</div>`}function Ja(e){return`
<button type="button" class="ck-korsel__panah ck-korsel__panah--${e}"
        data-korsel-panah="${e}" aria-label="${e==="kiri"?"Sebelumnya":"Berikutnya"}">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="${e==="kiri"?"M10 3 L4 8 L10 13":"M6 3 L12 8 L6 13"}" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>`}function Qn(){return`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2 6 20.5l1.3-6.7-5-4.6 6.8-.8z"/>
</svg>`}function er(){let e="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2 6 20.5l1.3-6.7-5-4.6 6.8-.8z";return`
<div class="ck-testimoni__latar" aria-hidden="true">
  <svg viewBox="0 0 24 24" style="right:-6%;top:6%;width:min(34vw,420px)"><path d="${e}"/></svg>
  <svg viewBox="0 0 24 24" style="left:-8%;bottom:-6%;width:min(26vw,320px)"><path d="${e}"/></svg>
</div>`}function Va(e){return`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${{facebook:"M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8z",instagram:"M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23C21.8 8.4 21.8 8.8 21.8 12s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.07-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2m0 2.15c-3.14 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.6-.07 4.78s.01 3.54.07 4.78c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-4.78s-.01-3.54-.07-4.78c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.6-.07-4.74-.07m0 3.65a5.99 5.99 0 1 1 0 11.98 5.99 5.99 0 0 1 0-11.98m0 2.15a3.84 3.84 0 1 0 0 7.68 3.84 3.84 0 0 0 0-7.68m6.24-3.87a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8",whatsapp:"M12.04 2.2a9.7 9.7 0 0 0-8.3 14.7L2.2 22l5.25-1.37A9.7 9.7 0 1 0 12.04 2.2m0 1.77a7.93 7.93 0 1 1-4.03 14.76l-.29-.17-3.1.81.83-3.03-.19-.3A7.93 7.93 0 0 1 12.04 3.97m-3.6 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.76 2.8 4.32 3.8 2.13.84 2.56.67 3.02.63.46-.04 1.5-.61 1.71-1.2.21-.6.21-1.1.15-1.2-.06-.11-.23-.17-.48-.29-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.12-.17.25-.65.82-.8.99-.14.17-.29.19-.54.06-.25-.12-1.07-.39-2.04-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.29.38-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.36-.77-1.86-.2-.49-.4-.42-.55-.43z"}[e]??""}"/></svg>`}function me(e){return f(e).replace(/\*([^*]+)\*/g,(a,t)=>`<span class="ck-emas">${t}</span>`)}function ar(e){return f(e).replace(/\*([^*]+)\*/g,(a,t)=>`<b>${t}</b>`)}function f(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ya(e){let a=Array.from(e.querySelectorAll("[data-korsel]")).map(tr).filter(Boolean);return()=>a.splice(0).forEach(t=>t())}function tr(e){let a=e.querySelector("[data-korsel-rel]"),t=a?Array.from(a.children):[];if(!a||t.length<2)return null;let n=Array.from(e.querySelectorAll("[data-korsel-titik]")),r=Array.from(e.querySelectorAll("[data-korsel-panah]")),i=0,o=d=>{i=(d+t.length)%t.length,a.style.transform=`translateX(-${i*100}%)`,n.forEach((c,p)=>c.setAttribute("aria-current",String(p===i))),t.forEach((c,p)=>c.setAttribute("aria-hidden",String(p!==i)))},s=[];n.forEach((d,c)=>{let p=()=>o(c);d.addEventListener("click",p),s.push(()=>d.removeEventListener("click",p))}),r.forEach(d=>{let c=d.dataset.korselPanah==="kiri"?-1:1,p=()=>o(i+c);d.addEventListener("click",p),s.push(()=>d.removeEventListener("click",p))});let l=d=>{if(d.key==="ArrowLeft")o(i-1);else if(d.key==="ArrowRight")o(i+1);else return;d.preventDefault()};return e.addEventListener("keydown",l),s.push(()=>e.removeEventListener("keydown",l)),s.push(nr(e,{maju:()=>o(i+1),mundur:()=>o(i-1),posisi:()=>i,rel:a,jumlah:t.length})),o(0),()=>s.splice(0).forEach(d=>d())}function nr(e,{maju:a,mundur:t,posisi:n,rel:r,jumlah:i}){let o=0,s=0,l=!1,d=null,c=g=>{g.isPrimary&&(l=!0,d=null,o=g.clientX,s=g.clientY)},p=g=>{if(!l)return;let b=g.clientX-o,v=g.clientY-s;if(d===null){if(Math.abs(b)<5&&Math.abs(v)<5)return;d=Math.abs(b)>Math.abs(v),d&&(e.setPointerCapture?.(g.pointerId),r.style.transition="none")}if(!d)return;let x=n()===0&&b>0||n()===i-1&&b<0?b*.32:b;r.style.transform=`translateX(calc(-${n()*100}% + ${x}px))`},u=g=>{if(!l||(l=!1,r.style.transition="",!d))return;e.releasePointerCapture?.(g.pointerId);let b=g.clientX-o;b<=-48?a():b>=48?t():r.style.transform=`translateX(-${n()*100}%)`};return e.addEventListener("pointerdown",c),e.addEventListener("pointermove",p),e.addEventListener("pointerup",u),e.addEventListener("pointercancel",u),()=>{e.removeEventListener("pointerdown",c),e.removeEventListener("pointermove",p),e.removeEventListener("pointerup",u),e.removeEventListener("pointercancel",u)}}function Xa(e){let a=[rr(e),or(e),Ya(e),sr(e)];return()=>a.splice(0).forEach(t=>t?.())}function rr(e){let a=Array.from(e.querySelectorAll("[data-reveal]"));if(!a.length)return()=>{};if(typeof IntersectionObserver!="function")return a.forEach(n=>n.classList.add("ck-tampil")),()=>{};let t=new IntersectionObserver(n=>{n.forEach(r=>{r.isIntersecting&&(r.target.style.transitionDelay=`${Math.min(ir(r.target),4)*70}ms`,r.target.classList.add("ck-tampil"),t.unobserve(r.target))})},{threshold:.12,rootMargin:"0px 0px -8% 0px"});return a.forEach(n=>t.observe(n)),()=>t.disconnect()}function ir(e){return Array.from(e.parentElement?.children??[]).indexOf(e)}function or(e){let a=e.querySelector("[data-nav]");if(!a)return()=>{};let t=!1,n=()=>{t=!1,a.classList.toggle("ck-nav--kecil",window.scrollY>40)},r=()=>{t||(t=!0,requestAnimationFrame(n))};return n(),window.addEventListener("scroll",r,{passive:!0}),()=>window.removeEventListener("scroll",r)}function sr(e){let a=t=>{let r=t.target.closest?.('a[href^="#"]')?.getAttribute("href").slice(1);if(!r||r.startsWith("/"))return;let i=e.querySelector(`#${CSS.escape(r)}`);i&&(t.preventDefault(),i.scrollIntoView({behavior:"smooth",block:"start"}))};return e.addEventListener("click",a),()=>e.removeEventListener("click",a)}var G="carlynk-landing-active",Za="carlynk_landing_style",Qa="carlynk_landing_font",et="carlynk_landing_font_preconnect",lr="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap",dr=["https://fonts.googleapis.com","https://fonts.gstatic.com"],cr=`
#carlynk_landing_root{
  --ck-teal:#004950;
  --ck-teal-judul:#006069;
  --ck-teal-terang:#00707a;
  --ck-emas:#b09b77;
  --ck-emas-tombol:#bda67e;
  --ck-emas-band:#9a886a;
  --ck-langit-1:#f3fafc;
  --ck-langit-2:#eaf5f9;
  --ck-kartu:#fbfdfe;
  --ck-kartu-gelap:#002023;
  --ck-abu:#cccccc;
  --ck-tinta:#16211f;
  --ck-tinta-lembut:#4a5a58;
  --ck-garis:#d8e7ea;
  --ck-lajur:1160px;
  --ck-nav:104px;
  /* Tempat tepi lurus bidang putih berhenti dan bajinya mulai.

     Dihitung mundur dari tepi kanan lajur isi, bukan sebagai persentase lebar
     layar: yang harus tetap adalah jarak lengkung ke tombol Daftar, dan tombol
     itu menempel di kanan lajur. Kalau dipatok dari kiri, jaraknya menyempit
     sendiri begitu layar melebar.

     --ck-nav-kanan menampung padding lajur, lebar dua tombol, dan jarak
     lengkung ke tombol. Lebar bajinya sendiri lahir dari tinggi navbar
     (86,5% tinggi pita putih, dikali perbandingan 308/318). */
  --ck-nav-kanan:294px;
  --ck-nav-belok:calc(
    min(100%,calc(50% + var(--ck-lajur) / 2)) - var(--ck-nav-kanan) - var(--ck-nav) * .837
  );

  color:var(--ck-tinta);
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:var(--ck-langit-1);
}
#carlynk_landing_root,#carlynk_landing_root *{box-sizing:border-box}
#carlynk_landing_root img{max-width:100%;display:block}
#carlynk_landing_root a{text-decoration:none;color:inherit}
#carlynk_landing_root ::selection{background:var(--ck-teal-judul);color:#fff}
html.${G}{scroll-behavior:smooth}
body.${G}{background:#f3fafc;overflow-x:clip}

#carlynk_landing_root .ck-lajur{max-width:var(--ck-lajur);margin:0 auto;padding:0 24px}
#carlynk_landing_root .ck-emas{color:var(--ck-emas)}

/* --- Tipografi -------------------------------------------------------
   Ukuran memakai clamp karena desainnya berproporsi A4: kalau judulnya
   diskalakan lurus terhadap lebar, di layar lebar jadi raksasa dan di HP
   jadi tidak terbaca. */
#carlynk_landing_root h1,#carlynk_landing_root h2,#carlynk_landing_root h3{
  margin:0;font-weight:800;letter-spacing:-.02em;line-height:1.14;color:var(--ck-teal-judul);
}
#carlynk_landing_root h1{font-size:clamp(32px,4.2vw,56px)}
#carlynk_landing_root h2{font-size:clamp(26px,3.6vw,44px)}
#carlynk_landing_root h3{font-size:clamp(19px,1.8vw,26px);font-weight:700;line-height:1.25}
#carlynk_landing_root p{margin:0;line-height:1.62}

/* --- Tombol ---------------------------------------------------------- */
#carlynk_landing_root .ck-tombol{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  font-weight:700;font-size:15.5px;line-height:1;
  padding:16px 26px;border-radius:8px;border:1px solid transparent;
  transition:transform .14s ease,box-shadow .28s ease,background .22s ease,color .22s ease;
  cursor:pointer;white-space:nowrap;
}
#carlynk_landing_root .ck-tombol:active{transform:translateY(1px)}
#carlynk_landing_root .ck-tombol--emas{background:var(--ck-emas-tombol);color:#fff;box-shadow:0 10px 26px rgba(176,155,119,.34)}
#carlynk_landing_root .ck-tombol--emas:hover{background:#c9b28a;box-shadow:0 16px 36px rgba(176,155,119,.46)}
#carlynk_landing_root .ck-tombol--abu{background:var(--ck-abu);color:#5c5c5c}
#carlynk_landing_root .ck-tombol--abu:hover{background:#dcdcdc;color:#3f3f3f}
#carlynk_landing_root .ck-tombol--teal{background:var(--ck-teal);color:#fff;box-shadow:0 10px 26px rgba(0,73,80,.3)}
#carlynk_landing_root .ck-tombol--teal:hover{background:var(--ck-teal-terang);box-shadow:0 16px 36px rgba(0,73,80,.42)}
#carlynk_landing_root .ck-tombol--putih{background:#fff;color:var(--ck-teal-judul)}
#carlynk_landing_root .ck-tombol--putih:hover{background:#eaf5f9}

/* --- Navbar ----------------------------------------------------------
   Pita teal memakai foto showroom yang sudah ditint, dan bidang putihnya
   adalah satu SVG selebar header dengan preserveAspectRatio="none" supaya
   lengkungnya ikut melar mengikuti lebar layar. Dicoba dengan border-radius
   lebih dulu, tapi tepi kanannya bukan busur tunggal. */
#carlynk_landing_root .ck-nav{
  position:sticky;top:0;z-index:70;height:var(--ck-nav);
  background:var(--ck-latar,none) var(--ck-teal) center/cover no-repeat;
  transition:height .28s ease;
}
/* Kotak putih dan bajinya.

   Lebar kotak diukur dari tepi kanan lajur isi, bukan tepi layar: tombol
   Daftar/Masuk berhenti di situ juga, jadi keduanya tidak saling kejar
   berapa pun lebar layarnya -- tanpa itu putihnya terus melar dan menelan
   tombol di 1920 px ke atas.

   Baji lengkungnya tidak ikut melar. Tingginya mengikuti navbar, lebarnya
   lahir dari aspect-ratio, jadi perbandingan aslinya terjaga. Itu pokok
   soalnya: dulu baji dan kotak jadi satu SVG yang dibentangkan, dan
   lengkungnya terbaca melar. */
#carlynk_landing_root .ck-nav__putih,
#carlynk_landing_root .ck-nav__lengkung{
  position:absolute;top:13.5%;bottom:0;pointer-events:none;
}
#carlynk_landing_root .ck-nav__putih{
  left:0;width:var(--ck-nav-belok);background:#fff;
}
/* Tingginya dipatok, lebarnya dibiarkan lahir dari aspect-ratio. Dipasang
   dengan top+bottom sekaligus, peramban justru menghitung lebarnya dulu
   (mengisi sampai tepi kanan) lalu tingginya ikut aspect-ratio -- bajinya
   membengkak jadi 731 px. */
#carlynk_landing_root .ck-nav__lengkung{
  left:var(--ck-nav-belok);bottom:auto;
  height:86.5%;width:auto;aspect-ratio:308 / 318;
}
#carlynk_landing_root .ck-nav__isi{
  position:relative;height:100%;display:flex;align-items:center;justify-content:space-between;gap:24px;
}
#carlynk_landing_root .ck-nav__logo{height:clamp(30px,3.4vw,50px);width:auto}
#carlynk_landing_root .ck-nav__aksi{display:flex;align-items:center;gap:12px}
#carlynk_landing_root .ck-nav .ck-tombol{padding:13px 30px;font-size:15px}
#carlynk_landing_root .ck-nav--kecil{--ck-nav:74px}

/* --- Hero ------------------------------------------------------------ */
#carlynk_landing_root .ck-hero{
  background:linear-gradient(118deg,var(--ck-langit-1) 0%,var(--ck-langit-2) 55%,#e4f2f7 100%);
  padding:clamp(40px,5vw,72px) 0 clamp(48px,6vw,88px);
}
#carlynk_landing_root .ck-hero__kisi{
  display:grid;grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);
  gap:clamp(24px,4vw,56px);align-items:center;
}
#carlynk_landing_root .ck-hero__teks{display:grid;gap:22px;justify-items:start}
#carlynk_landing_root .ck-hero__deskripsi{font-size:clamp(15px,1.25vw,18px);color:var(--ck-tinta);max-width:30em}
#carlynk_landing_root .ck-hero__aksi{display:flex;flex-wrap:wrap;gap:14px}
#carlynk_landing_root .ck-hero__gambar{width:100%;height:auto;filter:drop-shadow(0 30px 60px rgba(0,73,80,.16))}

/* --- Bagian masalah --------------------------------------------------- */
#carlynk_landing_root .ck-masalah{
  position:relative;background:var(--ck-latar,none) var(--ck-teal) center/cover no-repeat;
  padding:clamp(52px,6vw,86px) 0 clamp(44px,5vw,72px);color:#fff;
}
#carlynk_landing_root .ck-masalah h2{color:#fff;text-align:center;max-width:18em;margin:0 auto}
#carlynk_landing_root .ck-masalah__subjudul{
  text-align:center;margin-top:16px;font-weight:700;font-size:clamp(14px,1.2vw,17px);color:rgba(255,255,255,.9);
}
#carlynk_landing_root .ck-masalah__kartu{
  position:relative;overflow:hidden;border-radius:18px;background:var(--ck-kartu-gelap);
  min-height:250px;display:flex;align-items:flex-start;
}
#carlynk_landing_root .ck-masalah__kartu p{
  position:relative;z-index:2;padding:30px 30px 30px;max-width:62%;
  font-size:clamp(15.5px,1.6vw,19px);color:rgba(255,255,255,.92);
}
#carlynk_landing_root .ck-masalah__kartu p b{color:#fff;font-weight:700}
#carlynk_landing_root .ck-masalah__foto{
  position:absolute;right:0;bottom:0;height:100%;width:auto;max-width:none;
  object-fit:contain;object-position:bottom right;z-index:1;
}

/* --- Bagian fitur ----------------------------------------------------- */
#carlynk_landing_root .ck-fitur{
  background:linear-gradient(180deg,var(--ck-langit-2),var(--ck-langit-1));
  padding:clamp(52px,6vw,88px) 0 clamp(40px,5vw,64px);
}
#carlynk_landing_root .ck-fitur h2{text-align:center;max-width:20em;margin:0 auto}
#carlynk_landing_root .ck-fitur__kartu{
  display:flex;gap:22px;align-items:flex-start;
  background:var(--ck-kartu);border:1px solid rgba(176,155,119,.45);border-radius:16px;
  padding:22px 26px;box-shadow:0 12px 30px rgba(0,73,80,.05);
}
#carlynk_landing_root .ck-fitur__ikon{width:clamp(56px,5vw,76px);height:auto;flex:none}
#carlynk_landing_root .ck-fitur__kartu p{margin-top:6px;font-size:clamp(14.5px,1.15vw,17px);color:var(--ck-tinta)}

/* --- Kenapa Carlynk ----------------------------------------------------
   Blob dan kotak teal di sisi kiri digambar di sini, bukan diambil dari
   desain: di PDF bentuk-bentuk itu menempel jadi satu bitmap dengan orangnya. */
#carlynk_landing_root .ck-kenapa{position:relative;overflow:hidden;background:var(--ck-langit-1);padding:clamp(40px,5vw,64px) 0 0}
#carlynk_landing_root .ck-kenapa__kisi{
  position:relative;z-index:2;display:grid;
  grid-template-columns:minmax(0,.46fr) minmax(0,.54fr);
  gap:clamp(20px,3vw,44px);align-items:end;
}
/* Judulnya duduk di pojok kiri-atas lajur dan orangnya di sebelah kanannya,
   persis seperti desain. Ditumpuk lewat position:absolute, bukan didorong
   dengan margin, supaya tinggi lajur tetap ditentukan fotonya saja. */
#carlynk_landing_root .ck-kenapa__kiri{position:relative}
#carlynk_landing_root .ck-kenapa__kiri h2{position:absolute;top:0;left:0;z-index:2;max-width:5.4em}
#carlynk_landing_root .ck-kenapa__foto{width:100%;height:auto;display:block}
#carlynk_landing_root .ck-kenapa__poin{display:grid;gap:16px;padding-bottom:clamp(28px,4vw,56px)}
#carlynk_landing_root .ck-kenapa__poin li{
  list-style:none;background:var(--ck-kartu);border:1px solid var(--ck-garis);
  border-radius:14px;padding:18px 22px;box-shadow:0 10px 26px rgba(0,73,80,.04);
}
#carlynk_landing_root .ck-kenapa__poin p{margin-top:5px;font-size:clamp(14px,1.1vw,16.5px);color:var(--ck-tinta)}
#carlynk_landing_root .ck-kenapa__hias{position:absolute;left:0;bottom:0;z-index:1;pointer-events:none}
#carlynk_landing_root .ck-kenapa__busur{
  width:clamp(220px,26vw,420px);aspect-ratio:1;border-radius:50%;
  border:clamp(30px,3.4vw,54px) solid var(--ck-teal);
  transform:translate(-42%,34%);
}
#carlynk_landing_root .ck-kenapa__kotak{
  position:absolute;left:clamp(96px,11vw,176px);bottom:0;
  width:clamp(52px,6vw,96px);aspect-ratio:1;background:var(--ck-teal);
}

/* --- Testimoni -------------------------------------------------------- */
#carlynk_landing_root .ck-testimoni{position:relative;overflow:hidden;background:var(--ck-langit-1);padding:clamp(48px,6vw,80px) 0}
#carlynk_landing_root .ck-testimoni h2{text-align:center}
#carlynk_landing_root .ck-testimoni__bintang{display:flex;justify-content:center;gap:6px;margin-top:14px}
#carlynk_landing_root .ck-testimoni__bintang svg{width:clamp(20px,2vw,28px);height:auto;fill:var(--ck-emas)}
#carlynk_landing_root .ck-testimoni__latar{position:absolute;inset:0;z-index:0;pointer-events:none}
#carlynk_landing_root .ck-testimoni__latar svg{position:absolute;fill:var(--ck-emas);opacity:.22}
#carlynk_landing_root .ck-testimoni__kartu{
  position:relative;background:var(--ck-kartu);border:1px solid rgba(176,155,119,.4);
  border-radius:14px;padding:70px 26px 28px;text-align:center;
  box-shadow:0 14px 34px rgba(0,73,80,.05);margin-top:56px;
}
#carlynk_landing_root .ck-testimoni__foto{
  position:absolute;top:-56px;left:50%;transform:translateX(-50%);
  width:112px;height:112px;border-radius:50%;object-fit:cover;
  border:5px solid #fff;box-shadow:0 10px 24px rgba(0,73,80,.16);
}
#carlynk_landing_root .ck-testimoni__kutipan{font-size:clamp(14.5px,1.15vw,17px);color:var(--ck-tinta)}
#carlynk_landing_root .ck-testimoni__nama{margin-top:14px;font-weight:700;color:var(--ck-tinta)}
#carlynk_landing_root .ck-testimoni__jabatan{color:var(--ck-tinta-lembut);font-size:15px}

/* --- Partner ---------------------------------------------------------- */
#carlynk_landing_root .ck-partner{
  background:var(--ck-latar,none) var(--ck-emas-band) center/cover no-repeat;
  padding:clamp(28px,3.4vw,44px) 0;text-align:center;
}
#carlynk_landing_root .ck-partner__label{
  color:#fff;font-weight:500;letter-spacing:.42em;text-transform:uppercase;
  font-size:clamp(12px,1.1vw,15px);
}
#carlynk_landing_root .ck-partner__daftar{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-around;
  gap:clamp(20px,4vw,56px);margin-top:clamp(18px,2.4vw,30px);
}
#carlynk_landing_root .ck-partner__daftar img{height:clamp(44px,6.4vw,92px);width:auto}
#carlynk_landing_root .ck-partner__teks{
  color:#fff;font-weight:800;font-size:clamp(20px,2.4vw,34px);line-height:1.05;
  letter-spacing:-.02em;text-transform:uppercase;
}

/* --- Penutup ---------------------------------------------------------- */
#carlynk_landing_root .ck-penutup{
  background:linear-gradient(180deg,var(--ck-langit-1),var(--ck-langit-2));
  padding:clamp(52px,6vw,86px) 0;text-align:center;
}
#carlynk_landing_root .ck-penutup h2{max-width:13em;margin:0 auto}
#carlynk_landing_root .ck-penutup p{margin:18px auto 0;max-width:34em;font-size:clamp(15px,1.2vw,17.5px)}
#carlynk_landing_root .ck-penutup__aksi{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:30px}

/* --- Footer ----------------------------------------------------------- */
#carlynk_landing_root .ck-footer{
  background:var(--ck-latar,none) var(--ck-teal) center/cover no-repeat;color:#fff;
  padding:clamp(34px,4vw,52px) 0;
}
#carlynk_landing_root .ck-footer__kisi{
  display:grid;grid-template-columns:minmax(0,1.3fr) repeat(2,minmax(0,1fr)) minmax(0,1.1fr);
  gap:clamp(20px,3vw,40px);align-items:start;
}
#carlynk_landing_root .ck-footer__logo{height:clamp(30px,2.6vw,42px);width:auto}
#carlynk_landing_root .ck-footer__kolom{display:grid;gap:10px;font-weight:700;font-size:15px}
#carlynk_landing_root .ck-footer__kolom a{opacity:.92;transition:opacity .2s ease}
#carlynk_landing_root .ck-footer__kolom a:hover{opacity:1;text-decoration:underline}
#carlynk_landing_root .ck-footer__sosial{display:flex;gap:12px}
#carlynk_landing_root .ck-footer__sosial a{
  width:34px;height:34px;border-radius:50%;background:#fff;color:var(--ck-teal);
  display:grid;place-items:center;transition:transform .2s ease;
}
#carlynk_landing_root .ck-footer__sosial a:hover{transform:translateY(-2px)}
#carlynk_landing_root .ck-footer__sosial svg{width:19px;height:19px;fill:currentColor}
#carlynk_landing_root .ck-footer__hak{margin-top:16px;font-size:14.5px;opacity:.88}

/* --- Korsel -----------------------------------------------------------
   Satu slide berisi sepasang kartu. Titik dan panah hanya dirender kalau
   slide-nya lebih dari satu, jadi selama konten slide kedua belum datang
   tampilannya persis seperti bagian statis biasa. */
#carlynk_landing_root .ck-korsel{margin-top:clamp(24px,3vw,40px)}
#carlynk_landing_root .ck-korsel__bingkai{overflow:hidden}
#carlynk_landing_root .ck-korsel__rel{
  display:flex;transition:transform .5s cubic-bezier(.22,.9,.28,1);will-change:transform;
}
#carlynk_landing_root .ck-korsel__slide{
  flex:0 0 100%;min-width:100%;
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,2vw,28px);
  align-items:stretch;
}
#carlynk_landing_root .ck-korsel__titik{display:flex;justify-content:center;gap:9px;margin-top:26px}
#carlynk_landing_root .ck-korsel__titik button{
  width:9px;height:9px;padding:0;border:0;border-radius:50%;cursor:pointer;
  background:rgba(0,73,80,.24);transition:background .22s ease,transform .22s ease;
}
#carlynk_landing_root .ck-korsel__titik button[aria-current="true"]{background:var(--ck-teal);transform:scale(1.25)}
#carlynk_landing_root .ck-korsel--gelap .ck-korsel__titik button{background:rgba(255,255,255,.34)}
#carlynk_landing_root .ck-korsel--gelap .ck-korsel__titik button[aria-current="true"]{background:#fff}
#carlynk_landing_root .ck-korsel__panah{
  position:absolute;top:50%;transform:translateY(-50%);z-index:3;
  width:42px;height:42px;border-radius:50%;border:0;cursor:pointer;
  background:rgba(255,255,255,.9);color:var(--ck-teal);
  display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,73,80,.14);
  transition:background .2s ease,transform .2s ease;
}
#carlynk_landing_root .ck-korsel__panah:hover{background:#fff;transform:translateY(-50%) scale(1.06)}
#carlynk_landing_root .ck-korsel__panah--kiri{left:-8px}
#carlynk_landing_root .ck-korsel__panah--kanan{right:-8px}
#carlynk_landing_root .ck-korsel__panah svg{width:17px;height:17px;fill:currentColor}
#carlynk_landing_root .ck-korsel--berpanah{position:relative}

/* --- Animasi masuk ---------------------------------------------------- */
#carlynk_landing_root [data-reveal]{opacity:0;transform:translateY(24px)}
#carlynk_landing_root [data-reveal].ck-tampil{
  opacity:1;transform:none;
  transition:opacity .8s cubic-bezier(.22,.9,.28,1),transform .8s cubic-bezier(.22,.9,.28,1);
}

@media (prefers-reduced-motion:reduce){
  #carlynk_landing_root *,#carlynk_landing_root *::before,#carlynk_landing_root *::after{
    animation-duration:.01ms !important;transition-duration:.01ms !important;
  }
  #carlynk_landing_root [data-reveal]{opacity:1;transform:none}
}

@media (max-width:1024px){
  #carlynk_landing_root{--ck-nav:88px}
  #carlynk_landing_root .ck-nav--kecil{--ck-nav:70px}
  #carlynk_landing_root .ck-hero__kisi{grid-template-columns:1fr;gap:28px}
  #carlynk_landing_root .ck-hero__gambar{max-width:540px;margin:0 auto}
  #carlynk_landing_root .ck-kenapa__kisi{grid-template-columns:1fr;align-items:start}
  /* Di layar sempit tidak ada ruang kosong di samping orangnya, jadi judulnya
     kembali mengalir di atas foto. */
  #carlynk_landing_root .ck-kenapa__kiri{display:grid;gap:16px}
  #carlynk_landing_root .ck-kenapa__kiri h2{position:static;max-width:none}
  #carlynk_landing_root .ck-kenapa__foto{max-width:420px;margin:0 auto}
  #carlynk_landing_root .ck-kenapa__poin{padding-bottom:36px}
  #carlynk_landing_root .ck-footer__kisi{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}
}

/* Di bawah 355 px lengkungnya sudah tidak mungkin: menyeberang dari 56% ke
   67% lebar butuh 39 px, dan logo beserta dua tombol sudah menghabiskan
   seluruh baris. Daripada memaksakannya sampai saling tindih, pitanya dibuat
   putih polos. Tombol Masuk yang tadinya putih di atas teal diberi garis tepi
   supaya tetap terbaca. */
@media (max-width:355px){
  #carlynk_landing_root .ck-nav{background:#fff}
  #carlynk_landing_root .ck-nav__putih,
  #carlynk_landing_root .ck-nav__lengkung{display:none}
  #carlynk_landing_root .ck-nav__logo{height:22px}
  #carlynk_landing_root .ck-tombol--putih{border-color:var(--ck-teal-judul)}
}

@media (max-width:680px){
  #carlynk_landing_root{--ck-nav:72px}
  #carlynk_landing_root .ck-nav--kecil{--ck-nav:62px}
  /* Lengkungnya memakan 11% lebar untuk menyeberang dari 56% ke 67%. Di 390 px
     itu 43 px yang tidak boleh ditempati logo maupun tombol, dan ketiganya
     tidak muat. Jadi di sini bidang putihnya dipersempit, logonya dikecilkan,
     dan tombolnya dirapatkan -- ketiganya sekaligus. Menyempitkan yang putih
     saja membuat ekor logo jatuh di atas teal dan hilang, karena warnanya
     sama. */
  #carlynk_landing_root{--ck-nav-kanan:193px}
  #carlynk_landing_root .ck-nav__logo{height:clamp(25px,4.4vw,34px)}
  #carlynk_landing_root .ck-nav__aksi{gap:8px}
  #carlynk_landing_root .ck-lajur{padding:0 18px}
  #carlynk_landing_root .ck-nav .ck-tombol{padding:9px 14px;font-size:13px}
  #carlynk_landing_root .ck-korsel__slide{grid-template-columns:1fr;gap:16px}
  /* Kartunya menumpuk jadi satu lajur di sini, jadi lebarnya melar dan
     teksnya cukup dua-tiga baris. Tanpa tinggi minimum kartunya jadi pendek
     sekali dan fotonya -- yang tingginya mengikuti kartu -- terjepit di pojok.
     190 px cukup untuk orangnya tetap terbaca. */
  #carlynk_landing_root .ck-masalah__kartu{min-height:190px}
  #carlynk_landing_root .ck-masalah__kartu p{max-width:58%;padding:22px 20px}
  #carlynk_landing_root .ck-fitur__kartu{gap:16px;padding:18px}
  #carlynk_landing_root .ck-hero__aksi .ck-tombol{flex:1 1 auto}
  #carlynk_landing_root .ck-footer__kisi{grid-template-columns:1fr;text-align:left}
  #carlynk_landing_root .ck-korsel__panah{display:none}
}

/* Baji lengkungnya memakan 60 px yang tidak boleh ditempati apa pun. Di lebar
   ini logo dan dua tombol sudah menghabiskan barisnya, jadi keduanya
   dirapatkan lagi -- kalau tidak, logo jatuh di atas teal dan tombol Daftar
   tertindih lengkungnya. */
@media (max-width:420px){
  /* Di lebar ini menghitung mundur dari kanan membuat belok jatuh di kiri
     logo. Diambil sebagai rasio lebar saja, lalu logo dan tombol dirapatkan
     supaya tetap muat. */
  #carlynk_landing_root{--ck-nav-belok:calc(100% * .40)}
  #carlynk_landing_root .ck-nav__logo{height:22px}
  #carlynk_landing_root .ck-nav__aksi{gap:6px}
  #carlynk_landing_root .ck-nav .ck-tombol{padding:8px 11px;font-size:12.5px}
}
`;function at(){if(!document.getElementById(Za)){let e=document.createElement("style");e.id=Za,e.textContent=cr,document.head.append(e)}if(document.getElementById(et)||dr.forEach((e,a)=>{let t=document.createElement("link");a===0&&(t.id=et),t.rel="preconnect",t.href=e,t.crossOrigin="anonymous",document.head.append(t)}),!document.getElementById(Qa)){let e=document.createElement("link");e.id=Qa,e.rel="stylesheet",e.href=lr,document.head.append(e)}document.documentElement.classList.add(G),document.body.classList.add(G)}function tt(){document.documentElement.classList.remove(G),document.body.classList.remove(G)}function nt(){let e=null,a=null,t=null,n=null;return T({mount(){return e=document.createElement("div"),e.id="carlynk_landing_root",e.className="relative w-full",e.innerHTML=Wa({rute:qa(ur(),pr())}),at(),r(),e},bindEvents(){!e||a||(a=Xa(e))},unmount(){a?.(),a=null},dispose(){a?.(),a=null,tt(),i(),e=null}});function r(){t=document.querySelector("#app header"),t&&(n=t.style.display,t.style.display="none")}function i(){t&&(t.style.display=n??"",t=null,n=null)}}function pr(){let e=qe("seller");return e&&e!==Je()?`${window.location.protocol}//${e}/login/seller`:""}function ur(){let e=String(O.contact?.whatsapp??"").replace(/\D/g,"").replace(/^0/,"62");return e?`https://wa.me/${e}`:""}var I=Object.freeze({daftar:"/daftar-showroom",masuk:"/login/seller"});function it({namaMerek:e,tagline:a,tautanWhatsapp:t,alamatEtalase:n,logoUrl:r=""}){let i=q(e),o=rt(r,i,24,18),s=rt(r,i,22,17);return`
<div style="position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(70% 55% at 18% 8%,rgba(30,129,176,.10),transparent 62%),radial-gradient(60% 50% at 88% 22%,rgba(234,182,118,.12),transparent 60%),linear-gradient(180deg,#ffffff,#fdfdfc 55%,#fbfaf8)"></div>

<div style="position:relative;z-index:2">

<div style="position:sticky;top:0;z-index:60;backdrop-filter:blur(18px);background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.5));border-bottom:1px solid rgba(28,25,23,.06)">
  <div style="max-width:1180px;margin:0 auto;padding:15px 24px;display:flex;align-items:center;gap:36px">
    <div style="display:flex;align-items:center;gap:11px">
      ${o}
    </div>
    <div data-navlinks="" style="display:flex;gap:26px;font-size:12px;margin-left:8px">
      <a href="#halaman" data-scroll="halaman" data-navlink="" style="color:#1c1917;transition:color .25s" style-hover="color:#1c1917">Halaman showroom</a>
      <a href="#listing" data-scroll="listing" data-navlink="" style="color:#1c1917;transition:color .25s" style-hover="color:#1c1917">Kelola listing</a>
      <a href="#marketing" data-scroll="marketing" data-navlink="" style="color:#1c1917;transition:color .25s" style-hover="color:#1c1917">Marketing</a>
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:14px">
      <a href="${I.masuk}" id="saas_landing_nav_login_button" style="font-size:12px;color:#1c1917;transition:color .25s" style-hover="color:#1c1917">Masuk</a>
      <a href="${I.daftar}" id="saas_landing_nav_register_button" data-magnet="" style="display:inline-flex;align-items:center;background:#1e81b0;color:#ffffff;font-weight:700;font-size:11.6px;padding:10px 18px;border-radius:999px;transition:box-shadow .3s,transform .12s linear" style-hover="box-shadow:0 10px 26px rgba(30,129,176,.4);color:#ffffff">Daftar</a>
    </div>
  </div>
  <div style="height:2px;background:rgba(28,25,23,.05)"><div data-progress="" style="height:100%;width:0%;background:linear-gradient(90deg,#1e81b0,#eab676);box-shadow:0 0 12px rgba(30,129,176,.7)"></div></div>
</div>

<div data-hero="" style="position:relative;min-height:100vh;display:flex;align-items:center;padding:80px 0 60px">
  <div style="position:relative;max-width:1180px;margin:0 auto;padding:0 24px;width:100%">
    <div data-reveal="" style="display:inline-flex;align-items:center;gap:11px;border:1px solid rgba(30,129,176,.22);background:rgba(30,129,176,.07);border-radius:999px;padding:7px 15px 7px 9px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.03em;color:#17698f;margin-bottom:28px">
      <span style="position:relative;display:inline-flex;width:7px;height:7px"><span style="position:absolute;inset:0;border-radius:50%;background:#1e81b0"></span><span style="position:absolute;inset:0;border-radius:50%;background:#1e81b0;animation:pulseRing 2s ease-out infinite"></span></span>
      PENDAFTARAN MITRA SHOWROOM DIBUKA
    </div>

    <h1 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(33.2px,6.4vw,73px);line-height:1.02;letter-spacing:-.04em;margin:0 0 26px;max-width:17ch;text-wrap:balance">
      <span data-word="">Setiap</span> <span data-word="">showroom</span> <span data-word="">berhak</span> <span data-word="">punya</span> <span data-word="" style="color:#1e81b0">etalase</span> <span data-word="" style="color:#1e81b0">digitalnya</span> <span data-word="" style="color:#1e81b0">sendiri.</span>
    </h1>

    <p data-reveal="" style="font-size:clamp(13.7px,1.4vw,16.6px);line-height:1.6;color:#1c1917;max-width:48ch;margin:0 0 38px;text-wrap:pretty">
      Platform jual beli mobil untuk showroom di seluruh Indonesia. Bergabung sebagai mitra, kelola stok unit Anda, dan jalankan pemasaran dari satu dashboard. Pendaftaran gratis.
    </p>

    <div data-reveal="" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">
      <a href="${I.daftar}" id="saas_landing_hero_register_button" data-magnet="" style="display:inline-flex;align-items:center;gap:10px;background:#1e81b0;color:#ffffff;font-weight:700;font-size:13.3px;padding:17px 30px;border-radius:999px;box-shadow:0 14px 44px rgba(30,129,176,.3);transition:box-shadow .3s,transform .12s linear" style-hover="box-shadow:0 22px 62px rgba(30,129,176,.5);color:#ffffff">Buat Showroom Anda <span style="font-size:14.1px;line-height:1">&rarr;</span></a>
      <a href="#halaman" data-scroll="halaman" id="saas_landing_hero_platform_button" style="display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(28,25,23,.18);color:#1c1917;font-weight:600;font-size:13.3px;padding:17px 28px;border-radius:999px;transition:border-color .3s,background .3s" style-hover="border-color:#1e81b0;background:rgba(30,129,176,.08);color:#1c1917">Lihat platformnya</a>
    </div>

    <div data-reveal="" data-heromono="" style="display:flex;flex-wrap:wrap;gap:26px;margin-top:42px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#1c1917;letter-spacing:.02em">
      <span>GRATIS UNTUK PAKET DASAR</span><span>TANPA KARTU KREDIT</span><span>VERIFIKASI 1x24 JAM</span>
    </div>
  </div>
  <div data-scrollhint="" style="position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:8.7px;letter-spacing:.16em;color:#1c1917">
    GULIR
    <span style="width:1px;height:38px;background:linear-gradient(180deg,#1e81b0,transparent)"></span>
  </div>
</div>

<div data-pita="" style="position:relative;border-top:1px solid rgba(28,25,23,.07);border-bottom:1px solid rgba(28,25,23,.07);overflow:hidden">
  <div style="position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(90deg,#fdfdfc,transparent 14%,transparent 86%,#fdfdfc)"></div>
  <div style="display:flex;width:max-content;animation:tick 38s linear infinite">
    <div style="display:flex;align-items:center;gap:40px;padding:18px 40px 18px 0;font-family:'JetBrains Mono',monospace;font-size:10.4px;color:#1c1917;white-space:nowrap"><span>HALAMAN SHOWROOM SENDIRI</span><span style="color:#1e81b0">/</span><span>KELOLA LISTING SENDIRI</span><span style="color:#1e81b0">/</span><span>MARKETING SENDIRI</span><span style="color:#1e81b0">/</span><span>DAFTAR GRATIS</span><span style="color:#1e81b0">/</span></div>
    <div style="display:flex;align-items:center;gap:40px;padding:18px 40px 18px 0;font-family:'JetBrains Mono',monospace;font-size:10.4px;color:#1c1917;white-space:nowrap"><span>HALAMAN SHOWROOM SENDIRI</span><span style="color:#1e81b0">/</span><span>KELOLA LISTING SENDIRI</span><span style="color:#1e81b0">/</span><span>MARKETING SENDIRI</span><span style="color:#1e81b0">/</span><span>DAFTAR GRATIS</span><span style="color:#1e81b0">/</span></div>
  </div>
</div>

<div id="saas_landing_halaman" data-bagian="" style="position:relative;padding:150px 0 60px">
  <div data-lajur="kiri">
   <div data-kolom="">
    <div data-panel="">
      <div data-reveal="" style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:#1e81b0;margin-bottom:20px">01 &mdash; HALAMAN SHOWROOM</div>
      <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:700;font-size:clamp(24.9px,3.8vw,41.5px);line-height:1.06;letter-spacing:-.035em;margin:0 0 20px;text-wrap:balance">Alamat resmi showroom Anda di internet.</h2>
      <p data-reveal="" style="color:#1c1917;font-size:14.1px;line-height:1.65;margin:0 0 30px;max-width:44ch;text-wrap:pretty">Setiap mitra memperoleh halaman publik sendiri dengan alamat khusus, identitas showroom, katalog unit, dan kanal kontak langsung ke tim penjualan Anda. Pembeli menghubungi Anda, bukan perantara.</p>
      <div data-reveal="" style="display:grid;gap:14px;max-width:46ch">
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Alamat khusus <span style="font-family:'JetBrains Mono',monospace;color:#17698f">${q(n)}</span></span></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Logo, foto lokasi, jam operasional, dan peta</span></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Tombol WhatsApp dan telepon langsung ke sales</span></div>
      </div>
    </div>

    <div data-reveal="" data-tilt="" style="position:relative;transition:transform .5s cubic-bezier(.22,.9,.28,1)">
      <div style="position:absolute;inset:-40px;background:radial-gradient(60% 60% at 50% 45%,rgba(30,129,176,.16),transparent 70%);filter:blur(20px);pointer-events:none"></div>
      <div style="position:relative;border:1px solid rgba(28,25,23,.12);border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 40px 90px rgba(28,25,23,.14)">
        <div style="display:flex;align-items:center;gap:9px;padding:11px 14px;background:#faf4ed;border-bottom:1px solid rgba(28,25,23,.07)">
          <span style="width:9px;height:9px;border-radius:50%;background:#d8c9b4"></span><span style="width:9px;height:9px;border-radius:50%;background:#d8c9b4"></span><span style="width:9px;height:9px;border-radius:50%;background:#d8c9b4"></span>
          <div style="margin-left:8px;flex:1;background:#f5ece1;border-radius:6px;padding:5px 11px;font-family:'JetBrains Mono',monospace;font-size:9.1px;color:#1c1917;display:flex"><span data-type="${q(n.replace("showroom-anda","auto-prima-motor"))}"></span><span style="width:6px;background:#1e81b0;margin-left:2px;animation:caret 1s step-end infinite"></span></div>
        </div>
        <div style="padding:20px">
          <div style="display:flex;align-items:center;gap:13px;margin-bottom:18px">
            <div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#1e81b0,#eab676)"></div>
            <div>
              <div style="font-family:Sora,sans-serif;font-weight:600;font-size:13.3px;letter-spacing:-.02em">Auto Prima Motor</div>
              <div style="font-size:10.4px;color:#1c1917">Jakarta Selatan &middot; Mitra terverifikasi</div>
            </div>
            <div style="margin-left:auto;background:rgba(30,129,176,.13);border:1px solid rgba(30,129,176,.3);color:#17698f;font-size:9.5px;font-weight:600;padding:6px 12px;border-radius:999px">Hubungi</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div data-pop="" style="border-radius:10px;overflow:hidden;border:1px solid rgba(28,25,23,.08);transition:transform .3s,border-color .3s" style-hover="transform:translateY(-4px);border-color:rgba(30,129,176,.45)">
              <div style="aspect-ratio:4/3;background:repeating-linear-gradient(135deg,#efe3d5 0 7px,#e2d5c3 7px 14px);display:flex;align-items:center;justify-content:center"><span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#1c1917">foto unit</span></div>
              <div style="padding:8px 9px"><div style="font-size:9.5px;color:#1c1917">Avanza 1.5 G</div><div style="font-size:9.5px;color:#1e81b0;font-weight:600">Rp 189 jt</div></div>
            </div>
            <div data-pop="" style="border-radius:10px;overflow:hidden;border:1px solid rgba(28,25,23,.08);transition:transform .3s,border-color .3s" style-hover="transform:translateY(-4px);border-color:rgba(30,129,176,.45)">
              <div style="aspect-ratio:4/3;background:repeating-linear-gradient(135deg,#efe3d5 0 7px,#e2d5c3 7px 14px);display:flex;align-items:center;justify-content:center"><span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#1c1917">foto unit</span></div>
              <div style="padding:8px 9px"><div style="font-size:9.5px;color:#1c1917">Fortuner VRZ</div><div style="font-size:9.5px;color:#1e81b0;font-weight:600">Rp 465 jt</div></div>
            </div>
            <div data-pop="" style="border-radius:10px;overflow:hidden;border:1px solid rgba(28,25,23,.08);transition:transform .3s,border-color .3s" style-hover="transform:translateY(-4px);border-color:rgba(30,129,176,.45)">
              <div style="aspect-ratio:4/3;background:repeating-linear-gradient(135deg,#efe3d5 0 7px,#e2d5c3 7px 14px);display:flex;align-items:center;justify-content:center"><span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#1c1917">foto unit</span></div>
              <div style="padding:8px 9px"><div style="font-size:9.5px;color:#1c1917">Brio RS</div><div style="font-size:9.5px;color:#1e81b0;font-weight:600">Rp 172 jt</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
   </div>
  </div>
</div>

<div id="saas_landing_listing" data-bagian="" style="position:relative;padding:120px 0 60px">
  <div data-lajur="kanan">
   <div data-kolom="">
    <div data-panel="">
      <div data-reveal="" style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:#1e81b0;margin-bottom:20px">02 &mdash; KELOLA LISTING</div>
      <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:700;font-size:clamp(24.9px,3.8vw,41.5px);line-height:1.06;letter-spacing:-.035em;margin:0 0 20px;text-wrap:balance">Stok mobil Anda, di bawah kendali Anda.</h2>
      <p data-reveal="" style="color:#1c1917;font-size:14.1px;line-height:1.65;margin:0 0 30px;max-width:44ch;text-wrap:pretty">Tambah unit, perbarui harga, atur status tayang, dan tandai terjual langsung dari dashboard. Perubahan tampil di halaman showroom Anda secara langsung, tanpa menunggu persetujuan.</p>
      <div data-reveal="" style="display:grid;gap:14px;max-width:46ch">
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Unggah foto massal dan salin data unit sejenis</span></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Akses tim: setiap sales punya login sendiri</span></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Riwayat perubahan harga per unit</span></div>
      </div>
    </div>

    <div data-reveal="" style="position:relative">
      <div style="position:absolute;inset:-40px;background:radial-gradient(60% 60% at 50% 50%,rgba(30,129,176,.13),transparent 70%);filter:blur(20px);pointer-events:none"></div>
      <div style="position:relative;border:1px solid rgba(28,25,23,.12);border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 40px 90px rgba(28,25,23,.14)">
        <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(28,25,23,.07)">
          <span style="font-family:Sora,sans-serif;font-weight:600;font-size:12px">Stok unit</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:9.1px;color:#1c1917;background:#f5ece1;padding:3px 8px;border-radius:5px">36 aktif</span>
          <span style="margin-left:auto;background:#1e81b0;color:#ffffff;font-size:9.5px;font-weight:700;padding:6px 12px;border-radius:7px">+ Tambah unit</span>
        </div>
        <div style="display:grid;grid-template-columns:1.7fr .8fr .8fr;gap:10px;padding:11px 18px;font-family:'JetBrains Mono',monospace;font-size:8.7px;letter-spacing:.06em;color:#1c1917;border-bottom:1px solid rgba(28,25,23,.05)"><span>UNIT</span><span>HARGA</span><span>STATUS</span></div>
        <div data-row="" style="display:grid;grid-template-columns:1.7fr .8fr .8fr;gap:10px;padding:13px 18px;align-items:center;border-bottom:1px solid rgba(28,25,23,.05);transition:background .25s" style-hover="background:rgba(30,129,176,.06)">
          <span style="font-size:11.2px;color:#1c1917">Toyota Avanza 1.5 G &middot; 2021</span><span style="font-size:10.8px;color:#1c1917">Rp 189 jt</span><span style="font-size:9.5px;color:#15803d;background:rgba(21,128,61,.12);padding:4px 9px;border-radius:5px;justify-self:start">Tayang</span>
        </div>
        <div data-row="" style="display:grid;grid-template-columns:1.7fr .8fr .8fr;gap:10px;padding:13px 18px;align-items:center;border-bottom:1px solid rgba(28,25,23,.05);transition:background .25s" style-hover="background:rgba(30,129,176,.06)">
          <span style="font-size:11.2px;color:#1c1917">Toyota Fortuner VRZ &middot; 2020</span><span style="font-size:10.8px;color:#1c1917">Rp 465 jt</span><span style="font-size:9.5px;color:#15803d;background:rgba(21,128,61,.12);padding:4px 9px;border-radius:5px;justify-self:start">Tayang</span>
        </div>
        <div data-row="" style="display:grid;grid-template-columns:1.7fr .8fr .8fr;gap:10px;padding:13px 18px;align-items:center;border-bottom:1px solid rgba(28,25,23,.05);transition:background .25s" style-hover="background:rgba(30,129,176,.06)">
          <span style="font-size:11.2px;color:#1c1917">Honda Brio RS &middot; 2022</span><span style="font-size:10.8px;color:#1c1917">Rp 172 jt</span><span data-status="" style="font-size:9.5px;color:#17698f;background:rgba(234,182,118,.12);padding:4px 9px;border-radius:5px;justify-self:start;transition:color .4s,background .4s">Draf</span>
        </div>
        <div data-row="" style="display:grid;grid-template-columns:1.7fr .8fr .8fr;gap:10px;padding:13px 18px;align-items:center;transition:background .25s" style-hover="background:rgba(30,129,176,.06)">
          <span style="font-size:11.2px;color:#1c1917">Mitsubishi Xpander Ultimate &middot; 2021</span><span style="font-size:10.8px;color:#1c1917">Rp 235 jt</span><span style="font-size:9.5px;color:#1c1917;background:rgba(28,25,23,.06);padding:4px 9px;border-radius:5px;justify-self:start">Terjual</span>
        </div>
      </div>
    </div>
   </div>
  </div>
</div>

<div id="saas_landing_marketing" data-bagian="" style="position:relative;padding:120px 0 60px">
  <div data-lajur="kiri">
   <div data-kolom="">
    <div data-panel="">
      <div data-reveal="" style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:#1e81b0;margin-bottom:20px">03 &mdash; PEMASARAN</div>
      <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:700;font-size:clamp(24.9px,3.8vw,41.5px);line-height:1.06;letter-spacing:-.035em;margin:0 0 20px;max-width:20ch;text-wrap:balance">Perangkat promosi yang dijalankan tim Anda sendiri.</h2>
      <p data-reveal="" style="color:#1c1917;font-size:14.1px;line-height:1.65;margin:0;max-width:52ch;text-wrap:pretty">Semua terhubung ke katalog unit yang sudah Anda kelola, sehingga tim penjualan dapat menjangkau pembeli tanpa menyewa agensi.</p>
    </div>

    <div style="display:grid;gap:18px">
      <div data-reveal="" data-tilt="" style="border:1px solid rgba(28,25,23,.1);border-radius:20px;padding:28px 26px 30px;background:#ffffff;transition:border-color .35s,transform .5s cubic-bezier(.22,.9,.28,1)" style-hover="border-color:rgba(30,129,176,.5)">
        <div style="display:flex;gap:6px;margin-bottom:22px">
          <div style="width:30px;height:38px;border-radius:5px;background:repeating-linear-gradient(135deg,#efe3d5 0 5px,#e2d5c3 5px 10px);border:1px solid rgba(30,129,176,.3)"></div>
          <div style="width:30px;height:38px;border-radius:5px;background:repeating-linear-gradient(135deg,#efe3d5 0 5px,#e2d5c3 5px 10px);border:1px solid rgba(28,25,23,.1)"></div>
          <div style="width:30px;height:38px;border-radius:5px;background:repeating-linear-gradient(135deg,#efe3d5 0 5px,#e2d5c3 5px 10px);border:1px solid rgba(28,25,23,.1)"></div>
        </div>
        <h3 style="font-family:Sora,sans-serif;font-size:15.8px;font-weight:600;margin:0 0 10px;letter-spacing:-.02em">Materi promosi otomatis</h3>
        <p style="color:#1c1917;font-size:12.5px;line-height:1.6;margin:0">Gambar iklan dan katalog PDF dibuat dari data unit Anda, siap dibagikan ke WhatsApp, Instagram, dan kanal lain.</p>
      </div>

      <div data-reveal="" data-tilt="" style="border:1px solid rgba(28,25,23,.1);border-radius:20px;padding:28px 26px 30px;background:#ffffff;transition:border-color .35s,transform .5s cubic-bezier(.22,.9,.28,1)" style-hover="border-color:rgba(30,129,176,.5)">
        <div data-leads="" style="display:grid;gap:6px;margin-bottom:22px;min-height:38px">
          <div data-lead="" style="display:flex;align-items:center;gap:8px;background:rgba(28,25,23,.04);border:1px solid rgba(28,25,23,.08);border-radius:8px;padding:6px 9px;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s"><span style="width:5px;height:5px;border-radius:50%;background:#1e81b0"></span><span style="font-size:9.5px;color:#1c1917">Budi &middot; Fortuner VRZ</span></div>
          <div data-lead="" style="display:flex;align-items:center;gap:8px;background:rgba(28,25,23,.04);border:1px solid rgba(28,25,23,.08);border-radius:8px;padding:6px 9px;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s"><span style="width:5px;height:5px;border-radius:50%;background:#1e81b0"></span><span style="font-size:9.5px;color:#1c1917">Sari &middot; Avanza 1.5 G</span></div>
        </div>
        <h3 style="font-family:Sora,sans-serif;font-size:15.8px;font-weight:600;margin:0 0 10px;letter-spacing:-.02em">Lead masuk ke satu kotak</h3>
        <p style="color:#1c1917;font-size:12.5px;line-height:1.6;margin:0">Setiap permintaan dari halaman showroom tercatat lengkap dengan unit yang diminati dan dapat ditugaskan ke sales tertentu.</p>
      </div>

      <div data-reveal="" data-tilt="" style="border:1px solid rgba(28,25,23,.1);border-radius:20px;padding:28px 26px 30px;background:#ffffff;transition:border-color .35s,transform .5s cubic-bezier(.22,.9,.28,1)" style-hover="border-color:rgba(30,129,176,.5)">
        <div style="display:flex;align-items:flex-end;gap:5px;height:38px;margin-bottom:22px">
          <span data-bar="" style="width:9px;height:38%;background:rgba(30,129,176,.3);border-radius:2px;transform-origin:bottom"></span>
          <span data-bar="" style="width:9px;height:58%;background:rgba(30,129,176,.45);border-radius:2px;transform-origin:bottom"></span>
          <span data-bar="" style="width:9px;height:74%;background:rgba(30,129,176,.65);border-radius:2px;transform-origin:bottom"></span>
          <span data-bar="" style="width:9px;height:100%;background:#1e81b0;border-radius:2px;transform-origin:bottom"></span>
        </div>
        <h3 style="font-family:Sora,sans-serif;font-size:15.8px;font-weight:600;margin:0 0 10px;letter-spacing:-.02em">Laporan performa</h3>
        <p style="color:#1c1917;font-size:12.5px;line-height:1.6;margin:0">Lihat unit mana yang paling banyak dilihat dan ditanyakan, lalu sesuaikan harga dan prioritas stok berdasarkan data.</p>
      </div>
    </div>
   </div>
  </div>
</div>

<div id="saas_landing_daftar" data-bagian="" style="position:relative;padding:150px 0 130px">
  <div data-lajur="kanan">
   <div data-kolom="">
    <div data-reveal="" data-panel="" style="position:relative;border:1px solid rgba(30,129,176,.25);border-radius:28px;overflow:hidden;background:linear-gradient(150deg,rgba(30,129,176,.22),rgba(255,255,255,.72) 55%,rgba(255,255,255,.78));padding:clamp(40px,6vw,72px) clamp(28px,5vw,56px)">
      <div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(70% 120% at 85% 20%,rgba(30,129,176,.22),transparent 60%)"></div>
      <div style="position:relative;max-width:36ch">
        <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(26.6px,4.6vw,48.1px);line-height:1.03;letter-spacing:-.04em;margin:0 0 20px;text-wrap:balance">Daftarkan showroom Anda hari ini. Gratis.</h2>
        <p style="color:#1c1917;font-size:14.5px;line-height:1.6;margin:0 0 34px;text-wrap:pretty">Siapa pun pemilik showroom dapat bergabung. Isi data showroom, tim kami memverifikasi dalam 1x24 jam, dan halaman Anda siap tayang.</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          <a href="${I.daftar}" id="saas_landing_bottom_register_button" data-magnet="" style="display:inline-flex;align-items:center;gap:10px;background:#1e81b0;color:#ffffff;font-weight:700;font-size:13.7px;padding:17px 30px;border-radius:999px;box-shadow:0 14px 44px rgba(30,129,176,.35);transition:box-shadow .3s,transform .12s linear" style-hover="box-shadow:0 22px 64px rgba(30,129,176,.5);color:#ffffff">Buat akun mitra <span style="font-size:14.1px;line-height:1">&rarr;</span></a>
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#1c1917">TANPA BIAYA PENDAFTARAN</span>
        </div>
      </div>
    </div>
   </div>
  </div>
</div>

<div data-kaki="" style="position:relative;border-top:1px solid rgba(28,25,23,.07)">
  <div style="max-width:1180px;margin:0 auto;padding:56px 24px 40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:40px">
    <div style="min-width:200px">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:14px">
        ${s}
      </div>
      <p style="color:#1c1917;font-size:11.6px;line-height:1.6;margin:0;max-width:30ch">${q(a)}</p>
    </div>
    <div style="display:grid;gap:11px;align-content:start">
      <span style="font-family:'JetBrains Mono',monospace;font-size:9.1px;letter-spacing:.12em;color:#1c1917">PLATFORM</span>
      <a href="#halaman" data-scroll="halaman" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Halaman showroom</a>
      <a href="#listing" data-scroll="listing" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Kelola listing</a>
      <a href="#marketing" data-scroll="marketing" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Perangkat pemasaran</a>
    </div>
    <div style="display:grid;gap:11px;align-content:start">
      <span style="font-family:'JetBrains Mono',monospace;font-size:9.1px;letter-spacing:.12em;color:#1c1917">MITRA</span>
      <a href="${I.daftar}" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Daftar gratis</a>
      <a href="${I.masuk}" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Masuk dashboard</a>
      <a href="#halaman" data-scroll="halaman" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Panduan mitra</a>
    </div>
    <div style="display:grid;gap:11px;align-content:start">
      <span style="font-family:'JetBrains Mono',monospace;font-size:9.1px;letter-spacing:.12em;color:#1c1917">KONTAK</span>
      <a href="${I.daftar}" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Formulir pendaftaran mitra</a>
      ${t?`<a href="${q(t)}" target="_blank" rel="noopener noreferrer" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">WhatsApp bisnis</a>`:`<a href="${I.masuk}" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Masuk ke dashboard</a>`}
    </div>
  </div>
  <div style="max-width:1180px;margin:0 auto;padding:0 24px 40px;border-top:1px solid rgba(28,25,23,.05)">
    <div style="padding-top:22px;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;font-size:10.8px;color:#1c1917">
      <span>&copy; ${new Date().getFullYear()} ${i}</span><span>Syarat layanan &middot; Kebijakan privasi</span>
    </div>
  </div>
</div>

</div>
`}function rt(e,a,t,n){let r=String(e||"").trim();return r!==""?`<img data-logo="" src="${q(r)}" alt="${a}" style="height:${t+8}px;width:auto;max-width:190px;object-fit:contain;display:block;transition:transform .5s cubic-bezier(.22,.9,.28,1)">`:`<div data-logo="" style="width:${t}px;height:${t}px;border-radius:7px;background:linear-gradient(135deg,#1e81b0,#eab676);box-shadow:0 0 20px rgba(30,129,176,.5);transition:transform .5s cubic-bezier(.22,.9,.28,1)"></div><span style="font-family:Sora,sans-serif;font-weight:700;font-size:${n}px;letter-spacing:-.03em">${a}</span>`}function q(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var mr=Object.freeze(["halaman","listing","marketing"]);function ot(e){let a=[],t=r=>Array.from(e.querySelectorAll(r)),n=r=>e.querySelector(r);return a.push(gr(t)),a.push(fr(t)),a.push(hr(t)),a.push(kr(t)),a.push(_r(n,t)),a.push(xr(t)),a.push(vr(e)),()=>a.splice(0).forEach(r=>r())}function gr(e){let a=[];return e("[data-word]").forEach((t,n)=>{t.style.display="inline-block",t.style.opacity="0",t.style.filter="blur(10px)",t.style.transform="translateY(28px) rotateX(-40deg)",t.style.transition="opacity .8s cubic-bezier(.22,.9,.28,1), transform .9s cubic-bezier(.22,.9,.28,1), filter .8s ease",t.style.transitionDelay=`${200+n*75}ms`,a.push(setTimeout(()=>{t.style.opacity="1",t.style.filter="none",t.style.transform="none"},60))}),()=>a.forEach(t=>clearTimeout(t))}function fr(e){let a=e("[data-reveal]"),t=[];if(!a.length)return()=>{};a.forEach((r,i)=>{r.style.opacity="0",r.style.transform="translateY(26px)",r.style.transition="opacity .9s cubic-bezier(.22,.9,.28,1), transform .9s cubic-bezier(.22,.9,.28,1)",r.style.transitionDelay=`${Math.min(i,4)*80}ms`});let n=new IntersectionObserver(r=>{r.forEach(i=>{if(!i.isIntersecting)return;let o=i.target;o.style.opacity="1",o.style.transform="none",o.querySelectorAll("[data-bar]").forEach((d,c)=>{d.style.animation=`barGrow .85s cubic-bezier(.22,.9,.28,1) ${c*110}ms both`}),o.querySelectorAll("[data-lead]").forEach((d,c)=>{t.push(setTimeout(()=>{d.style.opacity="1",d.style.transform="none"},300+c*420))}),o.querySelectorAll("[data-pop]").forEach((d,c)=>{d.style.opacity="0",d.style.transform="translateY(14px) scale(.96)",t.push(setTimeout(()=>{d.style.opacity="1",d.style.transform="none"},260+c*130))});let s=o.querySelector("[data-type]");s&&br(s,t);let l=o.querySelector("[data-status]");l&&t.push(setTimeout(()=>{l.textContent="Tayang",l.style.color="#15803d",l.style.background="rgba(21,128,61,.12)"},1600)),o.querySelectorAll("[data-row]").forEach((d,c)=>{d.style.opacity="0",d.style.transform="translateX(-14px)",d.style.transition=`opacity .5s ease ${c*90}ms, transform .5s cubic-bezier(.22,.9,.28,1) ${c*90}ms, background .25s`,requestAnimationFrame(()=>{d.style.opacity="1",d.style.transform="none"})}),n.unobserve(o)})},{threshold:.14,rootMargin:"0px 0px -6% 0px"});return a.forEach(r=>n.observe(r)),()=>{n.disconnect(),t.forEach(r=>clearTimeout(r))}}function br(e,a){let t=e.getAttribute("data-type")||"",n=0,r=()=>{e.textContent=t.slice(0,n++),n<=t.length&&a.push(setTimeout(r,42))};r()}function hr(e){let a=[];return e("[data-tilt]").forEach(t=>{let n=i=>{let o=t.getBoundingClientRect(),s=(i.clientX-o.left)/o.width-.5,l=(i.clientY-o.top)/o.height-.5;t.style.transform=`perspective(1000px) rotateY(${(s*6).toFixed(2)}deg) rotateX(${(-l*6).toFixed(2)}deg) translateY(-5px)`,t.style.transitionDuration=".12s"},r=()=>{t.style.transitionDuration=".5s",t.style.transform="none"};t.addEventListener("pointermove",n),t.addEventListener("pointerleave",r),a.push(()=>{t.removeEventListener("pointermove",n),t.removeEventListener("pointerleave",r)})}),()=>a.forEach(t=>t())}function kr(e){let a=[];return e("[data-magnet]").forEach(t=>{let n=i=>{let o=t.getBoundingClientRect(),s=(i.clientX-(o.left+o.width/2))*.22,l=(i.clientY-(o.top+o.height/2))*.3;t.style.transform=`translate(${s.toFixed(1)}px,${l.toFixed(1)}px)`},r=()=>{t.style.transform="none"};t.addEventListener("pointermove",n),t.addEventListener("pointerleave",r),a.push(()=>{t.removeEventListener("pointermove",n),t.removeEventListener("pointerleave",r)})}),()=>a.forEach(t=>t())}function xr(e){let a=[];return e("[style-hover]").forEach(t=>{let n=yr(t.getAttribute("style-hover"));if(!n.length)return;let r=null,i=()=>{r=n.map(([s])=>[s,t.style.getPropertyValue(s)]),n.forEach(([s,l])=>t.style.setProperty(s,l))},o=()=>{(r||[]).forEach(([s,l])=>{l?t.style.setProperty(s,l):t.style.removeProperty(s)}),r=null};t.addEventListener("pointerenter",i),t.addEventListener("pointerleave",o),a.push(()=>{t.removeEventListener("pointerenter",i),t.removeEventListener("pointerleave",o)})}),()=>a.forEach(t=>t())}function yr(e){return String(e||"").split(";").map(a=>a.trim()).filter(Boolean).map(a=>{let t=a.indexOf(":");return t===-1?null:[a.slice(0,t).trim(),a.slice(t+1).trim()]}).filter(Boolean)}function _r(e,a){let t=e("[data-progress]"),n=e("[data-scrollhint]"),r=a("[data-navlink]"),i=!1,o=()=>{i||(i=!0,requestAnimationFrame(()=>{i=!1;let s=window.scrollY,l=Math.max(document.body.scrollHeight-window.innerHeight,1),d=Math.min(s/l,1);t&&(t.style.width=`${(d*100).toFixed(2)}%`),n&&(n.style.opacity=s>120?"0":"1");let c=-1;mr.forEach((p,u)=>{let g=document.getElementById(`saas_landing_${p}`);g&&g.getBoundingClientRect().top<window.innerHeight*.45&&(c=u)}),r.forEach((p,u)=>{p.style.color=u===c?"#17698F":"rgba(28,25,23,.62)"})}))};return window.addEventListener("scroll",o,{passive:!0}),o(),()=>window.removeEventListener("scroll",o)}function vr(e){let a=t=>{let n=t.target.closest("[data-scroll]");!n||!e.contains(n)||(t.preventDefault(),wr(n.getAttribute("data-scroll")))};return e.addEventListener("click",a),()=>e.removeEventListener("click",a)}function wr(e){let a=document.getElementById(`saas_landing_${e}`);a&&a.scrollIntoView({behavior:document.hidden?"instant":"smooth",block:"start"})}var J="saas-landing-active",st="saas_landing_style",lt="saas_landing_font",dt="saas_landing_font_preconnect",Sr="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap",Er=["https://fonts.googleapis.com","https://fonts.gstatic.com"],Ar=`
#saas_landing_root, #saas_landing_root *{box-sizing:border-box}
html.${J}{scroll-behavior:smooth}
body.${J}{background:#fdfdfc;overflow-x:clip}
#saas_landing_root{color:#1c1917;font-family:"DM Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
#saas_landing_root a{color:#1e81b0;text-decoration:none}
#saas_landing_root a:hover{color:#17698f}
#saas_landing_root ::selection{background:#1e81b0;color:#ffffff}

/* --- Tata letak lajur -------------------------------------------------
   Semua bagian isi memakai model yang sama dengan showcase 01/02/03: satu
   lajur konten menempel di salah satu sisi, sisi lain dibiarkan kosong
   supaya mobil dan panorama tetap terlihat sepanjang halaman. Sisi lajur
   berselang-seling, dan kamera diarahkan ke sisi yang kosong. */
#saas_landing_root [data-lajur]{max-width:1180px;margin:0 auto;padding:0 24px;display:flex}
#saas_landing_root [data-lajur="kiri"]{justify-content:flex-start}
#saas_landing_root [data-lajur="kanan"]{justify-content:flex-end}
#saas_landing_root [data-kolom]{width:min(600px,100%);display:grid;gap:30px;align-content:start}

/* Panel teks. Latar bagian dibuat tembus pandang, jadi keterbacaan teks
   ditopang panel ini, bukan lagi blok #faf4ed penuh selebar layar. */
#saas_landing_root [data-panel]{
  background:rgba(255,255,255,.62);
  -webkit-backdrop-filter:blur(18px);
  backdrop-filter:blur(18px);
  border:1px solid rgba(28,25,23,.09);
  border-radius:24px;
  padding:34px 32px 36px;
  box-shadow:0 30px 80px rgba(28,25,23,.12);
}
#saas_landing_root [data-pita]{background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#saas_landing_root [data-kaki]{background:rgba(255,255,255,.78);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}

@keyframes pulseRing{0%{transform:scale(.9);opacity:.6}100%{transform:scale(2.2);opacity:0}}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes barGrow{from{transform:scaleY(.12)}to{transform:scaleY(1)}}
@keyframes caret{0%,100%{opacity:1}50%{opacity:0}}
@media (prefers-reduced-motion:reduce){#saas_landing_root *{animation-duration:.01ms !important;transition-duration:.01ms !important}}
@media (max-width:760px){
  #saas_landing_root [data-navlinks]{display:none !important}
  #saas_landing_root [data-scrollhint]{display:none !important}
  #saas_landing_root [data-hero]{min-height:88vh !important;padding:56px 0 40px !important}
  #saas_landing_root [data-heromono]{gap:10px 18px !important;font-size:9.1px !important;margin-top:30px !important}
  #saas_landing_halaman,#saas_landing_listing,#saas_landing_marketing{padding:72px 0 20px !important}
  #saas_landing_daftar{padding:80px 0 72px !important}
  /* Tidak ada sisi kosong yang berarti di layar sempit, jadi lajur memenuhi
     lebar penuh. */
  #saas_landing_root [data-lajur]{justify-content:center !important}
  #saas_landing_root [data-kolom]{width:100% !important}
  #saas_landing_root [data-panel]{padding:26px 22px 28px !important}
}
`;function ct(){if(!document.getElementById(st)){let e=document.createElement("style");e.id=st,e.textContent=Ar,document.head.append(e)}if(document.getElementById(dt)||Er.forEach((e,a)=>{let t=document.createElement("link");a===0&&(t.id=dt),t.rel="preconnect",t.href=e,t.crossOrigin="anonymous",document.head.append(t)}),!document.getElementById(lt)){let e=document.createElement("link");e.id=lt,e.rel="stylesheet",e.href=Sr,document.head.append(e)}document.documentElement.classList.add(J),document.body.classList.add(J)}function pt(){document.documentElement.classList.remove(J),document.body.classList.remove(J)}function ut(){let e=null,a=null,t=null,n=null;return T({mount(){return e=document.createElement("div"),e.id="saas_landing_root",e.className="relative w-full",e.style.background="#FDFDFC",e.innerHTML=it({namaMerek:O.appName,tagline:O.appTagline,tautanWhatsapp:Cr(),alamatEtalase:jr(),logoUrl:da(O.uploadedLogoUrl)}),ct(),r(),e},bindEvents(){!e||a||(a=ot(e))},unmount(){a?.(),a=null},dispose(){a?.(),a=null,pt(),i(),e=null}});function r(){t=document.querySelector("#app header"),t&&(n=t.style.display,t.style.display="none")}function i(){t&&(t.style.display=n??"",t=null,n=null)}}function Cr(){let e=String(O.contact?.whatsapp??"").replace(/\D/g,"").replace(/^0/,"62");return e?`https://wa.me/${e}`:""}var Nr="carlynk.id";function jr(){return`${Nr}/s/showroom-anda`}var mt="public.carlynk-landing",He=Object.freeze([{name:"public.carlynk-landing",label:"Landing Carlynk",path:"/carlynk-landing",description:"Halaman marketing Carlynk mengikuti berkas desain, menyasar pemilik showroom.",page:nt},{name:"public.saas-landing",label:"Landing SaaS Jual Beli Mobil",path:"/saas-landing",description:"Halaman marketing SaaS untuk showroom, marketing, dan buyer.",page:ut},{name:"public.catalog-alias",label:"Katalog Mobil Publik",path:"/public",description:"Halaman katalog mobil lama yang tetap tersedia di #/public.",page:$a},{name:"public.auth-landing",label:"Login / Register",path:"/auth",description:"Halaman autentikasi publik untuk buyer, showroom, admin, dan marketing.",page:Ga}]);function Vo(){return He.map(({name:e,label:a,path:t,description:n})=>({name:e,label:a,path:t,description:n}))}function Lr(e=""){return He.find(a=>a.name===e)??He.find(a=>a.name===mt)}function Yo(){let e=m.get("working.adminWebConfig.config.data",null),a=m.get("snapshot.admin.webConfig.data",null),t=Fa(),n=e?.landing_page_route_name??a?.landing_page_route_name??t?.landingPage?.routeName??t?.landing_page_route_name??"";return Lr(n)?.name??mt}export{Dr as a,oe as b,da as c,ti as d,ni as e,se as f,ua as g,ba as h,ka as i,h as j,ya as k,$a as l,Ga as m,nt as n,ut as o,Vo as p,Lr as q,Yo as r,kt as s,Wr as t};
