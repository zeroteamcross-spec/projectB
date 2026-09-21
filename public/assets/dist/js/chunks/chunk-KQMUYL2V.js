import{a as F}from"./chunk-537YCXQ5.js";import{b as ha,c as ea,d as xa,h as te,i as _a,j as ne}from"./chunk-F2Y4P5GQ.js";import{c as k,e as Qa}from"./chunk-WLLSWCTN.js";import{a as Ya,b as Xa,c as ya}from"./chunk-RIBAVQLX.js";import{c as Za,d as U}from"./chunk-HBZP3RES.js";import{b as ee,c as aa}from"./chunk-HVSYBKDQ.js";import{h as E,m as ae}from"./chunk-KLQ6JQV6.js";import{a as fa}from"./chunk-56F3ID4L.js";import{a as ka}from"./chunk-MUPM5M75.js";import{a as Va}from"./chunk-CN673TYE.js";import{a as Q,b as Ga,d as qa,e as Ja,f as Wa,g as m,j as z,m as O,n as ba,p as M,r as V,u as N,v as R}from"./chunk-3RZWHSJD.js";import{b as v}from"./chunk-WVHJATZP.js";var ta={get(a,e=null){return m.get(`snapshot.${a}`,e)},set(a,e,t={}){m.patchState(`snapshot.${a}`,{data:e,fetchedAt:Date.now(),ttl:t.ttl??300,version:t.version??a,stale:!1},"snapshot:set")},markStale(a){let e=this.get(a,{});m.patchState(`snapshot.${a}`,{...e,stale:!0},"snapshot:stale")},clearRole(a){m.patchState(`snapshot.${a}`,{},"snapshot:clear-role")}};var jr={async listUsers(a={},e={}){let t=new URLSearchParams;Object.entries(a).forEach(([o,i])=>{i!=null&&i!==""&&t.set(o,String(i))});let n=t.toString()?`?${t.toString()}`:"",r=await v.get(`/admin/users${n}`,e);return{users:r.data?.users??[],meta:r.meta??{}}},async pendingUsers(a={},e={}){let t=new URLSearchParams;Object.entries(a).forEach(([o,i])=>{i!=null&&i!==""&&t.set(o,String(i))});let n=t.toString()?`?${t.toString()}`:"",r=await v.get(`/auth/pending-users${n}`,e);return{users:r.data?.users??[],meta:r.meta??{}}},async userDetail(a,e={}){return(await v.get(`/users/${encodeURIComponent(a)}`,e)).data?.user??null},async approveUsers(a=[],e={}){let t=await v.post("/auth/approve-users",{user_ids:a.map(n=>Number(n)).filter(n=>Number.isInteger(n)&&n>0)},e);return{approvedCount:t.data?.approved_count??0,userIds:t.data?.user_ids??[],blocked:t.data?.blocked??[]}},async listSettlements(a={},e={}){let t=new URLSearchParams;Object.entries(a).forEach(([o,i])=>{i!=null&&i!==""&&t.set(o,String(i))});let n=t.toString()?`?${t.toString()}`:"",r=await v.get(`/admin/affiliate-settlements${n}`,e);return{settlements:r.data?.settlements??[],meta:r.meta??{}}},async settlementDetail(a,e={}){return(await v.get(`/admin/affiliate-settlements/${encodeURIComponent(a)}`,e)).data?.settlement??null},async listAffiliateLedgers(a={},e={}){let t=new URLSearchParams;Object.entries(a).forEach(([o,i])=>{i!=null&&i!==""&&t.set(o,String(i))});let n=t.toString()?`?${t.toString()}`:"",r=await v.get(`/admin/affiliate-ledgers${n}`,e);return{ledgers:r.data?.ledgers??[],meta:r.meta??{}}},async createSettlement(a={},e={}){return(await v.post("/admin/affiliate-settlements",a,e)).data?.settlement??null},async updateSettlementStatus(a,e={},t={}){return(await v.patch(`/admin/affiliate-settlements/${encodeURIComponent(a)}/status`,e,t)).data?.settlement??null},async settleSettlement(a,e={},t={}){return(await v.post(`/admin/affiliate-settlements/${encodeURIComponent(a)}/settle`,e,t)).data?.settlement??null},async cancelSettlement(a,e={},t={}){return(await v.post(`/admin/affiliate-settlements/${encodeURIComponent(a)}/cancel`,e,t)).data?.settlement??null},async startAffiliateImpersonation(a,e={}){let t=await v.post(`/admin/affiliates/${encodeURIComponent(a)}/impersonate`,{reason:typeof e?.reason=="string"?e.reason.trim():""});return this.applyImpersonationContext(t.data),t},async startSellerImpersonation(a,e={}){let t=await v.post(`/admin/sellers/${encodeURIComponent(a)}/impersonate`,{reason:typeof e?.reason=="string"?e.reason.trim():""});return this.applyImpersonationContext(t.data),t},async startImpersonation(a,e={}){let t=String(e?.targetRole??"").trim();if(t==="seller")return this.startSellerImpersonation(a,e);if(t==="affiliate_admin")return this.startAffiliateImpersonation(a,e);let n=await v.post("/admin/impersonations",{target_user_id:Number(a),reason:typeof e?.reason=="string"?e.reason.trim():""});return this.applyImpersonationContext(n.data),n},async stopImpersonation(){let a=await v.post("/admin/impersonations/stop",{});return this.applyImpersonationContext(a.data),a},applyImpersonationContext(a={}){m.destroyWorkingState(),ta.clearRole("admin"),ta.clearRole("seller"),ta.clearRole("affiliate_admin"),m.patchState("app.routeHydrateError",null,"impersonation:clear-hydrate-error"),m.patchState("ui.sidebarOpen",!1,"impersonation:close-sidebar"),m.patchState("ui.sidebarCollapsed",!1,"impersonation:expand-sidebar"),E.setContext({user:a?.user??null,actor:a?.actor??null,impersonation:a?.impersonation??null})}};var gt=3e4,va=new Map,na=new Map,ra={async list({page:a=1,limit:e=12,filters:t={},affiliateSlug:n="",showroomSlug:r=""}={},o={}){let i=re(n),s=re(r),l=null,c=null;if(i){let x=await k.activateAffiliateBySlug(i,o);if(!x)return{cars:[],meta:{}};l=x.sellerUserId}if(s){let x=await k.activateShowroomBySlug(s,o);if(!x)return{cars:[],meta:{}};c=x.sellerUserId}let d=Object.fromEntries(Object.entries(t).filter(([x,L])=>x!=="brand_names"&&L!==""&&L!==null&&L!==void 0)),u={page:ie(a,1),limit:ie(e,12),...d,listing_status:"published"};(l||c)&&(u.seller_user_id=l||c);let p=l||c?u:k.applyCatalogFilters(u),g=ft({affiliateSlug:i,showroomSlug:s,filters:p}),b=bt(g);if(b)return b;let _=na.get(g);if(_)return _;let j=fa.list(p,o).then(x=>(va.set(g,{data:x,expiresAt:Date.now()+gt}),x));return o.signal||(na.set(g,j),j.then(()=>na.delete(g),()=>na.delete(g))),j},async detail(a,e={}){let t=null;if(e.affiliateSlug){let l=await k.activateAffiliateBySlug(e.affiliateSlug,e);if(!l)return null;t=l.sellerUserId}if(e.showroomSlug){let l=await k.activateShowroomBySlug(e.showroomSlug,e);if(!l)return null;t=l.sellerUserId}let n=null;try{n=await fa.detail(a,e)}catch(l){if(l.status===404)return null;throw l}if(!n||t&&Number(n.seller_user_id)!==Number(t))return null;let[r,o]=await Promise.allSettled([Ya.listByCar(a,e),Xa.byCar(a,e)]),i=r.status==="fulfilled"?r.value:[],s=o.status==="fulfilled"?o.value:null;return{car:{...n,images:i.length?i:n.images??[]},images:i,inspection:s}}};function re(a){return String(a??"").trim().toLowerCase()}function ie(a,e){let t=Number(a);return Number.isFinite(t)&&t>0?Math.floor(t):e}function ft({affiliateSlug:a="",showroomSlug:e="",filters:t={}}={}){return JSON.stringify({affiliateSlug:a,showroomSlug:e,filters:wa(t)})}function wa(a){return Array.isArray(a)?a.map(e=>wa(e)):a&&typeof a=="object"?Object.fromEntries(Object.keys(a).sort().map(e=>[e,wa(a[e])])):a}function bt(a){let e=va.get(a);return e?e.expiresAt<=Date.now()?(va.delete(a),null):e.data:null}var ht={brand:{logoMark:"",logoWordmark:""},placeholders:{carCard:"",showroom:""},illustrations:{emptyState:""}};function oe(a,e=""){let t=String(a??"").trim();return/^(https?:|data:|blob:)/.test(t)||t.startsWith("/")?t:t.split(".").reduce((n,r)=>n&&r in n?n[r]:e,ht)}var kt="/admin/design-studio-v2";function Pr({store:a=null,currentUser:e=null}={}){let n=(e??a?.get?.("auth.user",null)??null)?.role??a?.get?.("auth.role","public")??"public",r=!!a?.get?.("runtime.designStudioV2.enabled",!1),o=!!a?.get?.("runtime.designStudioV2.designMode",!1);return r&&o&&n==="super_admin"}function Ir(){return{href:kt,label:"Design Studio V2",icon:"sparkles"}}var se="pb-background-video-style",xt="assets/images/bg-vid.mp4";var yt="bg-white";function ia({src:a=xt,id:e="",className:t="",fallbackClassName:n="bg-[var(--pb-page-bg)]",overlayClassName:r="",preload:o="metadata"}={}){_t();let i=document.createElement("section");e&&(i.id=e),i.className=["pb-background-video",t].filter(Boolean).join(" "),i.setAttribute("aria-hidden","true");let s=document.createElement("span"),l=yt;s.className=["pb-background-video__fallback",l].filter(Boolean).join(" "),i.append(s);let c=document.createElement("video");c.className="pb-background-video__media",c.autoplay=!0,c.muted=!0,c.defaultMuted=!0,c.loop=!0,c.playsInline=!0,c.preload=o,c.tabIndex=-1,c.setAttribute("muted",""),c.setAttribute("playsinline",""),c.setAttribute("aria-hidden","true");let d=document.createElement("span"),u="";d.className=["pb-background-video__overlay",u].filter(Boolean).join(" ");let p=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??!1,g=!1,b=null,_=null,j=()=>{g||(i.classList.add("is-ready"),c.play?.().catch(()=>{}))},x=()=>{g||(i.classList.add("is-error"),console.warn?.("Background video failed to load; fallback background remains active."))},L=()=>{};return c.addEventListener("loadeddata",j),c.addEventListener("canplay",j),c.addEventListener("error",x),i.append(c,d),i.classList.add("is-reduced-motion"),i.dispose=()=>{g=!0,b&&typeof window.cancelIdleCallback=="function"&&window.cancelIdleCallback(b),_&&window.clearTimeout(_),c.pause?.(),c.removeAttribute("src"),c.replaceChildren(),c.load?.()},i.setEnabled=$=>{if(!g){if(!$){c.pause?.();return}i.classList.contains("is-ready")&&c.play?.().catch(()=>{})}},i}function _t(){if(document.getElementById(se))return;let a=document.createElement("style");a.id=se,a.textContent=`
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
  `,document.head.append(a)}var vt=500,ca=[],Ea=new Set,Y=new Set,le=new Map,oa=new Map,Sa=null,sa=!1,ce={enqueueCars(a=[],e={}){let t=String(e.affiliateSlug??"").trim(),n=String(e.showroomSlug??"").trim();(Array.isArray(a)?a:[]).forEach(o=>{let i=Na(o?.id);!i||Ea.has(i)||Y.has(i)||Aa(i)||(Ea.add(i),ca.push({id:i,affiliateSlug:t,showroomSlug:n}))}),la()},async detailOrFetch(a,e={}){let t=Na(a),n=Aa(t);if(n)return Ca(t,n),n;let r=await de(t,a,e);return Y.add(t),pe(t,r),Ca(t,r),r}};function la(){Sa||sa||ca.length===0||(Sa=window.setTimeout(()=>{Sa=null,wt()},vt))}async function wt(){if(sa||ca.length===0){la();return}let a=ca.shift();if(Ea.delete(a.id),Y.has(a.id)||Aa(a.id)){la();return}sa=!0;try{if(a.affiliateSlug&&!St(a.affiliateSlug)||a.showroomSlug&&!Et(a.showroomSlug))return;let e=await de(a.id,a.id,{affiliateSlug:a.affiliateSlug,showroomSlug:a.showroomSlug});Y.add(a.id),pe(a.id,e),Ca(a.id,e)}catch{}finally{sa=!1,la()}}function de(a,e,t={}){if(oa.has(a))return oa.get(a);let n=ra.detail(e,t).finally(()=>{oa.delete(a)});return oa.set(a,n),n}function pe(a,e){!a||!e||(Y.add(a),le.set(a,e))}function Aa(a){return a?le.get(a)??null:null}function Ca(a,e){if(!a||!e)return;let t=m.get("app.currentRoute",null),n=Na(t?.params?.id),r=String(t?.name??"");n!==a||!r.includes("car-detail")||m.patchState("working.publicCarDetail.detail",{data:e,hydratedAt:Date.now()},"public:car-detail-preload-hit")}function Na(a){return String(a??"").trim()||""}function St(a){let e=m.get("app.currentRoute",null),t=String(a??"").trim().toLowerCase();return t?String(e?.name??"").includes("affiliate")?String(e?.params?.marketingSlug??e?.params?.slug??"").trim().toLowerCase()===t:!1:!0}function Et(a){let e=m.get("app.currentRoute",null),t=String(a??"").trim().toLowerCase();return t?String(e?.name??"").includes("affiliate")?!1:String(e?.params?.slug??"").trim().toLowerCase()===t:!0}var ue="projectB:affiliate-click-log",At=300*1e3,me={async trackCurrentPage(){let a=k.activeAffiliate();if(!a?.slug)return null;let e=Ct();if(!e||Nt(a.slug,e))return null;let t=await Va.recordClick({referral_code:a.slug,landing_url:e}).catch(()=>null);return jt(a.slug,e),t}};function Ct(){try{return window.location.href}catch{return""}}function Nt(a,e){let t=ge(),n=`${a}:${e}`,r=Number(t[n]??0);return r?Date.now()-r<At:!1}function jt(a,e){let t=ge();t[`${a}:${e}`]=Date.now(),Lt(t)}function ge(){try{let a=window.sessionStorage.getItem(ue);return a?JSON.parse(a):{}}catch{return{}}}function Lt(a){try{window.sessionStorage.setItem(ue,JSON.stringify(a))}catch{}}function fe({showroomName:a=""}={}){let e=document.createElement("section");e.id="public_maintenance_section",e.className="grid min-h-[70vh] place-items-center px-4 py-12";let t=document.createElement("div");t.className="grid max-w-md gap-5 justify-items-center rounded-[2rem] border border-[var(--pb-card-border)] bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl";let n=document.createElement("div");n.className="grid h-20 w-20 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] text-[var(--pb-brand-secondary)]",n.append(z("wrench",{className:"h-9 w-9"}));let r=document.createElement("h1");r.id="public_maintenance_title",r.className="text-xl font-black tracking-tight text-gray-950",r.textContent="Halaman Sedang Tidak Tersedia";let o=document.createElement("p");o.className="text-sm leading-6 text-gray-600",o.textContent=a?`Halaman showroom "${a}" sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.`:"Halaman showroom ini sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.";let i=document.createElement("p");i.className="text-xs leading-6 text-gray-500",i.textContent="Silakan coba lagi beberapa saat lagi, atau kembali ke beranda untuk melihat showroom lain.";let s=N({label:"Kembali ke Beranda",variant:"primary",onClick:()=>window.location.assign("/")});return s.id="public_maintenance_home_button",s.classList.add("w-full","sm:w-fit"),t.append(n,r,o,i,s),e.append(t),e}var w="modules.public.catalog",$t=300*1e3,ja=new Map,h={get(){return m.get(w,{})},filters(){return m.get(`${w}.filters`,{})},quickFilter(){return m.get(`${w}.quickFilter`,"newest")},page(){return m.get(`${w}.page`,1)},limit(){return m.get(`${w}.limit`,12)},setFilters(a){m.patchState(`${w}.filters`,{...this.filters(),...a},"public:filters"),m.patchState(`${w}.page`,1,"public:page-reset")},resetFilters(){m.patchState(`${w}.filters`,{keyword:"",brand_name:"",brand_names:[],transmission:"",location_name:"",location_names:[],min_price_cash:"",max_price_cash:""},"public:filters-reset"),m.patchState(`${w}.page`,1,"public:page-reset")},setQuickFilter(a){m.patchState(`${w}.quickFilter`,a,"public:quick-filter")},setFilterOpen(a){m.patchState(`${w}.isFilterOpen`,!!a,"public:filter-sheet")},incrementPage(){m.patchState(`${w}.page`,this.page()+1,"public:page-next")},setSelectedCar(a){m.patchState(`${w}.selectedCarId`,a,"public:selected-car")},selectedCarSummary(a=this.get().selectedCarId,e={}){let t=String(a??""),n=this.workingCatalog({cars:[]})?.cars??[],r=this.cachedCatalog(e)?.cars??[],o=this.snapshotCatalog({cars:[]})?.cars??[];return[...n,...r,...o].find(i=>String(i.id)===t)??null},saveScrollPosition(a){let e=Number.isFinite(Number(a))?Number(a):0;m.patchState(`${w}.scrollPosition`,e,"public:scroll-save")},consumeScrollPosition(){let a=m.get(`${w}.scrollPosition`,null);return m.patchState(`${w}.scrollPosition`,null,"public:scroll-consume"),Number.isFinite(Number(a))?Number(a):null},snapshotCatalog(a=null){return m.get("snapshot.public.catalog.data",a)},workingCatalog(a=null){return m.get("working.publicCatalog.catalog.data",a)},setWorkingCatalog(a){m.patchState("working.publicCatalog.catalog",{data:a,hydratedAt:Date.now()},"public:catalog-set")},cachedCatalog(a={}){let e=be(a),t=ja.get(e);return t?Date.now()-t.storedAt>$t?(ja.delete(e),null):t.catalog:null},rememberCatalog(a,e={}){!a||!Array.isArray(a.cars)||ja.set(be(e),{catalog:a,storedAt:Date.now()})}};function be({affiliateSlug:a="",showroomSlug:e="",filters:t={},page:n=1}={}){return JSON.stringify({affiliateSlug:String(a??"").trim().toLowerCase(),showroomSlug:String(e??"").trim().toLowerCase(),filters:La(t),page:Number(n)>0?Math.floor(Number(n)):1})}function La(a){return Array.isArray(a)?a.map(e=>La(e)):a&&typeof a=="object"?Object.fromEntries(Object.keys(a).sort().map(e=>[e,La(a[e])])):a}function he({affiliate:a=null,onClear:e=null}={}){if(!a)return null;let t=document.createElement("section");t.className="hidden relative grid gap-3 overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white/96 p-4 shadow-card",V(t,"public.affiliate.banner");let n=document.createElement("div");n.className="hidden absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_35%),linear-gradient(135deg,rgba(250,244,237,0.92),rgba(255,255,255,0.98))]";let r=document.createElement("div");r.className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";let o=document.createElement("div");o.className="grid min-w-0 gap-1";let i=document.createElement("p");i.className="inline-flex w-fit rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] px-3 py-1 text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]",i.textContent="Context marketing aktif";let s=document.createElement("h2");s.className="break-words text-sm font-bold tracking-normal text-gray-950 sm:text-base",s.textContent=a.showroom?.name?`Katalog ${a.showroom.name}`:a.seller?.name?`Katalog seller ${a.seller.name}`:"Katalog marketing";let l=document.createElement("p");if(l.className=`break-words text-xs leading-6 ${ba.text.muted}`,l.textContent=a.profile?.name?`Anda sedang masuk lewat marketing ${a.profile.name}. CTA konsultasi dan transaksi tetap membawa context ini selama sesi aktif.`:"Anda sedang melihat katalog dengan context marketing aktif.",o.append(i,s,l),r.append(o),e){let c=N({label:"Lepas context",variant:"secondary",onClick:e,designHook:"shared.button.secondary"});c.classList.add("w-full","sm:w-auto"),r.append(c)}return t.append(n,r),t}var ye="pub-local-filter-modal";function _e({open:a=!1,filters:e={},options:t={},onApply:n=null,onClose:r=null,onReset:o=null}={}){let i=document.createElement("span");if(i.hidden=!0,!a)return Bt(),i;let s=document.createElement("section");s.id="pub_filter_modal_content",s.className="grid min-w-0 gap-5";let l={brands:Rt(e),locations:Pt(e)};s.append($a("Merek",Ba(t.brands??[],"Semua merek").map(p=>({label:p.label,value:p.value,icon:"car",active:p.value===""?l.brands.length===0:l.brands.includes(p.value),onClick:(g,b)=>{p.value===""?l.brands=[]:l.brands=xe(l.brands,p.value),ke(b,l.brands)}}))),$a("Transmisi",Ba(t.transmissions??[],"Semua transmisi").map(p=>({label:p.label,value:p.value,icon:"sort",active:String(e.transmission??"")===p.value,onClick:(g,b)=>zt(g,b)})),"transmission"),$a("Lokasi",Ba(t.locations??[],"Semua lokasi").map(p=>({label:p.label,value:p.value,icon:"location",active:p.value===""?l.locations.length===0:l.locations.includes(p.value),onClick:(g,b)=>{p.value===""?l.locations=[]:l.locations=xe(l.locations,p.value),ke(b,l.locations)}}))),Mt(e));let c=document.createElement("section");c.className="grid grid-cols-2 gap-3";let d=N({label:"Reset",variant:"secondary",onClick:()=>{aa({notify:!1}),o?.()},designHook:"shared.button.secondary"});d.id="pub_filter_reset_button",d.classList.add("w-full","min-h-11","px-4","py-2","text-xs");let u=N({label:"Terapkan",onClick:()=>{aa({notify:!1});let p=Tt(s);n?.({...p,brand_name:"",brand_names:[...l.brands],location_name:"",location_names:[...l.locations]})},designHook:"shared.button.primary"});return u.id="pub_filter_apply_button",u.classList.add("w-full","min-h-11","px-4","py-2","text-xs"),c.append(d,u),s.append(c),ee(s,{key:ye,title:"Filter Mobil",description:"Filter lokal dari data mobil yang sudah tersedia di halaman.",size:"lg",footer:null,panelId:"pub_filter_modal",headerId:"pub_filter_modal_header",bodyId:"pub_filter_modal_body",closeButtonId:"pub_filter_modal_close_button",onClose:r}),i}function Bt(){m.get("ui.modal",null)?.key===ye&&aa({notify:!1})}function Mt(a){let e=document.createElement("section");return e.className="grid gap-4",e.append(ya({name:"min_price_cash",type:"number",label:"Harga minimum",value:a.min_price_cash??"",placeholder:"Contoh 100000000"}),ya({name:"max_price_cash",type:"number",label:"Harga maksimum",value:a.max_price_cash??"",placeholder:"Contoh 300000000"})),e}function Tt(a){let e={transmission:"",location_name:"",min_price_cash:"",max_price_cash:""};return a.querySelectorAll("[data-filter-name]").forEach(t=>{t.dataset.active==="true"&&(e[t.dataset.filterName]=t.dataset.value??"")}),a.querySelectorAll("input").forEach(t=>{e[t.name]=t.value??""}),e}function $a(a,e,t=""){let n=document.createElement("section");n.className="grid min-w-0 gap-3";let r=document.createElement("h3");r.className="text-xs font-black text-[var(--pb-text)]",r.textContent=a;let o=document.createElement("section");o.className="grid grid-cols-2 gap-2 sm:grid-cols-3";let i=[];return e.forEach(s=>{let l=document.createElement("button");l.type="button",l.className=Ma(s.active),l.dataset.active=s.active?"true":"false",l.dataset.value=s.value??"",t&&(l.dataset.filterName=t),l.append(It({icon:s.icon}),Dt("span","min-w-0 truncate text-left",s.label)),l.addEventListener("click",()=>s.onClick(l,i)),i.push(l),o.append(l)}),n.append(r,o),n}function Ma(a){return a?"inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_30%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-xs font-black text-[var(--pb-brand-secondary)]":"inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 py-2 text-xs font-bold text-[var(--pb-text-strong)] transition hover:bg-[var(--pb-surface-muted)]"}function ke(a,e){let t=new Set(e.map(String));a.forEach(n=>{let r=String(n.dataset.value??""),o=r===""?t.size===0:t.has(r);n.dataset.active=o?"true":"false",n.className=Ma(o)})}function zt(a,e){e.forEach(t=>{let n=t===a;t.dataset.active=n?"true":"false",t.className=Ma(n)})}function Rt(a){if(Array.isArray(a?.brand_names))return[...new Set(a.brand_names.map(String).filter(Boolean))];let e=String(a?.brand_name??"");return e?[e]:[]}function Pt(a){if(Array.isArray(a?.location_names))return[...new Set(a.location_names.map(String).filter(Boolean))];let e=String(a?.location_name??"");return e?[e]:[]}function xe(a,e){let t=new Set((Array.isArray(a)?a:[]).map(String).filter(Boolean));return t.has(e)?t.delete(e):t.add(e),[...t]}function It({icon:a="info"}={}){let e=document.createElement("span");return e.className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--pb-brand-secondary)]",e.append(z(a,{className:"h-4 w-4"})),e}function Dt(a,e,t){let n=document.createElement(a);return n.className=e,n.textContent=t,n}function Ba(a,e){return[{value:"",label:e},...a.filter(Boolean).map(t=>({value:t,label:t}))]}var Pa="bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-accent)_22%,transparent),transparent_22%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_12%),linear-gradient(180deg,var(--pb-public-canvas-start)_0%,var(--pb-public-canvas-mid)_45%,var(--pb-public-canvas-end)_100%)]",ve=[];function Ne({notFound:a=!1}={}){let e=null,t=null,n=null,r=!1,o=!1,i=()=>(n??(n=ia({id:"public_catalog_background_video_layer",fallbackClassName:Pa,overlayClassName:"bg-black/35"})),n);return R({async bootstrap(s){k.syncRouteContext(s);let l=k.routeAffiliateSlug(s),c=k.routeShowroomSlug(s);l&&await k.activateAffiliateBySlug(l).catch(()=>null),c&&await k.activateShowroomBySlug(c).catch(()=>null),(l||c)&&ha()&&await ea.load().catch(()=>null)},mount(s){return e=document.createElement("div"),e.className="min-h-screen",X(e,s,{notFound:a,isLoadingMore:r,isRefreshing:o,getBackgroundVideoLayer:i}),me.trackCurrentPage(),Wt(s),e},hydrate(s){X(e,s,{notFound:a,isLoadingMore:r,isRefreshing:o,getBackgroundVideoLayer:i})},bindEvents(s){return t=m.subscribe((l,c)=>{Ot(c)&&X(e,s,{notFound:a,isLoadingMore:r,isRefreshing:o,getBackgroundVideoLayer:i})}),()=>t?.()},unmount(){h.setFilterOpen(!1)},dispose(){za(e),n?.dispose?.(),n=null,t=null}})}function Ot(a){let e=String(a??"");return e?e.startsWith("ui:")||e==="public:selected-car"||e==="public:scroll-save"||e==="public:scroll-consume"?!1:["auth.","auth:","favorites:","public:","public-context:","working:","snapshot:set","route:","app.route"].some(t=>e.startsWith(t)||e.includes(t)):!0}function X(a,e,t){if(!a)return;let n=k.activeAffiliate(),r=k.activeShowroom(),o=k.routeAffiliateSlug(e),i=k.routeShowroomSlug(e),s=!!o,l=!!i,c=s&&k.invalidSlug()===o,d=l&&k.invalidSlug()===i,u=n||r;if(s||l){let y=k.inactiveShowroomContext();if(y.isInactive){a.replaceChildren(fe({showroomName:y.showroomName}));return}}let p=h.get(),g=p.filters??{},b={affiliateSlug:o,showroomSlug:i,filters:g,page:p.page},_=h.cachedCatalog(b),j=h.snapshotCatalog({cars:[],meta:{}}),x=h.workingCatalog(null),$=Te(x??_??(s||l?{cars:[],meta:{}}:j),_,p.page),Ha=m.get("working.publicCatalog.catalog.hydratedAt",0)??0;Ha&&$&&h.rememberCatalog($,b);let ua=$?.meta??{},Ua=Ia($?.cars??[]),J=en(tn(Ua,g),p.quickFilter),ma=Xt(Ua,Zt()),pt=an(ua,J.length,p.page,p.limit),ut=(!s||(n?.slug??"")===o)&&(!l||(r?.slug??"")===i),Z=Ae(e),Ka=je();if((s||l)&&!c&&!d&&(!ut||!Ha&&!_)){za(a),a.replaceChildren(qt(g,p.quickFilter,ma,Z?t.getBackgroundVideoLayer?.():null,Z,u));return}let W=document.createElement("div");W.className=Z?"relative isolate min-h-screen overflow-x-clip bg-transparent":`relative isolate min-h-screen overflow-x-clip ${Pa}`,V(W,"catalog.page"),Me(W,Z?t.getBackgroundVideoLayer?.():null,Be());let ga=E.isAuthenticated(),D=E.role(),mt=ga&&D==="buyer"&&Ae(e)||l||s,B=document.createElement("div");if(B.className=mt?"relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-3 pb-28 pt-4 sm:gap-6 sm:px-6 sm:pb-32 sm:pt-6 md:pb-6 2xl:max-w-[1240px]":"relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 2xl:max-w-[1240px]",ga&&(D==="buyer"||D==="seller")&&B.append(ne({activePath:e?.path??"/",brandLabel:D==="seller"?"Marketing":"Premium Buyer",brandIcon:D==="seller"?"showroom":"car",user:E.user(),onNavigate:y=>e.router?.navigate(y)})),ga&&(D==="buyer"||D==="seller")&&B.append(on({user:E.user(),actions:{navigate:y=>e.router?.navigate(y)}})),u){let y=he({affiliate:u,onClear:()=>{k.clear(),e.router.navigate("/public")}});y&&B.append(y)}c||d?B.append(ka({title:d?"Showroom tidak ditemukan":"Marketing tidak ditemukan",description:"Slug ini tidak aktif atau tidak tersedia lagi. Kembali ke landing utama untuk melihat katalog publik."})):(B.append(_a({filters:g,quickFilter:p.quickFilter,activeFilterCount:ze(g),options:ma,onSearch:y=>h.setFilters(y),onQuickFilter:y=>h.setQuickFilter(y),onOpenFilter:()=>h.setFilterOpen(!0)})),B.append(Ka.length?xa({sliders:Ka,idPrefix:"pubcat",context:"public",onNavigate:y=>e.router?.navigate(y),resolveCtaUrl:y=>s?Ft(y,o,n?.showroom?.slug??""):l?Ht(y,i):y,fallback:()=>da()}):da()),B.append($e({count:J.length,meta:ua,affiliate:u})),B.append(Kt(J.length,ua,u),Gt({cars:J,router:e.router,isRefreshing:t.isRefreshing,showFavorite:(l||s)&&ha()}),Vt({canLoadMore:pt,isLoadingMore:t.isLoadingMore,onLoadMore:()=>Yt(a,e,t)}))),W.append(B,_e({open:!!p.isFilterOpen,filters:g,options:ma,onApply:y=>{h.setFilterOpen(!1),h.setFilters(y)},onReset:()=>{h.resetFilters(),h.setFilterOpen(!1)},onClose:()=>h.setFilterOpen(!1)})),za(a),a.replaceChildren(W),ce.enqueueCars(J,{affiliateSlug:o,showroomSlug:i})}function je(){let a=m.get("working.publicCatalog.sliders.data",null),e=m.get("snapshot.public.slidersPublicHome.data",null),t=m.get("snapshot.public.slidersLandingHero.data",null),n=[...Ta(a),...Ta(e),...Ta(t)],r=new Set,o=n.filter(i=>{let s=String(i?.id??i?.code??"");return!s||r.has(s)?!1:(r.add(s),!0)}).slice(0,5);return o.length?(ve=o,o):ve}function Ft(a,e,t=""){let n=t?`/${encodeURIComponent(t)}/${encodeURIComponent(e)}`:`/af/${encodeURIComponent(e)}`,r=String(a||"").trim();if(!r)return n;let o=Le(r);return!o||o==="/"||o==="/public"?n:o.startsWith("/cars/")||o.startsWith("/transactions/")?`${n}${o}`:o.startsWith("/af/")||o.startsWith("/a/")?o:n}function Ht(a,e){let t=`/${encodeURIComponent(e)}`,n=String(a||"").trim();if(!n)return t;let r=Le(n);return!r||r==="/"||r==="/public"?t:r.startsWith("/cars/")||r.startsWith("/transactions/")?`/${encodeURIComponent(e)}${r}`:r.startsWith("/showrooms/")||r.startsWith("/s/")?r:t}function Le(a){let e=String(a||"").trim();if(e.startsWith("#/"))return e.slice(1);if(e.startsWith("/#/"))return e.slice(2);if(e.startsWith("/"))return e.replace(/\/$/,"")||"/";try{let t=new URL(e,window.location.origin);if(t.hash.startsWith("#/"))return t.hash.slice(1);if(t.origin===window.location.origin||Ut(t.hostname))return t.pathname.replace(/\/$/,"")||"/"}catch{}return""}function Ut(a){let e=Ja(a),t=Q(),n=t.default;return e?Object.keys(t).some(r=>t[r]===e)?!0:!!n&&e.endsWith(`.${n}`):!1}function Ta(a){return Array.isArray(a)?a.filter(Boolean):Array.isArray(a?.sliders)?a.sliders.filter(Boolean):Array.isArray(a?.data?.sliders)?a.data.sliders.filter(Boolean):[]}function Kt(a,e,t=null){let n=document.createElement("div");n.className="mt-1 rounded-[24px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur md:flex md:items-center md:justify-between xl:px-5",V(n,"catalog.filter.toolbar");let r=document.createElement("div");r.className="";let o=document.createElement("h2");o.className="break-words text-xs font-bold tracking-normal text-[var(--pb-text-strong)]",o.textContent=t?.showroom?.name?`Mobil Pilihan ${t.showroom.name}`:"Mobil Pilihan Terbaik";let i=document.createElement("p");i.className="text-xs font-medium text-[var(--pb-text-muted)]";let s=document.createElement("a");return s.href=k.catalogPath(),s.className="hidden inline-flex w-fit items-center gap-1 text-xs font-semibold text-[var(--pb-brand-accent)] no-underline",s.textContent="Semua >",r.append(o,i),n.append(r,s),n}function Gt({cars:a,router:e,isRefreshing:t,showFavorite:n=!1}){if(t){let o=document.createElement("div");return o.className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3",o.append(U({lines:4}),U({lines:4}),U({lines:4}),U({lines:4})),o}if(!a.length)return ka({title:"Mobil tidak ditemukan",description:"Ubah kata kunci atau filter untuk melihat katalog lainnya."});let r=document.createElement("div");return r.className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3",a.forEach(o=>{r.append(te({car:o,showFavorite:n,isFavorite:n&&ea.isFavorited(o.id),onToggleFavorite:i=>ea.toggle(i.id).catch(s=>{M(s?.message||"Favorit gagal disimpan.",{type:"error",key:"favorite-toggle-error",dedupeMs:3e3})}),onOpenDetail:i=>{h.saveScrollPosition(window.scrollY),h.setSelectedCar(i.id),e.navigate(k.carDetailPath(i.id))}}))}),r}function qt(a={},e="newest",t={},n=null,r=!1,o=null){let i=document.createElement("div");i.className=r?"relative isolate min-h-screen overflow-x-clip bg-transparent":`relative isolate min-h-screen overflow-x-clip ${Pa}`,Me(i,n,Be());let s=je(),l=document.createElement("div");return l.className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-4 py-4 sm:px-6 sm:py-6 2xl:max-w-[1240px]",l.append(_a({filters:a,quickFilter:e,options:t,activeFilterCount:ze(a)}),s.length?xa({sliders:s,idPrefix:"pubcat",context:"public",fallback:()=>da()}):da(),$e({count:0,meta:{},affiliate:o}),U({lines:8})),i.append(l),i}function da(){let a=document.createElement("section");a.id="pubcat_slider_skeleton",a.className="relative overflow-hidden rounded-[24px] border border-white/45 bg-white/20 shadow-[0_22px_58px_rgba(15,23,42,.10)] backdrop-blur",a.style.aspectRatio="16 / 5",a.setAttribute("aria-hidden","true");let e=document.createElement("span");e.className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent)] animate-[pbPublicSliderShimmer_1.2s_infinite]";let t=document.createElement("span");t.className="absolute inset-4 grid grid-cols-[minmax(0,1fr)_34%] items-center gap-4";let n=document.createElement("span");n.className="grid gap-3",["h-4 w-24","h-8 w-3/4","h-4 w-1/2"].forEach(o=>{let i=document.createElement("span");i.className=`${o} rounded-full bg-white/55`,n.append(i)});let r=document.createElement("span");return r.className="h-full min-h-0 rounded-[18px] bg-white/45",t.append(n,r),a.append(e,t),Jt(),a}var we=!1;function Jt(){if(we||typeof document>"u")return;we=!0;let a=document.createElement("style");a.id="pubcat-slider-skeleton-style",a.textContent="@keyframes pbPublicSliderShimmer{100%{transform:translateX(100%)}}",document.head.append(a)}function Wt(a){let e=h.consumeScrollPosition();e!==null&&(a?.router?.tahanGulirSekali?.(),requestAnimationFrame(()=>{window.scrollTo({top:e,left:0,behavior:"instant"})}))}function Vt({canLoadMore:a,isLoadingMore:e,onLoadMore:t}){let n=document.createElement("div");if(n.className="mt-6 grid gap-4 place-items-center",!a){let o=document.createElement("p");return o.className="text-xs text-[var(--pb-text-muted)]",o.textContent="Semua mobil yang cocok sudah ditampilkan.",n.append(o,Se()),n}let r=N({label:e?"Memuat...":"Muat lebih banyak",variant:"secondary",disabled:e,onClick:t,designHook:"catalog.load_more.button"});return r.classList.add("w-full","xsm:w-auto","px-6","py-3"),n.append(r,Se()),n}function $e({count:a,meta:e,affiliate:t}){return""}function Be(){let a=document.createElement("div");return a.className="pointer-events-none absolute inset-0",a.innerHTML=`
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.18)_0,transparent_2px),radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.14)_0,transparent_2px),radial-gradient(circle_at_36%_42%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_83%_34%,rgba(255,255,255,0.14)_0,transparent_2px),radial-gradient(circle_at_22%_62%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_64%_72%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_48%_88%,rgba(255,255,255,0.14)_0,transparent_2px)] bg-[length:100%_100%] opacity-70"></div>
  `,a}function Me(a,...e){e.filter(Boolean).forEach(t=>a.append(t))}function za(a){Array.from(a?.querySelectorAll?.(".pb-slider-banner")??[]).forEach(t=>t.dispose?.())}function Se(){let a=document.createElement("div");return a.className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-medium text-[var(--pb-text-muted)]",["Inspeksi jelas","Harga terarah","Support cepat"].forEach(e=>{let t=document.createElement("span");t.className="inline-flex items-center gap-2";let n=document.createElement("span");n.className="h-2 w-2 rounded-full bg-[var(--pb-brand-primary)]";let r=document.createElement("span");r.textContent=e,t.append(n,r),a.append(t)}),a}async function Yt(a,e,t){t.isLoadingMore=!0,X(a,e,t);try{let n=k.routeAffiliateSlug(e),r=k.routeShowroomSlug(e),o=h.page()+1,i={affiliateSlug:n,showroomSlug:r,filters:h.filters(),page:h.page()},s=h.cachedCatalog(i),l=Te(h.workingCatalog(null)??s??{cars:[],meta:{}},s,h.page()),c=await ra.list({page:o,limit:h.limit(),filters:h.filters(),affiliateSlug:n,showroomSlug:r});h.incrementPage(),h.setWorkingCatalog({cars:[...l?.cars??[],...c?.cars??[]],meta:c?.meta??l?.meta??{}})}catch(n){M(n.message||"Gagal memuat mobil tambahan.",{type:"error"})}finally{t.isLoadingMore=!1,X(a,e,t)}}function Te(a,e,t){if(!a||!e||Number(t)<=1)return a;let n=Array.isArray(a.cars)?a.cars:[],r=Array.isArray(e.cars)?e.cars:[];if(r.length<=n.length)return a;let o=new Set(n.map(i=>String(i?.id??"")));return{...e,...a,cars:[...n,...r.filter(i=>!o.has(String(i?.id??"")))]}}function ze(a){return Object.entries(a).reduce((e,[t,n])=>t==="keyword"||t==="brand_name"||t==="location_name"?e:t==="brand_names"&&Array.isArray(n)||t==="location_names"&&Array.isArray(n)?e+n.filter(Boolean).length:n!==""&&n!==null&&n!==void 0?e+1:e,0)}function Xt(a,e=null){return a=Ia(a),{brands:Ee(a.map(t=>t.brand_name)),transmissions:Ee(a.map(t=>t.transmission)),locations:Qt(e)}}function Ee(a){return[...new Set(a.filter(Boolean))].sort()}function Zt(){return Za.normalizeLocationMaster(m.get("working.publicCatalog.masterLocation.data",null)??m.get("snapshot.public.masterLocation.data",null))}function Qt(a){return(a?.data?.cities??[]).filter(e=>e.status==="active").map(e=>e.name).filter(Boolean).sort((e,t)=>e.localeCompare(t))}function an(a,e,t,n){return a?.total?e<Number(a.total):e>=t*n}function en(a,e){let t=[...a];return e==="promo"?t.filter(n=>Number(n.price_discount??0)>0&&Number(n.price_discount)<Number(n.price_cash??0)):e==="price-low"?t.sort((n,r)=>Ra(n)-Ra(r)):e==="mileage-low"?t.sort((n,r)=>Number(n.mileage_km??999999999)-Number(r.mileage_km??999999999)):t.sort((n,r)=>{let o=Date.parse(n.published_at??n.created_at??"")||Number(n.id??0);return(Date.parse(r.published_at??r.created_at??"")||Number(r.id??0))-o})}function tn(a,e={}){let t=String(e.keyword??"").trim().toLowerCase(),n=nn(e).map(l=>l.toLowerCase()),r=String(e.transmission??"").trim().toLowerCase(),o=rn(e).map(l=>l.toLowerCase()),i=Number(e.min_price_cash??0),s=Number(e.max_price_cash??0);return Ia(a).filter(l=>{let c=[l.brand_name,l.model_name,l.sub_model_name,l.location_name,l.transmission].filter(Boolean).join(" ").toLowerCase(),d=Ra(l);return!(t&&!c.includes(t)||n.length>0&&!n.includes(String(l.brand_name??"").toLowerCase())||r&&String(l.transmission??"").toLowerCase()!==r||o.length>0&&!o.includes(String(l.location_name??"").toLowerCase())||i>0&&d<i||s>0&&d>s)})}function nn(a){if(Array.isArray(a?.brand_names))return[...new Set(a.brand_names.map(String).filter(Boolean))];let e=String(a?.brand_name??"");return e?[e]:[]}function rn(a){if(Array.isArray(a?.location_names))return[...new Set(a.location_names.map(String).filter(Boolean))];let e=String(a?.location_name??"");return e?[e]:[]}function Ia(a=[]){return(Array.isArray(a)?a:[]).filter(e=>["published","view_sold"].includes(String(e?.listing_status??"").toLowerCase()))}function Ra(a){let e=Number(a.price_discount??0),t=Number(a.price_cash??0);return e>0&&e<t?e:t}function Ae(a){let e=String(a?.name??a?.route?.name??""),t=String(a?.path??"");return e==="public.catalog"||e==="public.catalog-alias"||t==="/"||t==="/public"}function on({user:a,actions:e}){let t=document.createElement("header");t.id="byr_profile_header",t.className="relative flex min-w-0 items-start justify-between gap-3 px-1 py-1 md:hidden",t.dataset.ds="buyer.dashboard.profile_header";let n=document.createElement("section");n.className="flex min-w-0 flex-1 items-start gap-3";let r=document.createElement("button");r.id="byr_mobile_menu_button",r.type="button",r.hidden=!0,r.className="hidden",r.setAttribute("aria-hidden","true"),r.setAttribute("aria-label","Open menu"),r.append(z("bars",{className:"block h-5 w-5 leading-none"})),n.append(r,sn(a));let o=document.createElement("section");return o.className="relative z-20 inline-flex shrink-0 items-center justify-end gap-2",o.append(ae({idPrefix:"byr_mobile",compact:!0,onNavigate:e.navigate,withBackdrop:!0}),ln({user:a,actions:e,compact:!0})),t.append(n,o),t}function sn(a){let e=Re(a)||"User",t=document.createElement("section");t.className="grid min-w-0 gap-0.5";let n=document.createElement("h1");return n.className="truncate text-lg font-black leading-tight tracking-normal text-[var(--pb-text-strong)]",n.textContent=` ${e}`,t.append(n,dn("p","truncate text-[5] font-semibold text-[var(--pb-text-muted)]","Selamat datang kembali!")),t}function Re(a={}){return a.name??a.full_name??a.username??a.email?.split("@")[0]??"User"}function Ce(a={}){return Re(a).split(/\s+/).filter(Boolean).slice(0,2).map(e=>e[0]?.toUpperCase()).join("")||"U"}function ln({user:a,actions:e,compact:t=!1}={}){let n=document.createElement("button");n.type="button",n.className=t?"inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]":"inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]",n.setAttribute("aria-label","Buka profil buyer"),n.title="Profil",n.addEventListener("click",()=>e?.navigate?.("/profile"));let r=a?.avatar_url??a?.photo_url??a?.profile_photo_url??"";if(r){let o=document.createElement("img");return o.src=cn(r),o.alt="Avatar buyer",o.loading="lazy",o.className="block h-full w-full object-cover",o.addEventListener("error",()=>{n.textContent=Ce(a)},{once:!0}),n.append(o),n}return n.textContent=Ce(a),n}function cn(a){let e=String(a??"").trim();return e?/^(https?:|data:|blob:)/.test(e)||e.startsWith("/")?e:`/storage/${e.replace(/^\/+/,"")}`:""}function dn(a,e,t){let n=document.createElement(a);return n.className=e,n.textContent=t??"",n}var pn={brand:{appName:"BeliMobil",shortMark:"BM",tagline:"Jual beli mobil terpercaya",logoIcon:"brandMark",logoMarkAsset:"brand.logoMark"},contact:{whatsapp:""},colors:{primary:"#1e81b0",secondary:"#17698f",accent:"#eab676",pageBg:"#faf4ed",surface:"#ffffff",surfaceMuted:"#faf4ed",inset:"#f5ece1",text:"#1c1917",textStrong:"#2f2a26",textMuted:"#6f665e",border:"#e7dccd",borderStrong:"#d8c9b4",overlay:"rgba(28, 25, 23, 0.55)",success:"#15803d",warning:"#b45309",danger:"#b91c1c",info:"#1e81b0",publicCanvasStart:"#ffffff",publicCanvasMid:"#faf4ed",publicCanvasEnd:"#f5ece1"},shell:{publicHeaderBg:"rgba(255, 255, 255, 0.92)",appHeaderBg:"rgba(255, 255, 255, 0.95)",sidebarStart:"#1e81b0",sidebarEnd:"#17698f",navActiveBg:"rgba(255, 255, 255, 0.18)",navText:"#ffffff"},button:{primaryFrom:"#15803d",primaryTo:"#1a9a49",secondaryBg:"#ffffff",secondaryText:"#17698f",ghostText:"#17698f"},surface:{cardBg:"#ffffff",cardBorder:"#e7dccd",panelBg:"#ffffff",insetBg:"#faf4ed"},form:{searchBg:"#ffffff",inputBg:"#ffffff",controlBorder:"#d8c9b4",focus:"#1e81b0",chipBg:"#ffffff",chipText:"#4a423b",chipActiveFrom:"#1e81b0",chipActiveTo:"#17698f"},state:{emptyBg:"#ffffff",errorBg:"#ffffff",errorBorder:"#f0c9c9",badgeNeutralBg:"#f3ece3"},layout:{spacingScale:1,radiusScale:1,shadowDepth:1}},Pe=globalThis.__PROJECTB_THEME_DEFAULTS__?typeof structuredClone=="function"?structuredClone(globalThis.__PROJECTB_THEME_DEFAULTS__):JSON.parse(JSON.stringify(globalThis.__PROJECTB_THEME_DEFAULTS__)):pn;function Ie(){return Wa(globalThis.__PROJECTB_GET_THEME__?.()??globalThis.__PROJECTB_THEME__??Pe)}var De={public:"/",buyer:"/buyer",seller:"/seller",admin:"/admin",affiliate_admin:"/affiliate"},A={async loginForRole(a,e){let t=await F.login(e),n=F.user()?.role??"public";if(n!==a){await F.logout();let r=new Error(this.roleMismatchMessage(a,n));throw r.code="ROLE_MISMATCH",r.selectedRole=a,r.actualRole=n,r}return t},login(a){return F.login(a)},async registerForRole(a,e){if(!this.canRegisterRole(a))throw new Error(`Registrasi ${this.roleLabel(a)} tidak tersedia dari halaman ini.`);return await F.register({...e,role:a}),a!=="buyer"?{authenticated:!1}:(await this.loginForRole(a,{email:e.email,password:e.password}),{authenticated:!0})},logout(){return F.logout()},supportedRoles(){return["buyer","seller","admin","affiliate_admin"]},normalizeRole(a){return this.supportedRoles().includes(a)?a:"buyer"},normalizeAuthMode(a){return a==="register"?"register":"login"},canRegisterRole(a){return a==="buyer"},registerPathForRole(a){return a==="seller"?"/daftar-showroom":null},homeForRole(a){return De[a]??De.public},canOpenPath(a,e){return!e||typeof e!="string"?!1:a==="admin"?e==="/admin"||e.startsWith("/admin/"):a==="affiliate_admin"?e==="/affiliate"||e.startsWith("/affiliate/"):a==="buyer"?e==="/buyer"||e.startsWith("/buyer/"):a==="seller"?e==="/seller"||e.startsWith("/seller/"):e==="/"||e.startsWith("/cars/")||e.startsWith("/transactions/")},resolveAfterLogin({selectedRole:a,actualRole:e,fromPath:t}){return e===a&&this.canOpenPath(e,t)?t:this.homeForRole(e)},roleMismatchMessage(a,e){return`Akun ${this.roleLabel(e)} tidak bisa masuk lewat jalur ${this.roleLabel(a)}.`},roleLabel(a){return Qa(a)},roleCopy(a){return a==="seller"?{title:"Masuk sebagai showroom",description:"Kelola showroom, listing, dan transaksi."}:a==="admin"?{title:"Masuk sebagai admin",description:"Pantau user, approval, dan operasional."}:a==="affiliate_admin"?{title:"Masuk sebagai marketing",description:"Pantau aktivitas, ledger, dan settlement."}:{title:"Masuk sebagai buyer",description:"Lanjutkan transaksi dan pembayaran."}}};var un=[{role:"buyer",label:"Buyer",icon:"transaction",futureCopy:"Transaksi dan pembayaran."},{role:"seller",label:"Showroom",icon:"showroom",futureCopy:"Showroom dan listing."},{role:"admin",label:"Admin",icon:"dashboard",futureCopy:"Operasi dan approval."},{role:"affiliate_admin",label:"Marketing",icon:"affiliate",futureCopy:"Aktivitas dan komisi."}],mn=Object.freeze({seller:"seller",admin:"admin",affiliate_admin:"affiliate"}),T=!1,gn="bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#faf4ed,#f8fafc_44%,#eaf4f9)]";function He(){let a=null,e=null,t={selectedRole:"buyer",authMode:"login",isSubmitting:!1,error:""},n=()=>(e??(e=ia({id:"auth_background_video_layer",fallbackClassName:gn,overlayClassName:"bg-white/42"})),e);return t.getBackgroundVideoLayer=n,R({bootstrap(r){t.selectedRole=A.normalizeRole(r.query.role),t.authMode=A.normalizeAuthMode(r.query.mode),t.error="",t.isSubmitting=!1},mount(r){return a=document.createElement("div"),a.className="relative isolate min-h-screen overflow-hidden bg-transparent",P(a,r,t,n),a},hydrate(r){P(a,r,t,n)},dispose(){e?.dispose?.(),e=null}})}function P(a,e,t,n=null){if(!a)return;let r=E.role(),o=Da(e.query.from),i=mn[t.selectedRole];if(i&&!E.isAuthenticated()&&Q()[i]){e.router.navigate(`/login/${i}`);return}let s=document.createElement("main");s.id="hr_auth_frame",s.className=T?"relative z-10 mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-center":"relative z-10 mx-auto grid min-h-screen w-full items-center justify-items-center px-4 py-6 sm:px-6 sm:py-10 lg:justify-items-end lg:px-10";let l=document.createElement("div");l.className=T?"grid gap-5":"hidden",T||l.setAttribute("aria-hidden","true"),l.append(hn({requestedPath:o}),kn({selectedRole:t.selectedRole,onChange:u=>{t.selectedRole=u,A.canRegisterRole(u)||(t.authMode="login"),t.error="",P(a,e,t)}}));let c=document.createElement("aside");if(c.className="grid w-full max-w-[460px] gap-4",c.append(bn(e.router)),E.isAuthenticated()){let u=A.resolveAfterLogin({selectedRole:r,actualRole:r,fromPath:o});c.append(fn(A.roleLabel(r))),window.setTimeout(()=>{E.isAuthenticated()&&e.router.navigate(u)},0)}else c.append(xn({selectedRole:t.selectedRole,authMode:t.authMode,requestedPath:o,isSubmitting:t.isSubmitting,error:t.error,onModeChange:u=>{t.authMode=u,t.error="",P(a,e,t)},onLogin:u=>Sn(u,e,t,a),onRegister:u=>En(u,e,t,a),onNavigate:u=>e?.router?.navigate(u)}));s.append(l,c);let d=n?.()??t.getBackgroundVideoLayer?.();a.replaceChildren(...[d,s].filter(Boolean)),wn(s)}function fn(a){let e=document.createElement("section");e.id="hr_auth_redirecting_section",e.className="grid gap-2 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 px-5 py-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl";let t=document.createElement("p");t.className="text-xs font-black text-gray-900",t.textContent="Sesi Anda masih aktif";let n=document.createElement("p");return n.className="text-xs leading-6 text-gray-600",n.textContent=`Mengarahkan ke dashboard ${a}...`,e.append(t,n),e}function bn(a){let e=N({label:"Kembali ke landing page",variant:"secondary",onClick:()=>a.navigate("/")});return e.id="hr_auth_back_landing_button",e.classList.add("justify-self-start","rounded-full","px-4","shadow-sm","backdrop-blur","transition","duration-200","hover:-translate-y-0.5"),e}function hn({requestedPath:a}){let e=document.createElement("section");e.id="hr_auth_brand_section",e.hidden=!T,e.setAttribute("aria-hidden",String(!T)),e.className=T?"relative overflow-hidden rounded-[2rem] border border-[var(--pb-card-border)] bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8":"hidden";let t=document.createElement("div");t.className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_20%,transparent)] blur-3xl";let n=document.createElement("div");n.className="relative grid max-w-xl gap-5";let r=document.createElement("div");r.className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-base font-black text-white shadow-[0_16px_40px_rgba(30,129,176,0.28)] transition duration-200 hover:scale-[1.02]",r.textContent="BM";let o=document.createElement("h1");o.className="max-w-lg text-3xl font-black leading-[0.98] tracking-[-0.04em] text-gray-950 sm:text-4xl",o.textContent="Masuk dengan akun yang tepat.";let i=document.createElement("p");i.className="max-w-md text-xs leading-6 text-gray-600 sm:text-sm",i.textContent=a?"Pilih level user, lalu lanjutkan ke halaman tujuan.":"Satu pintu untuk buyer, showroom, admin, dan marketing.";let s=document.createElement("div");return s.className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-600",["Cepat","Aman","Ringkas"].forEach((l,c)=>{let d=document.createElement("span");d.className="rounded-full border border-[var(--pb-card-border)] bg-white/75 px-3 py-1 shadow-sm",d.textContent=l,d.id=`hr_auth_brand_pill_${c+1}`,s.append(d)}),n.append(r,o,i,s),e.append(t,n),e}function kn({selectedRole:a,onChange:e}){let t=document.createElement("section");return t.id="hr_auth_role_section",t.hidden=!T,t.setAttribute("aria-hidden",String(!T)),t.className=T?"grid gap-3 sm:grid-cols-2":"hidden",un.forEach(n=>{let r=document.createElement("button");r.id=`hr_auth_role_${n.role}_button`,r.type="button",r.className=n.role===a?"group grid gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white/90 p-4 text-left shadow-[0_18px_45px_rgba(30,129,176,0.16)] ring-2 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] transition duration-200 hover:-translate-y-0.5":"group grid gap-3 rounded-[1.35rem] border border-[var(--pb-card-border)] bg-white/65 p-4 text-left shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]",r.addEventListener("click",()=>e(n.role));let o=document.createElement("div");o.className="flex items-center gap-3";let i=document.createElement("div");i.className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_12%,white),color-mix(in_srgb,var(--pb-brand-accent)_16%,white))] text-[var(--pb-brand-secondary)] shadow-sm transition duration-200 group-hover:scale-105",i.append(z(n.icon,{className:"h-5 w-5"}));let s=document.createElement("div");s.className="grid gap-1";let l=document.createElement("strong");l.className="text-xs font-black text-gray-950",l.textContent=n.label;let c=document.createElement("span");c.className="text-[10px] leading-5 text-gray-500",c.textContent=n.futureCopy,s.append(l,c),o.append(i,s);let d=document.createElement("span");d.className=n.role===a?"w-fit rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] px-2.5 py-1 text-[10px] font-bold text-[var(--pb-brand-secondary)]":"w-fit rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-gray-500",d.textContent=n.role===a?"Aktif":"Pilih",r.append(o,d),t.append(r)}),t}function xn({selectedRole:a,authMode:e,requestedPath:t,isSubmitting:n,error:r,onModeChange:o,onLogin:i,onRegister:s,onNavigate:l}){let c=A.roleCopy(a),d=A.canRegisterRole(a),u=d?e:"login",p=document.createElement("section");p.id="hr_auth_panel_section",p.className="relative grid gap-5 overflow-hidden rounded-[2rem] border border-[var(--pb-card-border)] bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl transition duration-300 sm:p-6";let g=document.createElement("div");g.className="grid gap-1.5";let b=document.createElement("h2");b.className="text-xl font-black tracking-[-0.03em] text-gray-950",b.textContent=u==="register"?`Daftar ${A.roleLabel(a)}`:"Masuk ke akun";let _=document.createElement("p");if(_.className="text-xs leading-6 text-gray-600",_.textContent=t?"Masuk, lalu kembali ke halaman tujuan.":"Gunakan email dan password sesuai akun Anda.",g.append(b,_),p.append(g),d&&p.append(yn({activeMode:u,onModeChange:o})),!d){let j=A.registerPathForRole(a),x=document.createElement("p");if(x.id=`hr_auth_${a}_no_register_note`,x.className="rounded-2xl bg-[var(--pb-surface-muted)] px-3 py-2 text-xs leading-6 text-gray-600",j){x.append(document.createTextNode("Belum punya showroom? Pendaftaran ada di halaman terpisah."));let L=document.createElement("button");L.id="hr_auth_seller_register_link",L.type="button",L.className="ml-1 font-bold text-[var(--pb-brand-secondary)] underline underline-offset-2",L.textContent="Daftarkan showroom",L.addEventListener("click",()=>l?.(j)),x.append(L)}else x.textContent="Level User ini memakai akun dari admin.";p.append(x)}return p.append(u==="register"?vn({selectedRole:a,isSubmitting:n,error:r,onSubmit:s}):_n({selectedRole:a,isSubmitting:n,error:r,onSubmit:i})),p}function yn({activeMode:a,onModeChange:e}){let t=document.createElement("div");return t.className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--pb-card-border)] bg-gray-100/80 p-1",t.append(Oe("login","Masuk",a,e),Oe("register","Daftar",a,e)),t}function Oe(a,e,t,n){let r=document.createElement("button");return r.id=`hr_auth_tab_${a}_button`,r.type="button",r.className=a===t?"rounded-xl bg-white px-3 py-2.5 text-xs font-black text-gray-950 shadow-sm transition duration-200":"rounded-xl px-3 py-2.5 text-xs font-bold text-gray-500 transition duration-200 hover:bg-white/70 hover:text-gray-800",r.textContent=e,r.addEventListener("click",()=>n?.(a)),r}function _n({selectedRole:a,isSubmitting:e,error:t,onSubmit:n}){let r=document.createElement("form");if(r.className="grid gap-3",r.append(H({id:`hr_auth_login_${a}_email_input`,name:"email",label:"Email",type:"email",placeholder:An(a)}),H({id:`hr_auth_login_${a}_password_input`,name:"password",label:"Password",type:"password",placeholder:"Password akun"})),t){let i=document.createElement("p");i.className="rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]",i.textContent=t,r.append(i)}let o=N({label:e?"Memproses...":`Masuk ${a}`,variant:"primary",disabled:e});return o.id=`hr_auth_login_${a}_submit_button`,o.type="submit",o.classList.add("w-full","shadow-[0_16px_34px_rgba(30,129,176,0.24)]","transition","duration-200","hover:-translate-y-0.5","active:translate-y-0"),r.append(o),r.addEventListener("submit",i=>{i.preventDefault();let s=Object.fromEntries(new FormData(r));n?.({email:s.email,password:s.password})}),r}function vn({selectedRole:a,isSubmitting:e,error:t,onSubmit:n}){let r=document.createElement("form");if(r.className="grid gap-3",r.append(H({id:`hr_auth_register_${a}_name_input`,name:"name",label:"Nama",placeholder:a==="seller"?"Nama pemilik showroom":"Nama buyer"}),H({id:`hr_auth_register_${a}_phone_input`,name:"phone_number",label:"Nomor WhatsApp",placeholder:"081234567890",required:!1}),H({id:`hr_auth_register_${a}_email_input`,name:"email",label:"Email",type:"email",placeholder:Cn(a)}),H({id:`hr_auth_register_${a}_password_input`,name:"password",label:"Password",type:"password",placeholder:"Minimal 6 karakter"}),Fe({id:`hr_auth_register_${a}_address_input`,name:"address",label:"Alamat",placeholder:"Alamat domisili",required:!1})),a==="seller"&&r.append(H({id:"hr_auth_register_seller_showroom_name_input",name:"showroom_name",label:"Nama showroom",placeholder:"Nama showroom"}),Fe({id:"hr_auth_register_seller_showroom_address_input",name:"showroom_address",label:"Alamat showroom",placeholder:"Alamat showroom",required:!1})),t){let s=document.createElement("p");s.className="rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]",s.textContent=t,r.append(s)}let o=N({label:e?"Mendaftarkan...":Nn(a),variant:"primary",disabled:e});o.id=`hr_auth_register_${a}_submit_button`,o.type="submit",o.classList.add("w-full","shadow-[0_16px_34px_rgba(30,129,176,0.24)]","transition","duration-200","hover:-translate-y-0.5","active:translate-y-0"),r.append(o);let i=document.createElement("p");return i.className="text-xs leading-6 text-gray-600",i.textContent=a==="seller"?"Akun showroom akan masuk antrean approval admin sebelum bisa login.":"Akun buyer aktif setelah registrasi dan akan langsung diarahkan ke area buyer.",r.append(i),r.addEventListener("submit",s=>{s.preventDefault();let l=Object.fromEntries(new FormData(r)),c={name:l.name,phone_number:l.phone_number,email:l.email,password:l.password,address:l.address};a==="seller"&&(c.showroom={name:l.showroom_name,address:l.showroom_address,phone_number:l.phone_number}),n?.(c)}),r}function H({id:a,name:e,label:t,type:n="text",placeholder:r="",required:o=!0}){let i=document.createElement("label");i.className="grid gap-1.5 text-xs font-semibold text-gray-700",i.textContent=t;let s=document.createElement("input");return s.id=a,s.name=e,s.type=n,s.required=o,s.placeholder=r,s.className="min-h-11 min-w-0 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-xs text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]",i.append(s),i}function Fe({id:a,name:e,label:t,placeholder:n="",required:r=!0}){let o=document.createElement("label");o.className="grid gap-1.5 text-xs font-semibold text-gray-700",o.textContent=t;let i=document.createElement("textarea");return i.id=a,i.name=e,i.required=r,i.placeholder=n,i.rows=3,i.className="min-h-24 min-w-0 w-full resize-y rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-xs text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]",o.append(i),o}function wn(a){!a||typeof a.animate!="function"||a.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"translateY(0)"}],{duration:240,easing:"cubic-bezier(0.22, 1, 0.36, 1)"})}async function Sn(a,e,t,n){t.isSubmitting=!0,t.error="",P(n,e,t);try{await A.login(a);let r=E.role(),o=Da(e.query.from),i=A.resolveAfterLogin({selectedRole:r,actualRole:r,fromPath:o});M(`Login ${r} berhasil.`,{type:"success",key:"auth-login-success",dedupeMs:3e3}),e.router.navigate(i);return}catch(r){t.error=r.message||"Login gagal.",M(t.error,{type:"error",key:"auth-login-error",dedupeMs:3e3})}t.isSubmitting=!1,P(n,e,t)}async function En(a,e,t,n){t.isSubmitting=!0,t.error="",P(n,e,t);try{if((await A.registerForRole(t.selectedRole,a))?.authenticated){let o=E.role(),i=t.selectedRole,s=Da(e.query.from),l=A.resolveAfterLogin({selectedRole:i,actualRole:o,fromPath:s});M(`Registrasi ${i} berhasil.`,{type:"success"}),e.router.navigate(l);return}t.authMode="login",M("Registrasi showroom berhasil. Tunggu approval admin sebelum login.",{type:"success"})}catch(r){t.error=r.message||"Registrasi gagal.",M(t.error,{type:"error"})}finally{t.isSubmitting=!1,P(n,e,t)}}function Da(a){return!a||typeof a!="string"||!a.startsWith("/")?"":a}function An(a){return a==="seller"?"seller@projectb.local":a==="admin"?"admin@projectb.local":a==="affiliate_admin"?"affiliate@projectb.local":"buyer@projectb.local"}function Cn(a){return a==="seller"?"seller-baru@projectb.local":"buyer-baru@projectb.local"}function Nn(a){return a==="seller"?"Daftar showroom":"Daftar buyer"}var S=`${/^(.*\/assets\/(?:v-[^/]+\/)?)/.exec(import.meta.url)?.[1]??""}images/landing/`,C=Object.freeze({nav:{logoTeal:`${S}logo-carlynk-teal.webp`,logoPutih:`${S}logo-carlynk-putih.webp`,daftar:"Daftar",masuk:"Masuk"},hero:{judul:"Bikin Showroom Digital Profesional *Dalam Hitungan Menit*",deskripsi:"Kelola katalog, jangkau pembeli nasional serta terima DP otomatis dalam satu platform terpadu.",gambar:`${S}hero-showroom-digital.webp`,alt:"Katalog mobil showroom tampil di layar ponsel",tombolUtama:"Buat Showroom Sekarang",tombolKedua:"Demo Gratis"},masalah:{judul:"*Masih Mengandalkan* Jualan Mobil Hanya Lewat Media Sosial & Brosur?",subjudul:"Hambatan utama dalam meningkatkan omzet penjualan di era digital",latar:`${S}bg-showroom-teal.jpg`,slides:[[{teks:"Calon pembeli sering *bingung mencari stok* mobil yang masih ready karena *postingan tertimbun*.",gambar:`${S}masalah-bingung-cari-stok.webp`,alt:"Pembeli kebingungan mencari stok mobil"},{teks:"Harus *membalas chat satu per satu* untuk menanyakan spesifikasi, harga, atau kondisi unit.",gambar:`${S}masalah-balas-chat.webp`,alt:"Penjual membalas chat satu per satu"}]]},fitur:{judul:"Semua Fitur yang Dibutuhkan Showroom Mobil Anda Ada di Carlynk",slides:[[{ikon:`${S}ikon-katalog.webp`,judul:"Katalog Digital Interaktif & Real-Time",deskripsi:"Upload foto HD, detail spesifikasi, jarak tempuh (KM), status unit (Ready/Sold/Booked) dengan mudah."},{ikon:`${S}ikon-pembayaran.webp`,judul:"Sistem Pembayaran & DP Otomatis",deskripsi:"Terima pembayaran DP/Tanda Jadi secara aman menggunakan Payment Gateway."}]]},kenapa:{judul:"Kenapa Harus Carlynk?",gambar:`${S}kenapa-carlynk-orang.webp`,alt:"Pemilik showroom menunjukkan halaman Carlynk di ponsel",poin:[{judul:"Tanpa Perlu Coding / Keahlian IT",deskripsi:"Siapa pun bisa mengoperasikannya, upload unit semudah bikin status di media sosial."},{judul:"Website Mobile-Friendly",deskripsi:"Didesain khusus agar nyaman dibuka di HP pembeli dengan koneksi apa saja."},{judul:"Transaksi Transparan",deskripsi:"Meningkatkan kepercayaan (trust rate) pembeli luar kota untuk bertransaksi."}]},testimoni:{judul:"Review Jujur Pengguna Carlynk",bintang:5,slides:[[{kutipan:"Dulu sering kehilangan pembeli luar kota karena ragu mau DP. Sekarang pakai Carlynk, showroom kelihatan jauh lebih profesional dan closing DP jadi lebih cepat.",nama:"Randy Utama",jabatan:"Owner AutoMobil, Jakarta",foto:`${S}testimoni-randy-utama.jpg`},{kutipan:"Manajemen stok jadi rapi banget. Pembeli tinggal saya kasih link website, langsung bisa pilih unit, cek harga, dan langsung WhatsApp unit yang ditaksir.",nama:"Ridwan Widada",jabatan:"Owner GibranAuto, Solo",foto:`${S}testimoni-ridwan-widada.jpg`}]]},partner:{label:"Our Partner",latar:`${S}bg-partner.jpg`,logo:[{nama:"KT88 Cars",gambar:`${S}partner-kt88cars.webp`},{nama:"Garasi.id",gambar:`${S}partner-garasi-id.webp`},{nama:"Kacunk Motor",gambar:""}]},penutup:{judul:"Siap Bikin Showroom Mobil Anda *Naik Kelas* dan *Jual Lebih Banyak* Unit?",deskripsi:"Bergabunglah dengan puluhan showroom digital lainnya di seluruh Indonesia sekarang.",tombolUtama:"Buat Showroom Sekarang",tombolKedua:"Chat Konsultasi"},footer:{latar:`${S}bg-footer.jpg`,kolom:[[{label:"Tentang Carlynk",kunci:"tentang"},{label:"Fitur",kunci:"fitur"},{label:"Harga",kunci:"harga"}],[{label:"Demo Showroom",kunci:"demo"},{label:"Syarat & Ketentuan",kunci:"syarat"},{label:"Kebijakan Privasi",kunci:"privasi"}]],sosial:[{label:"Facebook",ikon:"facebook",kunci:"facebook"},{label:"Instagram",ikon:"instagram",kunci:"instagram"},{label:"WhatsApp",ikon:"whatsapp",kunci:"konsultasi"}],hakCipta:"Copyright \xA9 2026 Carlynk"}});function Ue(a="",e=""){let t=a||"#";return Object.freeze({daftar:"#/daftar-showroom",masuk:e||"#/login/seller",demo:"#/contoh-katalog",konsultasi:t,tentang:t,fitur:"#fitur",harga:t,syarat:t,privasi:t,facebook:t,instagram:t})}function Ge({rute:a}){return[jn(a),$n(a),Bn(),Tn(),Rn(),Pn(),Dn(),On(a),Fn(a)].join("")}function jn({daftar:a,masuk:e}){let{logoTeal:t}=C.nav;return`
<header class="ck-nav" data-nav style="--ck-latar:url('${C.masalah.latar}')">
  ${Ln()}
  <div class="ck-lajur ck-nav__isi">
    <a href="#/" aria-label="Carlynk">
      <img class="ck-nav__logo" src="${t}" alt="Carlynk" width="1930" height="365">
    </a>
    <div class="ck-nav__aksi">
      <a class="ck-tombol ck-tombol--emas" href="${a}">${f(C.nav.daftar)}</a>
      <a class="ck-tombol ck-tombol--putih" href="${e}">${f(C.nav.masuk)}</a>
    </div>
  </div>
</header>`}function Ln(){return`
<div class="ck-nav__putih" aria-hidden="true"></div>
<svg class="ck-nav__lengkung" viewBox="0 0 308 318" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path d="M0 0 C12 110 85 315 308 318 H0 Z" fill="#ffffff"/>
</svg>`}function $n({daftar:a,demo:e}){let t=C.hero;return`
<section class="ck-hero">
  <div class="ck-lajur ck-hero__kisi">
    <div class="ck-hero__teks">
      <h1 data-reveal>${pa(t.judul)}</h1>
      <p class="ck-hero__deskripsi" data-reveal>${f(t.deskripsi)}</p>
      <div class="ck-hero__aksi" data-reveal>
        <a class="ck-tombol ck-tombol--emas" href="${a}">${f(t.tombolUtama)}</a>
        <a class="ck-tombol ck-tombol--abu" href="${e}">${f(t.tombolKedua)}</a>
      </div>
    </div>
    <img class="ck-hero__gambar" src="${t.gambar}" alt="${f(t.alt)}" width="894" height="745" fetchpriority="high">
  </div>
</section>`}function Bn(){let a=C.masalah,e=a.slides.map(t=>t.map(Mn).join("")).join("|");return`
<section class="ck-masalah" style="--ck-latar:url('${a.latar}')">
  <div class="ck-lajur">
    <h2 data-reveal>${pa(a.judul)}</h2>
    <p class="ck-masalah__subjudul" data-reveal>${f(a.subjudul)}</p>
    ${Oa({nama:"masalah",slides:e,gelap:!0})}
  </div>
</section>`}function Mn(a){return`
<article class="ck-masalah__kartu" data-reveal>
  <p>${Gn(a.teks)}</p>
  <img class="ck-masalah__foto" src="${a.gambar}" alt="${f(a.alt)}" loading="lazy">
</article>`}function Tn(){let a=C.fitur,e=a.slides.map(t=>t.map(zn).join("")).join("|");return`
<section class="ck-fitur" id="fitur">
  <div class="ck-lajur">
    <h2 data-reveal>${pa(a.judul)}</h2>
    ${Oa({nama:"fitur",slides:e,satuLajur:!0})}
  </div>
</section>`}function zn(a){return`
<article class="ck-fitur__kartu" data-reveal>
  <img class="ck-fitur__ikon" src="${a.ikon}" alt="" aria-hidden="true" loading="lazy" width="604" height="604">
  <div>
    <h3>${f(a.judul)}</h3>
    <p>${f(a.deskripsi)}</p>
  </div>
</article>`}function Rn(){let a=C.kenapa;return`
<section class="ck-kenapa">
  <div class="ck-kenapa__hias" aria-hidden="true">
    <div class="ck-kenapa__busur"></div>
    <div class="ck-kenapa__kotak"></div>
  </div>
  <div class="ck-lajur ck-kenapa__kisi">
    <div class="ck-kenapa__kiri">
      <h2 data-reveal>${f(a.judul)}</h2>
      <img class="ck-kenapa__foto" src="${a.gambar}" alt="${f(a.alt)}" loading="lazy" width="1000" height="1568">
    </div>
    <ul class="ck-kenapa__poin">
      ${a.poin.map(e=>`
      <li data-reveal>
        <h3>${f(e.judul)}</h3>
        <p>${f(e.deskripsi)}</p>
      </li>`).join("")}
    </ul>
  </div>
</section>`}function Pn(){let a=C.testimoni,e=a.slides.map(t=>t.map(In).join("")).join("|");return`
<section class="ck-testimoni">
  ${Kn()}
  <div class="ck-lajur">
    <h2 data-reveal>${f(a.judul)}</h2>
    <div class="ck-testimoni__bintang" data-reveal aria-label="${a.bintang} dari 5">
      ${Array.from({length:a.bintang},Un).join("")}
    </div>
    ${Oa({nama:"testimoni",slides:e,berpanah:!0})}
  </div>
</section>`}function In(a){return`
<figure class="ck-testimoni__kartu" data-reveal>
  <img class="ck-testimoni__foto" src="${a.foto}" alt="${f(a.nama)}" loading="lazy" width="310" height="310">
  <blockquote class="ck-testimoni__kutipan">&ldquo;${f(a.kutipan)}&rdquo;</blockquote>
  <figcaption>
    <div class="ck-testimoni__nama">${f(a.nama)}</div>
    <div class="ck-testimoni__jabatan">${f(a.jabatan)}</div>
  </figcaption>
</figure>`}function Dn(){let a=C.partner;return`
<section class="ck-partner" style="--ck-latar:url('${a.latar}')">
  <div class="ck-lajur">
    <div class="ck-partner__label">${f(a.label)}</div>
    <div class="ck-partner__daftar" data-reveal>
      ${a.logo.map(e=>e.gambar?`<img src="${e.gambar}" alt="${f(e.nama)}" loading="lazy">`:`<div class="ck-partner__teks">${f(e.nama).replace(" ","<br>")}</div>`).join("")}
    </div>
  </div>
</section>`}function On({daftar:a,konsultasi:e}){let t=C.penutup;return`
<section class="ck-penutup">
  <div class="ck-lajur">
    <h2 data-reveal>${pa(t.judul)}</h2>
    <p data-reveal>${f(t.deskripsi)}</p>
    <div class="ck-penutup__aksi" data-reveal>
      <a class="ck-tombol ck-tombol--emas" href="${a}">${f(t.tombolUtama)}</a>
      <a class="ck-tombol ck-tombol--teal" href="${e}">${qe("whatsapp")}${f(t.tombolKedua)}</a>
    </div>
  </div>
</section>`}function Fn(a){let e=C.footer;return`
<footer class="ck-footer" style="--ck-latar:url('${e.latar}')">
  <div class="ck-lajur ck-footer__kisi">
    <div>
      <img class="ck-footer__logo" src="${C.nav.logoPutih}" alt="Carlynk" loading="lazy" width="1412" height="267">
    </div>
    ${e.kolom.map(t=>`
    <nav class="ck-footer__kolom">
      ${t.map(n=>`<a href="${a[n.kunci]??"#"}">${f(n.label)}</a>`).join("")}
    </nav>`).join("")}
    <div>
      <div class="ck-footer__sosial">
        ${e.sosial.map(t=>`
        <a href="${a[t.kunci]??"#"}" aria-label="${f(t.label)}" rel="noopener">${qe(t.ikon)}</a>`).join("")}
      </div>
      <div class="ck-footer__hak">${f(e.hakCipta)}</div>
    </div>
  </div>
</footer>`}function Oa({nama:a,slides:e,gelap:t=!1,berpanah:n=!1,satuLajur:r=!1}){let o=e.split("|").filter(Boolean),i=o.length>1,s=["ck-korsel",t?"ck-korsel--gelap":"",i&&n?"ck-korsel--berpanah":""].filter(Boolean).join(" "),l=r?' style="grid-template-columns:1fr"':"";return`
<div class="${s}" data-korsel="${a}">
  ${i&&n?Ke("kiri"):""}
  <div class="ck-korsel__bingkai">
    <div class="ck-korsel__rel" data-korsel-rel>
      ${o.map(c=>`<div class="ck-korsel__slide"${l}>${c}</div>`).join("")}
    </div>
  </div>
  ${i&&n?Ke("kanan"):""}
  ${i?Hn(o.length):""}
</div>`}function Hn(a){return`
<div class="ck-korsel__titik" role="tablist">
  ${Array.from({length:a},(e,t)=>`
  <button type="button" role="tab" data-korsel-titik="${t}"
          aria-label="Slide ${t+1}" aria-current="${t===0}"></button>`).join("")}
</div>`}function Ke(a){return`
<button type="button" class="ck-korsel__panah ck-korsel__panah--${a}"
        data-korsel-panah="${a}" aria-label="${a==="kiri"?"Sebelumnya":"Berikutnya"}">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="${a==="kiri"?"M10 3 L4 8 L10 13":"M6 3 L12 8 L6 13"}" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>`}function Un(){return`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2 6 20.5l1.3-6.7-5-4.6 6.8-.8z"/>
</svg>`}function Kn(){let a="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2 6 20.5l1.3-6.7-5-4.6 6.8-.8z";return`
<div class="ck-testimoni__latar" aria-hidden="true">
  <svg viewBox="0 0 24 24" style="right:-6%;top:6%;width:min(34vw,420px)"><path d="${a}"/></svg>
  <svg viewBox="0 0 24 24" style="left:-8%;bottom:-6%;width:min(26vw,320px)"><path d="${a}"/></svg>
</div>`}function qe(a){return`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${{facebook:"M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8z",instagram:"M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23C21.8 8.4 21.8 8.8 21.8 12s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.07-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2m0 2.15c-3.14 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.6-.07 4.78s.01 3.54.07 4.78c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-4.78s-.01-3.54-.07-4.78c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.6-.07-4.74-.07m0 3.65a5.99 5.99 0 1 1 0 11.98 5.99 5.99 0 0 1 0-11.98m0 2.15a3.84 3.84 0 1 0 0 7.68 3.84 3.84 0 0 0 0-7.68m6.24-3.87a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8",whatsapp:"M12.04 2.2a9.7 9.7 0 0 0-8.3 14.7L2.2 22l5.25-1.37A9.7 9.7 0 1 0 12.04 2.2m0 1.77a7.93 7.93 0 1 1-4.03 14.76l-.29-.17-3.1.81.83-3.03-.19-.3A7.93 7.93 0 0 1 12.04 3.97m-3.6 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.76 2.8 4.32 3.8 2.13.84 2.56.67 3.02.63.46-.04 1.5-.61 1.71-1.2.21-.6.21-1.1.15-1.2-.06-.11-.23-.17-.48-.29-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.12-.17.25-.65.82-.8.99-.14.17-.29.19-.54.06-.25-.12-1.07-.39-2.04-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.29.38-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.36-.77-1.86-.2-.49-.4-.42-.55-.43z"}[a]??""}"/></svg>`}function pa(a){return f(a).replace(/\*([^*]+)\*/g,(e,t)=>`<span class="ck-emas">${t}</span>`)}function Gn(a){return f(a).replace(/\*([^*]+)\*/g,(e,t)=>`<b>${t}</b>`)}function f(a){return String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Je(a){let e=Array.from(a.querySelectorAll("[data-korsel]")).map(qn).filter(Boolean);return()=>e.splice(0).forEach(t=>t())}function qn(a){let e=a.querySelector("[data-korsel-rel]"),t=e?Array.from(e.children):[];if(!e||t.length<2)return null;let n=Array.from(a.querySelectorAll("[data-korsel-titik]")),r=Array.from(a.querySelectorAll("[data-korsel-panah]")),o=0,i=c=>{o=(c+t.length)%t.length,e.style.transform=`translateX(-${o*100}%)`,n.forEach((d,u)=>d.setAttribute("aria-current",String(u===o))),t.forEach((d,u)=>d.setAttribute("aria-hidden",String(u!==o)))},s=[];n.forEach((c,d)=>{let u=()=>i(d);c.addEventListener("click",u),s.push(()=>c.removeEventListener("click",u))}),r.forEach(c=>{let d=c.dataset.korselPanah==="kiri"?-1:1,u=()=>i(o+d);c.addEventListener("click",u),s.push(()=>c.removeEventListener("click",u))});let l=c=>{if(c.key==="ArrowLeft")i(o-1);else if(c.key==="ArrowRight")i(o+1);else return;c.preventDefault()};return a.addEventListener("keydown",l),s.push(()=>a.removeEventListener("keydown",l)),s.push(Jn(a,{maju:()=>i(o+1),mundur:()=>i(o-1),posisi:()=>o,rel:e,jumlah:t.length})),i(0),()=>s.splice(0).forEach(c=>c())}function Jn(a,{maju:e,mundur:t,posisi:n,rel:r,jumlah:o}){let i=0,s=0,l=!1,c=null,d=g=>{g.isPrimary&&(l=!0,c=null,i=g.clientX,s=g.clientY)},u=g=>{if(!l)return;let b=g.clientX-i,_=g.clientY-s;if(c===null){if(Math.abs(b)<5&&Math.abs(_)<5)return;c=Math.abs(b)>Math.abs(_),c&&(a.setPointerCapture?.(g.pointerId),r.style.transition="none")}if(!c)return;let x=n()===0&&b>0||n()===o-1&&b<0?b*.32:b;r.style.transform=`translateX(calc(-${n()*100}% + ${x}px))`},p=g=>{if(!l||(l=!1,r.style.transition="",!c))return;a.releasePointerCapture?.(g.pointerId);let b=g.clientX-i;b<=-48?e():b>=48?t():r.style.transform=`translateX(-${n()*100}%)`};return a.addEventListener("pointerdown",d),a.addEventListener("pointermove",u),a.addEventListener("pointerup",p),a.addEventListener("pointercancel",p),()=>{a.removeEventListener("pointerdown",d),a.removeEventListener("pointermove",u),a.removeEventListener("pointerup",p),a.removeEventListener("pointercancel",p)}}function We(a){let e=[Wn(a),Yn(a),Je(a),Xn(a)];return()=>e.splice(0).forEach(t=>t?.())}function Wn(a){let e=Array.from(a.querySelectorAll("[data-reveal]"));if(!e.length)return()=>{};if(typeof IntersectionObserver!="function")return e.forEach(n=>n.classList.add("ck-tampil")),()=>{};let t=new IntersectionObserver(n=>{n.forEach(r=>{r.isIntersecting&&(r.target.style.transitionDelay=`${Math.min(Vn(r.target),4)*70}ms`,r.target.classList.add("ck-tampil"),t.unobserve(r.target))})},{threshold:.12,rootMargin:"0px 0px -8% 0px"});return e.forEach(n=>t.observe(n)),()=>t.disconnect()}function Vn(a){return Array.from(a.parentElement?.children??[]).indexOf(a)}function Yn(a){let e=a.querySelector("[data-nav]");if(!e)return()=>{};let t=!1,n=()=>{t=!1,e.classList.toggle("ck-nav--kecil",window.scrollY>40)},r=()=>{t||(t=!0,requestAnimationFrame(n))};return n(),window.addEventListener("scroll",r,{passive:!0}),()=>window.removeEventListener("scroll",r)}function Xn(a){let e=t=>{let r=t.target.closest?.('a[href^="#"]')?.getAttribute("href").slice(1);if(!r||r.startsWith("/"))return;let o=a.querySelector(`#${CSS.escape(r)}`);o&&(t.preventDefault(),o.scrollIntoView({behavior:"smooth",block:"start"}))};return a.addEventListener("click",e),()=>a.removeEventListener("click",e)}var K="carlynk-landing-active",Ve="carlynk_landing_style",Ye="carlynk_landing_font",Xe="carlynk_landing_font_preconnect",Zn="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap",Qn=["https://fonts.googleapis.com","https://fonts.gstatic.com"],ar=`
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
html.${K}{scroll-behavior:smooth}
body.${K}{background:#f3fafc;overflow-x:clip}

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
`;function Ze(){if(!document.getElementById(Ve)){let a=document.createElement("style");a.id=Ve,a.textContent=ar,document.head.append(a)}if(document.getElementById(Xe)||Qn.forEach((a,e)=>{let t=document.createElement("link");e===0&&(t.id=Xe),t.rel="preconnect",t.href=a,t.crossOrigin="anonymous",document.head.append(t)}),!document.getElementById(Ye)){let a=document.createElement("link");a.id=Ye,a.rel="stylesheet",a.href=Zn,document.head.append(a)}document.documentElement.classList.add(K),document.body.classList.add(K)}function Qe(){document.documentElement.classList.remove(K),document.body.classList.remove(K)}function at(){let a=null,e=null,t=null,n=null;return R({mount(){return a=document.createElement("div"),a.id="carlynk_landing_root",a.className="relative w-full",a.innerHTML=Ge({rute:Ue(tr(),er())}),Ze(),r(),a},bindEvents(){!a||e||(e=We(a))},unmount(){e?.(),e=null},dispose(){e?.(),e=null,Qe(),o(),a=null}});function r(){t=document.querySelector("#app header"),t&&(n=t.style.display,t.style.display="none")}function o(){t&&(t.style.display=n??"",t=null,n=null)}}function er(){let a=Ga("seller");return a&&a!==qa()?`${window.location.protocol}//${a}/login/seller`:""}function tr(){let a=String(O.contact?.whatsapp??"").replace(/\D/g,"").replace(/^0/,"62");return a?`https://wa.me/${a}`:""}var I=Object.freeze({daftar:"/daftar-showroom",masuk:"/login/seller"});function tt({namaMerek:a,tagline:e,tautanWhatsapp:t,alamatEtalase:n,logoUrl:r=""}){let o=G(a),i=et(r,o,24,18),s=et(r,o,22,17);return`
<div style="position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(70% 55% at 18% 8%,rgba(30,129,176,.10),transparent 62%),radial-gradient(60% 50% at 88% 22%,rgba(234,182,118,.12),transparent 60%),linear-gradient(180deg,#ffffff,#fdfdfc 55%,#fbfaf8)"></div>

<div style="position:relative;z-index:2">

<div style="position:sticky;top:0;z-index:60;backdrop-filter:blur(18px);background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.5));border-bottom:1px solid rgba(28,25,23,.06)">
  <div style="max-width:1180px;margin:0 auto;padding:15px 24px;display:flex;align-items:center;gap:36px">
    <div style="display:flex;align-items:center;gap:11px">
      ${i}
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
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Alamat khusus <span style="font-family:'JetBrains Mono',monospace;color:#17698f">${G(n)}</span></span></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Logo, foto lokasi, jam operasional, dan peta</span></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#1e81b0;flex:none"></span><span style="font-size:12.9px;color:#1c1917;line-height:1.55">Tombol WhatsApp dan telepon langsung ke sales</span></div>
      </div>
    </div>

    <div data-reveal="" data-tilt="" style="position:relative;transition:transform .5s cubic-bezier(.22,.9,.28,1)">
      <div style="position:absolute;inset:-40px;background:radial-gradient(60% 60% at 50% 45%,rgba(30,129,176,.16),transparent 70%);filter:blur(20px);pointer-events:none"></div>
      <div style="position:relative;border:1px solid rgba(28,25,23,.12);border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 40px 90px rgba(28,25,23,.14)">
        <div style="display:flex;align-items:center;gap:9px;padding:11px 14px;background:#faf4ed;border-bottom:1px solid rgba(28,25,23,.07)">
          <span style="width:9px;height:9px;border-radius:50%;background:#d8c9b4"></span><span style="width:9px;height:9px;border-radius:50%;background:#d8c9b4"></span><span style="width:9px;height:9px;border-radius:50%;background:#d8c9b4"></span>
          <div style="margin-left:8px;flex:1;background:#f5ece1;border-radius:6px;padding:5px 11px;font-family:'JetBrains Mono',monospace;font-size:9.1px;color:#1c1917;display:flex"><span data-type="${G(n.replace("showroom-anda","auto-prima-motor"))}"></span><span style="width:6px;background:#1e81b0;margin-left:2px;animation:caret 1s step-end infinite"></span></div>
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
      <p style="color:#1c1917;font-size:11.6px;line-height:1.6;margin:0;max-width:30ch">${G(e)}</p>
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
      ${t?`<a href="${G(t)}" target="_blank" rel="noopener noreferrer" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">WhatsApp bisnis</a>`:`<a href="${I.masuk}" style="color:#1c1917;font-size:12px" style-hover="color:#1e81b0">Masuk ke dashboard</a>`}
    </div>
  </div>
  <div style="max-width:1180px;margin:0 auto;padding:0 24px 40px;border-top:1px solid rgba(28,25,23,.05)">
    <div style="padding-top:22px;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;font-size:10.8px;color:#1c1917">
      <span>&copy; ${new Date().getFullYear()} ${o}</span><span>Syarat layanan &middot; Kebijakan privasi</span>
    </div>
  </div>
</div>

</div>
`}function et(a,e,t,n){let r=String(a||"").trim();return r!==""?`<img data-logo="" src="${G(r)}" alt="${e}" style="height:${t+8}px;width:auto;max-width:190px;object-fit:contain;display:block;transition:transform .5s cubic-bezier(.22,.9,.28,1)">`:`<div data-logo="" style="width:${t}px;height:${t}px;border-radius:7px;background:linear-gradient(135deg,#1e81b0,#eab676);box-shadow:0 0 20px rgba(30,129,176,.5);transition:transform .5s cubic-bezier(.22,.9,.28,1)"></div><span style="font-family:Sora,sans-serif;font-weight:700;font-size:${n}px;letter-spacing:-.03em">${e}</span>`}function G(a){return String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var nr=Object.freeze(["halaman","listing","marketing"]);function nt(a){let e=[],t=r=>Array.from(a.querySelectorAll(r)),n=r=>a.querySelector(r);return e.push(rr(t)),e.push(ir(t)),e.push(sr(t)),e.push(lr(t)),e.push(pr(n,t)),e.push(cr(t)),e.push(ur(a)),()=>e.splice(0).forEach(r=>r())}function rr(a){let e=[];return a("[data-word]").forEach((t,n)=>{t.style.display="inline-block",t.style.opacity="0",t.style.filter="blur(10px)",t.style.transform="translateY(28px) rotateX(-40deg)",t.style.transition="opacity .8s cubic-bezier(.22,.9,.28,1), transform .9s cubic-bezier(.22,.9,.28,1), filter .8s ease",t.style.transitionDelay=`${200+n*75}ms`,e.push(setTimeout(()=>{t.style.opacity="1",t.style.filter="none",t.style.transform="none"},60))}),()=>e.forEach(t=>clearTimeout(t))}function ir(a){let e=a("[data-reveal]"),t=[];if(!e.length)return()=>{};e.forEach((r,o)=>{r.style.opacity="0",r.style.transform="translateY(26px)",r.style.transition="opacity .9s cubic-bezier(.22,.9,.28,1), transform .9s cubic-bezier(.22,.9,.28,1)",r.style.transitionDelay=`${Math.min(o,4)*80}ms`});let n=new IntersectionObserver(r=>{r.forEach(o=>{if(!o.isIntersecting)return;let i=o.target;i.style.opacity="1",i.style.transform="none",i.querySelectorAll("[data-bar]").forEach((c,d)=>{c.style.animation=`barGrow .85s cubic-bezier(.22,.9,.28,1) ${d*110}ms both`}),i.querySelectorAll("[data-lead]").forEach((c,d)=>{t.push(setTimeout(()=>{c.style.opacity="1",c.style.transform="none"},300+d*420))}),i.querySelectorAll("[data-pop]").forEach((c,d)=>{c.style.opacity="0",c.style.transform="translateY(14px) scale(.96)",t.push(setTimeout(()=>{c.style.opacity="1",c.style.transform="none"},260+d*130))});let s=i.querySelector("[data-type]");s&&or(s,t);let l=i.querySelector("[data-status]");l&&t.push(setTimeout(()=>{l.textContent="Tayang",l.style.color="#15803d",l.style.background="rgba(21,128,61,.12)"},1600)),i.querySelectorAll("[data-row]").forEach((c,d)=>{c.style.opacity="0",c.style.transform="translateX(-14px)",c.style.transition=`opacity .5s ease ${d*90}ms, transform .5s cubic-bezier(.22,.9,.28,1) ${d*90}ms, background .25s`,requestAnimationFrame(()=>{c.style.opacity="1",c.style.transform="none"})}),n.unobserve(i)})},{threshold:.14,rootMargin:"0px 0px -6% 0px"});return e.forEach(r=>n.observe(r)),()=>{n.disconnect(),t.forEach(r=>clearTimeout(r))}}function or(a,e){let t=a.getAttribute("data-type")||"",n=0,r=()=>{a.textContent=t.slice(0,n++),n<=t.length&&e.push(setTimeout(r,42))};r()}function sr(a){let e=[];return a("[data-tilt]").forEach(t=>{let n=o=>{let i=t.getBoundingClientRect(),s=(o.clientX-i.left)/i.width-.5,l=(o.clientY-i.top)/i.height-.5;t.style.transform=`perspective(1000px) rotateY(${(s*6).toFixed(2)}deg) rotateX(${(-l*6).toFixed(2)}deg) translateY(-5px)`,t.style.transitionDuration=".12s"},r=()=>{t.style.transitionDuration=".5s",t.style.transform="none"};t.addEventListener("pointermove",n),t.addEventListener("pointerleave",r),e.push(()=>{t.removeEventListener("pointermove",n),t.removeEventListener("pointerleave",r)})}),()=>e.forEach(t=>t())}function lr(a){let e=[];return a("[data-magnet]").forEach(t=>{let n=o=>{let i=t.getBoundingClientRect(),s=(o.clientX-(i.left+i.width/2))*.22,l=(o.clientY-(i.top+i.height/2))*.3;t.style.transform=`translate(${s.toFixed(1)}px,${l.toFixed(1)}px)`},r=()=>{t.style.transform="none"};t.addEventListener("pointermove",n),t.addEventListener("pointerleave",r),e.push(()=>{t.removeEventListener("pointermove",n),t.removeEventListener("pointerleave",r)})}),()=>e.forEach(t=>t())}function cr(a){let e=[];return a("[style-hover]").forEach(t=>{let n=dr(t.getAttribute("style-hover"));if(!n.length)return;let r=null,o=()=>{r=n.map(([s])=>[s,t.style.getPropertyValue(s)]),n.forEach(([s,l])=>t.style.setProperty(s,l))},i=()=>{(r||[]).forEach(([s,l])=>{l?t.style.setProperty(s,l):t.style.removeProperty(s)}),r=null};t.addEventListener("pointerenter",o),t.addEventListener("pointerleave",i),e.push(()=>{t.removeEventListener("pointerenter",o),t.removeEventListener("pointerleave",i)})}),()=>e.forEach(t=>t())}function dr(a){return String(a||"").split(";").map(e=>e.trim()).filter(Boolean).map(e=>{let t=e.indexOf(":");return t===-1?null:[e.slice(0,t).trim(),e.slice(t+1).trim()]}).filter(Boolean)}function pr(a,e){let t=a("[data-progress]"),n=a("[data-scrollhint]"),r=e("[data-navlink]"),o=!1,i=()=>{o||(o=!0,requestAnimationFrame(()=>{o=!1;let s=window.scrollY,l=Math.max(document.body.scrollHeight-window.innerHeight,1),c=Math.min(s/l,1);t&&(t.style.width=`${(c*100).toFixed(2)}%`),n&&(n.style.opacity=s>120?"0":"1");let d=-1;nr.forEach((u,p)=>{let g=document.getElementById(`saas_landing_${u}`);g&&g.getBoundingClientRect().top<window.innerHeight*.45&&(d=p)}),r.forEach((u,p)=>{u.style.color=p===d?"#17698F":"rgba(28,25,23,.62)"})}))};return window.addEventListener("scroll",i,{passive:!0}),i(),()=>window.removeEventListener("scroll",i)}function ur(a){let e=t=>{let n=t.target.closest("[data-scroll]");!n||!a.contains(n)||(t.preventDefault(),mr(n.getAttribute("data-scroll")))};return a.addEventListener("click",e),()=>a.removeEventListener("click",e)}function mr(a){let e=document.getElementById(`saas_landing_${a}`);e&&e.scrollIntoView({behavior:document.hidden?"instant":"smooth",block:"start"})}var q="saas-landing-active",rt="saas_landing_style",it="saas_landing_font",ot="saas_landing_font_preconnect",gr="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap",fr=["https://fonts.googleapis.com","https://fonts.gstatic.com"],br=`
#saas_landing_root, #saas_landing_root *{box-sizing:border-box}
html.${q}{scroll-behavior:smooth}
body.${q}{background:#fdfdfc;overflow-x:clip}
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
`;function st(){if(!document.getElementById(rt)){let a=document.createElement("style");a.id=rt,a.textContent=br,document.head.append(a)}if(document.getElementById(ot)||fr.forEach((a,e)=>{let t=document.createElement("link");e===0&&(t.id=ot),t.rel="preconnect",t.href=a,t.crossOrigin="anonymous",document.head.append(t)}),!document.getElementById(it)){let a=document.createElement("link");a.id=it,a.rel="stylesheet",a.href=gr,document.head.append(a)}document.documentElement.classList.add(q),document.body.classList.add(q)}function lt(){document.documentElement.classList.remove(q),document.body.classList.remove(q)}function ct(){let a=null,e=null,t=null,n=null;return R({mount(){return a=document.createElement("div"),a.id="saas_landing_root",a.className="relative w-full",a.style.background="#FDFDFC",a.innerHTML=tt({namaMerek:O.appName,tagline:O.appTagline,tautanWhatsapp:hr(),alamatEtalase:xr(),logoUrl:oe(O.uploadedLogoUrl)}),st(),r(),a},bindEvents(){!a||e||(e=nt(a))},unmount(){e?.(),e=null},dispose(){e?.(),e=null,lt(),o(),a=null}});function r(){t=document.querySelector("#app header"),t&&(n=t.style.display,t.style.display="none")}function o(){t&&(t.style.display=n??"",t=null,n=null)}}function hr(){let a=String(O.contact?.whatsapp??"").replace(/\D/g,"").replace(/^0/,"62");return a?`https://wa.me/${a}`:""}var kr="carlynk.id";function xr(){return`${kr}/s/showroom-anda`}var dt="public.carlynk-landing",Fa=Object.freeze([{name:"public.carlynk-landing",label:"Landing Carlynk",path:"/carlynk-landing",description:"Halaman marketing Carlynk mengikuti berkas desain, menyasar pemilik showroom.",page:at},{name:"public.saas-landing",label:"Landing SaaS Jual Beli Mobil",path:"/saas-landing",description:"Halaman marketing SaaS untuk showroom, marketing, dan buyer.",page:ct},{name:"public.catalog-alias",label:"Katalog Mobil Publik",path:"/public",description:"Halaman katalog mobil lama yang tetap tersedia di #/public.",page:Ne},{name:"public.auth-landing",label:"Login / Register",path:"/auth",description:"Halaman autentikasi publik untuk buyer, showroom, admin, dan marketing.",page:He}]);function Lo(){return Fa.map(({name:a,label:e,path:t,description:n})=>({name:a,label:e,path:t,description:n}))}function yr(a=""){return Fa.find(e=>e.name===a)??Fa.find(e=>e.name===dt)}function $o(){let a=m.get("working.adminWebConfig.config.data",null),e=m.get("snapshot.admin.webConfig.data",null),t=Ie(),n=a?.landing_page_route_name??e?.landing_page_route_name??t?.landingPage?.routeName??t?.landing_page_route_name??"";return yr(n)?.name??dt}export{jr as a,ra as b,oe as c,Pr as d,Ir as e,ia as f,ce as g,me as h,fe as i,h as j,he as k,Ne as l,He as m,at as n,ct as o,Lo as p,yr as q,$o as r};
