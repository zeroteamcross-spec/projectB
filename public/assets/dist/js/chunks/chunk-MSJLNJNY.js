import{b as c,d as q,g as v,j as z}from"./chunk-KJYLVAL2.js";import{b as L}from"./chunk-WVHJATZP.js";var C={async snapshot(t={},o={}){let e=await L.get(`/notifications/snapshot${q(t)}`,o);return{unread_count:e.data?.unread_count??0,items:e.data?.items??[]}},async list(t={},o={}){let e=await L.get(`/notifications${q(t)}`,o);return{items:e.data?.items??[],next_cursor:e.data?.next_cursor??null,unread_count:e.data?.unread_count??0}},async markRead(t,o={}){let e=await L.post(`/notifications/${encodeURIComponent(t)}/read`,{},o);return{id:e.data?.id??t,is_read:!!e.data?.is_read,read_at:e.data?.read_at??null,unread_count:e.data?.unread_count??0}},async markAllRead(t={}){let o=await L.post("/notifications/read-all",{},t);return{updated_count:o.data?.updated_count??0,unread_count:o.data?.unread_count??0}}};var Z="modules.notifications",at=5,g=Object.freeze({unreadCount:0,items:[],workingItems:[],nextCursor:null,activeFilter:"all",isHydrated:!1,isLoading:!1,isMarkingAllRead:!1,markingIds:{},error:null,lastSyncedAt:null,lastMutationAt:null}),u={get(){return Rt(),c.get(Z,R())},snapshot(){let t=this.get();return{unreadCount:t.unreadCount??0,items:t.items??[],isHydrated:!!t.isHydrated,isLoading:!!t.isLoading,error:t.error??null}},working(){let t=this.get();return{unreadCount:t.unreadCount??0,workingItems:t.workingItems??[],nextCursor:t.nextCursor??null,activeFilter:t.activeFilter??"all",isLoading:!!t.isLoading,isMarkingAllRead:!!t.isMarkingAllRead,markingIds:t.markingIds??{},error:t.error??null}},setSnapshot(t={}){let o=this.get(),e=lt(o),n=pt(W(t.items).slice(0,at),o,e);return b({...o,unreadCount:ut(t,o,e),items:n,isHydrated:!0,isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:snapshot-set"),this.snapshot()},hydrate(t={},{append:o=!1,filter:e=null}={}){let n=this.get(),i=lt(n),r=W(t.items),a=o?Q(n.workingItems??[],r):r,s=pt(a,n,i);return b({...n,unreadCount:ut(t,n,i),workingItems:s,nextCursor:t.next_cursor??t.nextCursor??null,activeFilter:e??n.activeFilter??"all",isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:hydrate"),this.working()},async loadList(t={},o={}){let e=tt(t.status??this.get().activeFilter??"all"),n=t.cursor??null;this.setLoading(!0);try{let i=await C.list({...t,status:e},o);return this.hydrate(i,{append:!!n,filter:e})}catch(i){throw this.setError(i),i}},setLoading(t){b({...this.get(),isLoading:!!t},"notifications:loading")},setError(t){b({...this.get(),isLoading:!1,isMarkingAllRead:!1,error:Bt(t)},"notifications:error")},applyMarkRead(t,o=P()){let e=this.get(),n=String(t),i=ct(e.items,n)||ct(e.workingItems,n);b({...e,unreadCount:i?Math.max(0,Number(e.unreadCount??0)-1):Number(e.unreadCount??0),items:H(e.items,n,o),workingItems:H(e.workingItems,n,o),markingIds:{...e.markingIds??{},[n]:!0},error:null,lastMutationAt:Date.now()},"notifications:mark-read-optimistic")},completeMarkRead(t,o={}){let e=this.get(),n=String(t),i={...e.markingIds??{}};delete i[n];let r=o.read_at??o.readAt??P();return b({...e,unreadCount:X(o.unread_count,o.unreadCount,e.unreadCount,0),items:H(e.items,n,r),workingItems:H(e.workingItems,n,r),markingIds:i,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-read-complete"),this.get()},async markRead(t,o={}){let e=String(t??"");if(!e)return this.get();let n=this.get();if(zt(n,e)?.isRead)return n;this.applyMarkRead(e);try{let r=await C.markRead(e,o);return this.completeMarkRead(e,r)}catch(r){throw this.restore(n,"notifications:mark-read-rollback"),this.setError(r),r}},applyMarkAllRead(t=P()){let o=this.get();b({...o,unreadCount:0,items:J(o.items,t),workingItems:J(o.workingItems,t),isMarkingAllRead:!0,markingIds:{},error:null,lastMutationAt:Date.now()},"notifications:mark-all-optimistic")},completeMarkAllRead(t={}){let o=this.get();return b({...o,unreadCount:X(t.unread_count,t.unreadCount,0),isMarkingAllRead:!1,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-all-complete"),this.get()},async markAllRead(t={}){let o=this.get();this.applyMarkAllRead();try{let e=await C.markAllRead(t);return this.completeMarkAllRead(e)}catch(e){throw this.restore(o,"notifications:mark-all-rollback"),this.setError(e),e}},restore(t,o="notifications:rollback"){b(t??R(),o)},pushNotification(t){let o=dt(t);if(!o.id)return this.get();let e=this.get(),n=st(e.items,o.id),i=st(e.workingItems,o.id),r=!n&&!i&&!o.isRead?1:0,a=Q([o],e.items??[]).slice(0,at),s=Lt(o,e.activeFilter)?Q([o],e.workingItems??[]):e.workingItems??[];return b({...e,unreadCount:Math.max(0,Number(e.unreadCount??0)+r),items:a,workingItems:s,error:null,lastSyncedAt:Date.now()},"notifications:push"),this.get()},reset(){b(R(),"notifications:reset")},subscribe(t){return c.subscribe((o,e)=>{t(o.modules?.notifications??R(),e)})}};function Rt(){c.get(Z,void 0)===void 0&&b(R(),"notifications:init")}function b(t,o){c.patchState(Z,Mt(t),o)}function R(){return{unreadCount:g.unreadCount,items:[],workingItems:[],nextCursor:g.nextCursor,activeFilter:g.activeFilter,isHydrated:g.isHydrated,isLoading:g.isLoading,isMarkingAllRead:g.isMarkingAllRead,markingIds:{},error:g.error,lastSyncedAt:g.lastSyncedAt,lastMutationAt:g.lastMutationAt}}function Mt(t={}){return{...R(),...t,unreadCount:Math.max(0,Number(t.unreadCount??0)),items:W(t.items),workingItems:W(t.workingItems),activeFilter:tt(t.activeFilter??"all"),markingIds:{...t.markingIds??{}}}}function W(t=[]){return(Array.isArray(t)?t:[]).map(dt).filter(o=>o.id!=="")}function dt(t={}){let o=t.id??t.notification_id??"",e=t.data??t.data_json??{};return{id:String(o),type:String(t.type??"system_message"),title:String(t.title??""),body:String(t.body??""),data:Pt(e)?e:{},linkUrl:t.linkUrl??t.link_url??null,iconKey:t.iconKey??t.icon_key??null,priority:t.priority??"normal",sourceType:t.sourceType??t.source_type??null,sourceId:t.sourceId??t.source_id??null,actorUserId:t.actorUserId??t.actor_user_id??null,isRead:!!(t.isRead??t.is_read??!1),readAt:t.readAt??t.read_at??null,createdAt:t.createdAt??t.created_at??null,expiresAt:t.expiresAt??t.expires_at??null}}function tt(t){return["all","unread","read"].includes(t)?t:"all"}function Lt(t,o="all"){let e=tt(o);return e==="unread"?!t.isRead:e==="read"?t.isRead:!0}function Q(t=[],o=[]){let e=new Set;return[...t,...o].filter(n=>{let i=String(n.id??"");return!i||e.has(i)?!1:(e.add(i),!0)})}function st(t=[],o){let e=String(o);return(t??[]).some(n=>String(n.id)===e)}function ct(t=[],o){let e=String(o);return(t??[]).some(n=>String(n.id)===e&&!n.isRead)}function zt(t,o){let e=String(o);return[...t.items??[],...t.workingItems??[]].find(n=>String(n.id)===e)??null}function H(t=[],o,e){let n=String(o);return(t??[]).map(i=>String(i.id)===n?{...i,isRead:!0,readAt:i.readAt??e}:i)}function J(t=[],o){return(t??[]).map(e=>({...e,isRead:!0,readAt:e.readAt??o}))}function lt(t={}){return!!(t.isMarkingAllRead||Object.keys(t.markingIds??{}).length)}function ut(t={},o={},e=!1){let n=X(t.unread_count,t.unreadCount,o.unreadCount,0);return e?Math.min(n,Number(o.unreadCount??0)):n}function pt(t=[],o={},e=!1){if(!e)return t;if(o.isMarkingAllRead)return J(t,P());let n=new Map;return[...o.items??[],...o.workingItems??[]].filter(i=>i?.isRead).forEach(i=>n.set(String(i.id),i.readAt??P())),t.map(i=>{let r=n.get(String(i.id));return r?{...i,isRead:!0,readAt:r}:i})}function X(...t){for(let o of t){let e=Number(o);if(Number.isFinite(e))return Math.max(0,e)}return 0}function Pt(t){return t!==null&&typeof t=="object"&&!Array.isArray(t)}function Bt(t){return t?.message??String(t||"Notifikasi gagal diproses.")}function P(){return new Date().toISOString()}var ft="projectB:buyer:showroom-url",Ot=/^#\/s\/[^/?#]+$/;function Tt(t){let o=String(t??"").trim();return o?`#/s/${encodeURIComponent(o)}`:""}function mt(t){if(t?.role!=="buyer")return"";let o=Tt(t.home_showroom_slug);if(!o||typeof window>"u")return o;try{window.localStorage?.setItem(ft,o)}catch{}return o}function bt(){if(typeof window>"u")return"";try{let t=String(window.localStorage?.getItem(ft)??"").trim();return Ot.test(t)?t:""}catch{return""}}var ae={setContext({user:t=null,actor:o=null,impersonation:e=null}={}){c.patchState("auth",{user:t,actor:o,impersonation:e,isAuthenticated:!!t,role:t?.role??"public"},"auth:set-context"),c.patchState("app.activeRole",t?.role??"public","auth:set-role"),mt(t)},setUser(t){this.setContext({user:t,actor:null,impersonation:null})},patchUser(t={}){let o=this.user();if(!t||typeof t!="object"||Array.isArray(t))return o;if(!o)return Object.keys(t).length?(this.setContext({user:t,actor:this.actor(),impersonation:this.impersonation()}),t):o;let e={...o,...t};return this.setContext({user:e,actor:this.actor(),impersonation:this.impersonation()}),e},user(){return c.get("auth.user",null)},actor(){return c.get("auth.actor",null)},impersonation(){return c.get("auth.impersonation",null)},role(){return c.get("auth.role","public")},isAuthenticated(){return c.get("auth.isAuthenticated",!1)}};var $t=45e3,F=45e3,B=null,Y="",O=null,T=c,ht=F,et=!1,w={setSnapshot(t={}){return u.setSnapshot(t)},async loadSnapshot(t={},o={}){let{store:e=c,...n}=o;u.setLoading(!0);try{let i=await C.snapshot(t,n);return Y=M(e.get?.("auth",null)),u.setSnapshot(i)}catch(i){throw u.setError(i),i}},async ensureSnapshot({force:t=!1,ttlMs:o=$t,store:e=c}={}){let n=e?.get?.("auth",null)??c.get("auth",null);if(!V(n))return u.snapshot();let i=M(n),r=u.get(),a=Number(r.lastSyncedAt??0),s=!!r.isHydrated&&Y===i&&a>0&&Date.now()-a<o;return!t&&s?u.snapshot():(B&&Y===i||(Y=i,B=this.loadSnapshot({},{store:e}).catch(d=>(u.setError(d),u.snapshot())).finally(()=>{B=null})),B)},hydrate(t={},o={}){return u.hydrate(t,o)},async loadList(t={},o={}){return u.loadList(t,o)},async markRead(t,o={}){return u.markRead(t,o)},async markAllRead(t={}){return u.markAllRead(t)},pushNotification(t){return u.pushNotification(t)},reset(){u.reset()},snapshot(){return u.snapshot()},working(){return u.working()},subscribe(t){return u.subscribe(t)},startPolling({intervalMs:t=F,store:o=c,immediate:e=!1}={}){return T=o??c,ht=Ft(t),et=!0,!K(T)||$()?(this.stopPolling({keepEnabled:!0}),!1):(O!==null||(O=window.setInterval(()=>{this.pollSnapshot({store:T})},ht),e&&this.pollSnapshot({store:T})),!0)},stopPolling({keepEnabled:t=!1}={}){O!==null&&(window.clearInterval(O),O=null),t||(et=!1)},restartPolling(t={}){return this.stopPolling(),this.startPolling(t)},pollSnapshot({store:t=T}={}){return!K(t)||$()?Promise.resolve(u.snapshot()):this.ensureSnapshot({force:!0,store:t})},bindVisibilityLifecycle({store:t=c,intervalMs:o=F}={}){if(typeof document>"u")return()=>{};let e=()=>{if($()){this.stopPolling({keepEnabled:!0});return}et&&K(t)&&this.startPolling({store:t,intervalMs:o,immediate:!0})};return document.addEventListener("visibilitychange",e),()=>document.removeEventListener("visibilitychange",e)},bindAuthReset(t){let o=M(t?.get("auth",null));return t?.subscribe?.(e=>{let n=M(e.auth);o!==n&&(o=n,u.reset())})??(()=>{})},bindAuthLifecycle(t=c){let o=M(t?.get("auth",null));return t?.subscribe?.(e=>{let n=M(e.auth);o!==n&&(o=n,u.reset(),V(e.auth)&&this.ensureSnapshot({force:!0,store:t}))})??(()=>{})},bindRealtimeLifecycle(t=c,{intervalMs:o=F}={}){let e=[];e.push(this.bindAuthLifecycle(t)),e.push(this.bindVisibilityLifecycle({store:t,intervalMs:o})),K(t)&&!$()&&this.startPolling({store:t,intervalMs:o,immediate:!0});let n=t?.subscribe?.(i=>{if(!V(i.auth)){this.stopPolling();return}$()||this.startPolling({store:t,intervalMs:o,immediate:!0})})??null;return n&&e.push(n),()=>{e.splice(0).forEach(i=>i?.()),this.stopPolling()}}};function M(t=null){let o=t?.user?.id??t?.user?.user_id??"",e=t?.role??t?.user?.role??"public";return`${o}:${e}`}function V(t=null){let o=t?.role??t?.user?.role??"public",e=t?.user?.id??t?.user?.user_id??null;return!!(t?.isAuthenticated&&e&&o!=="public")}function K(t=c){return V(t?.get?.("auth",null)??c.get("auth",null))}function $(){return typeof document<"u"&&document.visibilityState==="hidden"}function Ft(t){let o=Number(t);return Number.isFinite(o)?Math.max(3e4,Math.min(o,6e4)):F}var Dt={payment:"creditCard",transaction:"shoppingBag",message:"message",offer:"tag",security:"shield",commission:"commission",settlement:"wallet",inspection:"clipboard",listing:"car",system:"bell",transaction_paid:"creditCard",transaction_new:"shoppingBag",transaction_processing:"shoppingBag",transaction_completed:"circleCheck",message_new:"message",security_alert:"shield",commission_accrued:"commission",settlement_paid:"wallet",inspection_needed:"clipboard",listing_approved:"car",listing_rejected:"triangleWarning",system_message:"bell"},jt={payment:"blue",transaction:"red",message:"blue",offer:"green",security:"purple",commission:"green",settlement:"green",inspection:"blue",listing:"blue",system:"blue",transaction_paid:"blue",transaction_new:"red",transaction_processing:"red",transaction_completed:"green",message_new:"blue",security_alert:"purple",commission_accrued:"green",settlement_paid:"green",inspection_needed:"blue",listing_approved:"green",listing_rejected:"red",system_message:"blue"};function gt({item:t={}}={}){let o=String(t.iconKey??t.icon_key??t.type??"system").trim()||"system",e=Dt[o]??"bell",n=jt[o]??"blue",i=document.createElement("span");return i.className=`pb-notification-icon pb-notification-icon--${n}`,i.setAttribute("aria-hidden","true"),i.append(v(e,{className:"pb-notification-icon__svg"})),i}function yt({item:t={},onNavigate:o=null,onClose:e=null}={}){let n=document.createElement("article");n.className="pb-notification-item",n.id=`ntf_item_${Wt(t.id)}`;let i=document.createElement("button");i.type="button",i.className="pb-notification-item__button",i.addEventListener("click",async()=>{let d=!_t(t);try{d&&t.id&&await w.markRead(t.id);let l=t.linkUrl??t.link_url??"";l&&(e?.(),Ut(l,o))}catch(l){z(l.message||"Gagal menandai notifikasi.",{type:"error"})}});let r=document.createElement("span");r.className=_t(t)?"pb-notification-item__dot pb-notification-item__dot--hidden":"pb-notification-item__dot",r.setAttribute("aria-hidden","true");let a=document.createElement("section");a.className="pb-notification-item__content",a.append(ot("h3",t.title||"Notifikasi"),ot("p",t.body||"Aktivitas baru tersedia."));let s=ot("span",Ht(t.createdAt??t.created_at));return s.className="pb-notification-item__time",i.append(r,gt({item:t}),a,s),n.append(i),n}function Ut(t,o){let e=String(t??"").trim();if(e){if(typeof o=="function"){o(e);return}window.location.hash=e.startsWith("#")?e:`#${e.startsWith("/")?e:`/${e}`}`}}function _t(t={}){return!!(t.isRead??t.is_read)}function Ht(t){if(!t)return"";let o=new Date(t).getTime();if(!Number.isFinite(o))return"";let e=Math.max(0,Math.floor((Date.now()-o)/1e3));if(e<60)return"Baru saja";let n=Math.floor(e/60);if(n<60)return`${n}m lalu`;let i=Math.floor(n/60);if(i<24)return`${i}j lalu`;let r=Math.floor(i/24);return r<7?`${r}h lalu`:new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short"}).format(new Date(o))}function ot(t,o){let e=document.createElement(t);return e.textContent=o??"",e}function Wt(t){return String(t??"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"unknown"}function vt({id:t="ntf_popover",open:o=!1,snapshot:e={},onClose:n=null,onNavigate:i=null}={}){let r=document.createElement("section");r.id=t,r.className=o?"pb-notification-popover is-open":"pb-notification-popover",r.hidden=!o,r.setAttribute("aria-hidden",o?"false":"true");let a=document.createElement("span");a.className="pb-notification-popover__pointer",a.setAttribute("aria-hidden","true");let s=document.createElement("section");s.className="pb-notification-popover__header";let d=document.createElement("h2");d.className="pb-notification-popover__title",d.textContent="Notifikasi";let l=document.createElement("button");l.type="button",l.className="pb-notification-popover__mark",l.textContent=e.isMarkingAllRead?"Memproses...":"Tandai semua dibaca",l.disabled=!!(e.isMarkingAllRead||!Number(e.unreadCount??0)),l.addEventListener("click",async()=>{try{await w.markAllRead(),z("Semua notifikasi ditandai dibaca.",{type:"success"})}catch(E){z(E.message||"Gagal menandai semua notifikasi.",{type:"error"})}}),s.append(d,l);let m=document.createElement("section");m.className="pb-notification-popover__list";let _=Array.isArray(e.items)?e.items.slice(0,5):[];e.error?m.append(xt({title:"Notifikasi belum bisa dimuat",body:"Coba lagi nanti.",icon:"triangleWarning"})):_.length?_.forEach(E=>{m.append(yt({item:E,onNavigate:i,onClose:n}))}):m.append(xt({title:"Belum ada notifikasi",body:"Aktivitas penting akan muncul di sini.",icon:"bell"}));let h=document.createElement("button");h.type="button",h.className="pb-notification-popover__footer",h.addEventListener("click",()=>{if(n?.(),typeof i=="function"){i("#/notifications");return}window.location.hash="#/notifications"});let y=document.createElement("span");return y.className="pb-notification-popover__footer-label",y.append(nt("bell","pb-notification-popover__footer-icon"),it("span","Lihat semua notifikasi")),h.append(y,nt("chevronRight","pb-notification-popover__chevron")),r.append(a,s,m,h),r}function xt({title:t,body:o,icon:e}){let n=document.createElement("section");return n.className="pb-notification-popover__state",n.append(nt(e,"pb-notification-popover__state-icon"),it("h3",t),it("p",o)),n}function nt(t,o){let e=document.createElement("span");return e.className=o,e.append(v(t,{className:"block h-4 w-4 leading-none"})),e}function it(t,o){let e=document.createElement(t);return e.textContent=o??"",e}var wt="pb-notification-components-style",kt="notification_overlay_root";function Ee({idPrefix:t="ntf",onNavigate:o=null,compact:e=!1,subscribe:n=!0,withBackdrop:i=!1}={}){Vt();let r=document.createElement("section");r.className="pb-notification-bell",r.id=`${t}_notification_host`;let a=!1,s=!1,d=null,l=null,m=null,_=null,h=null,y=()=>{a&&(a=!1,G(),j(),D())},E=()=>y(),D=()=>{if(s)return;if(G(),j(),!c.get("auth",{})?.isAuthenticated){r.hidden=!0,r.classList.remove("is-open"),r.replaceChildren(),a=!1;return}r.hidden=!1,r.classList.toggle("is-open",a);let x=w.snapshot(),k=w.working(),N={...x,isMarkingAllRead:k.isMarkingAllRead},p=Number(N.unreadCount??0),A=`${t}_ntf_popover`,Ct=`${t}_ntf_backdrop`,f=document.createElement("button");if(f.id=`${t}_ntf_bell_button`,f.type="button",f.className=e?"pb-notification-bell__button pb-notification-bell__button--compact":"pb-notification-bell__button",f.setAttribute("aria-label",a?"Tutup notifikasi":"Buka notifikasi"),f.setAttribute("aria-haspopup","dialog"),f.setAttribute("aria-expanded",a?"true":"false"),f.setAttribute("aria-controls",A),f.addEventListener("click",()=>{a=!a,D()}),f.append(v("bell",{className:"pb-notification-bell__icon"})),p>0){let I=document.createElement("span");I.id=`${t}_ntf_bell_badge`,I.className=p>9?"pb-notification-bell__badge pb-notification-bell__badge--count":"pb-notification-bell__badge",I.textContent=p>99?"99+":p>9?String(p):"",I.setAttribute("aria-label",`${p} notifikasi belum dibaca`),f.append(I)}let S=a?vt({id:A,open:a,snapshot:N,onClose:y,onNavigate:I=>Kt(I,o)}):null;i&&S?(S.classList.add("pb-notification-popover--portal"),r.replaceChildren(f),Nt(Ct,S,f),rt({button:f,popover:S})):S?(r.replaceChildren(f,S),rt({button:f,popover:S})):r.replaceChildren(f)};return n&&(d=w.subscribe(D)),D(),window.addEventListener("hashchange",E),r.dispose=()=>{s=!0,G(),j(),d?.(),window.removeEventListener("hashchange",E)},r;function rt({button:U,popover:x}){if(!a)return;let k=N=>{let p=N.target;p instanceof Node&&(x.contains(p)||U.contains(p)||y())};document.addEventListener("pointerdown",k,!0),l=()=>document.removeEventListener("pointerdown",k,!0)}function G(){l?.(),l=null}function Nt(U,x,k){if(!a||!i||typeof document>"u"){j();return}let N=Yt(),p=document.createElement("button");p.id=U,p.type="button",p.className="pb-notification-popover__backdrop is-open",p.hidden=!1,p.setAttribute("aria-hidden","true"),p.tabIndex=-1,p.addEventListener("click",y),N.append(p,x),_=p,h=x,At(k,x);let A=()=>At(k,x);window.addEventListener("resize",A,{passive:!0}),window.addEventListener("scroll",A,{passive:!0,capture:!0}),m=()=>{window.removeEventListener("resize",A),window.removeEventListener("scroll",A,{capture:!0})}}function j(){m?.(),m=null,_?.remove(),_=null,h?.remove(),h=null}}function Yt(){let t=document.getElementById(kt);return t||(t=document.createElement("div"),t.id=kt,t.className="pb-notification-overlay-root",document.body.append(t),t)}function At(t,o){if(!t?.isConnected||!o?.isConnected)return;let e=t.getBoundingClientRect(),n=window.innerWidth||document.documentElement.clientWidth||0,i=window.innerHeight||document.documentElement.clientHeight||0,r=n<=520,a=n<=374?8:16,s=Math.max(280,Math.min(410,n-a*2)),d=e.left+e.width/2,l=r?Math.max(72,e.bottom+12):Math.max(a,e.bottom+16),m=r?a:St(e.right-s,a,Math.max(a,n-a-s)),_=St(m+s-d-14,24,Math.max(24,s-52)),h=Math.max(220,i-l-a);o.style.setProperty("--pb-notification-popover-top",`${Math.round(l)}px`),o.style.setProperty("--pb-notification-popover-left",`${Math.round(m)}px`),o.style.setProperty("--pb-notification-popover-width",`${Math.round(s)}px`),o.style.setProperty("--pb-notification-popover-max-height",`${Math.round(h)}px`),o.style.setProperty("--pb-notification-popover-pointer-right",`${Math.round(_)}px`)}function St(t,o,e){return Math.min(Math.max(t,o),e)}function Kt(t,o){let e=String(t??"").trim();if(e){if(typeof o=="function"){o(e);return}window.location.hash=e.startsWith("#")?e:`#${e.startsWith("/")?e:`/${e}`}`}}function Vt(){if(document.getElementById(wt))return;let t=document.createElement("style");t.id=wt,t.textContent=`
    .pb-notification-overlay-root {
      position: fixed;
      inset: 0;
      z-index: 79;
      pointer-events: none;
    }

    .pb-notification-bell {
      position: relative;
      z-index: 65;
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
    }

    .pb-notification-bell.is-open {
      z-index: 78;
    }

    .pb-notification-bell__button {
      position: relative;
      z-index: 79;
      display: inline-flex;
      width: 46px;
      height: 46px;
      min-width: 46px;
      min-height: 46px;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--pb-border);
      border-radius: 999px;
      background: var(--pb-surface-card);
      color: var(--pb-brand-secondary);
      box-shadow: var(--pb-shadow-soft);
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
    }

    .pb-notification-bell__button:hover {
      border-color: color-mix(in srgb, var(--pb-brand-primary) 34%, var(--pb-border));
      background: var(--pb-surface-muted);
      color: var(--pb-brand-secondary);
    }

    .pb-notification-bell__button:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--pb-form-focus), var(--pb-shadow-soft);
    }

    .pb-notification-bell__button--compact {
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
    }

    .pb-notification-bell__icon {
      display: inline-flex;
      width: 1.1rem;
      height: 1.1rem;
      align-items: center;
      justify-content: center;
      color: currentColor;
      font-size: 1.08rem;
      line-height: 1;
    }

    .pb-notification-bell__badge {
      position: absolute;
      top: 8px;
      right: 8px;
      display: inline-flex;
      width: 11px;
      height: 11px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: var(--pb-danger);
      color: white;
      box-shadow: 0 0 0 2px var(--pb-surface-card);
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
    }

    .pb-notification-bell__badge--count {
      top: 5px;
      right: 3px;
      width: auto;
      min-width: 20px;
      height: 18px;
      padding: 0 5px;
    }

    .pb-notification-popover__backdrop {
      position: fixed;
      inset: 0;
      z-index: 0;
      display: block;
      width: 100vw;
      height: 100vh;
      border: 0;
      background: color-mix(in srgb, var(--pb-overlay) 34%, transparent);
      backdrop-filter: blur(1px);
      cursor: default;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
    }

    .pb-notification-popover__backdrop[hidden] {
      display: none;
    }

    .pb-notification-popover__backdrop.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    .pb-notification-popover {
      position: absolute;
      top: calc(100% + 1rem);
      right: 0;
      z-index: 1;
      width: min(calc(100vw - 2rem), 410px);
      max-height: min(680px, calc(100vh - 6.5rem));
      display: flex;
      flex-direction: column;
      overflow: visible;
      border: 1.5px solid #1e81b0;
      border-right-width: 6px;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      color: #111827;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-8px) scale(0.98);
      transform-origin: top right;
      transition: opacity 180ms ease, transform 180ms ease;
    }

    .pb-notification-popover--portal {
      position: fixed;
      top: var(--pb-notification-popover-top, 5rem);
      right: auto;
      left: var(--pb-notification-popover-left, 1rem);
      z-index: 1;
      width: var(--pb-notification-popover-width, min(calc(100vw - 2rem), 410px));
      max-height: var(--pb-notification-popover-max-height, min(680px, calc(100vh - 6.5rem)));
      pointer-events: auto;
    }

    .pb-notification-popover.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .pb-notification-popover[hidden] {
      display: none;
    }

    .pb-notification-popover__pointer {
      position: absolute;
      top: -14px;
      right: 36px;
      width: 28px;
      height: 28px;
      border-left: 1.5px solid #1e81b0;
      border-top: 1.5px solid #1e81b0;
      background: #ffffff;
      transform: rotate(45deg);
    }

    .pb-notification-popover--portal .pb-notification-popover__pointer {
      right: var(--pb-notification-popover-pointer-right, 36px);
    }

    .pb-notification-popover__header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 28px 24px 16px;
      border-radius: 28px 28px 0 0;
      background: #ffffff;
    }

    .pb-notification-popover__title {
      margin: 0;
      color: #111827;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.1;
    }

    .pb-notification-popover__mark {
      min-height: 2.75rem;
      border: 0;
      border-radius: var(--pb-radius-lg);
      background: transparent;
      color: var(--pb-danger);
      cursor: pointer;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .pb-notification-popover__mark:hover {
      background: color-mix(in srgb, var(--pb-danger) 10%, transparent);
    }

    .pb-notification-popover__mark:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .pb-notification-popover__list {
      display: grid;
      min-width: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .pb-notification-item {
      min-width: 0;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .pb-notification-item__button {
      display: grid;
      min-height: 88px;
      width: 100%;
      grid-template-columns: 12px 56px minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 18px 24px;
      text-align: left;
    }

    .pb-notification-item__button:hover {
      background: #f8fafc;
    }

    .pb-notification-item__button:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--pb-form-focus);
    }

    .pb-notification-item__dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--pb-danger);
    }

    .pb-notification-item__dot--hidden {
      opacity: 0;
    }

    .pb-notification-icon {
      display: inline-flex;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      overflow: hidden;
    }

    .pb-notification-icon--red {
      background: #f7e3e3;
      color: #c53030;
    }

    .pb-notification-icon--blue {
      background: #e0eff7;
      color: #1e81b0;
    }

    .pb-notification-icon--green {
      background: #e3f0e7;
      color: #15803d;
    }

    /* Palet baru tidak punya ungu. Nada keempat ini dipetakan ke peach, warna
       kedua, supaya masih terbaca beda dari merah/biru/hijau di sebelahnya. */
    .pb-notification-icon--purple {
      background: #f7ead9;
      color: #b45309;
    }

    .pb-notification-icon__svg {
      display: block;
      width: 1.2rem;
      height: 1.2rem;
      line-height: 1;
    }

    .pb-notification-item__content {
      display: grid;
      min-width: 0;
      gap: 4px;
    }

    .pb-notification-item__content h3 {
      margin: 0;
      overflow-wrap: anywhere;
      color: #111827;
      font-size: 1.02rem;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.2;
    }

    .pb-notification-item__content p {
      margin: 0;
      overflow-wrap: anywhere;
      color: #6b7280;
      font-size: 0.86rem;
      font-weight: 500;
      line-height: 1.42;
    }

    .pb-notification-item__time {
      align-self: start;
      padding-top: 3px;
      color: #6b7280;
      font-size: 0.84rem;
      font-weight: 700;
      line-height: 1.25;
      white-space: nowrap;
    }

    .pb-notification-popover__state {
      display: grid;
      min-height: 160px;
      place-items: center;
      gap: 6px;
      padding: 28px 24px;
      text-align: center;
    }

    .pb-notification-popover__state-icon {
      display: inline-flex;
      width: 44px;
      height: 44px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #e0eff7;
      color: #1e81b0;
    }

    .pb-notification-popover__state h3,
    .pb-notification-popover__state p {
      margin: 0;
    }

    .pb-notification-popover__state h3 {
      color: #111827;
      font-size: 1rem;
      font-weight: 800;
    }

    .pb-notification-popover__state p {
      color: #6b7280;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .pb-notification-popover__footer {
      display: flex;
      min-height: 58px;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border: 0;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 24px 24px;
      background: #ffffff;
      color: #111827;
      cursor: pointer;
      padding: 18px 24px;
      text-align: left;
    }

    .pb-notification-popover__footer:hover {
      background: #f8fafc;
    }

    .pb-notification-popover__footer-label {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .pb-notification-popover__footer-icon,
    .pb-notification-popover__chevron {
      display: inline-flex;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      color: #1e81b0;
      line-height: 1;
    }

    .pb-notification-popover__chevron {
      color: #6b7280;
    }

    @media (max-width: 520px) {
      .pb-notification-popover {
        position: fixed;
        top: max(4.6rem, calc(env(safe-area-inset-top) + 4.2rem));
        left: 16px;
        right: 16px;
        width: auto;
        max-height: calc(100vh - 7rem - env(safe-area-inset-bottom));
      }

      .pb-notification-popover__pointer {
        right: 34px;
      }

      .pb-notification-popover--portal {
        top: var(--pb-notification-popover-top, max(4.6rem, calc(env(safe-area-inset-top) + 4.2rem)));
        left: var(--pb-notification-popover-left, 16px);
        right: auto;
        width: var(--pb-notification-popover-width, calc(100vw - 2rem));
        max-height: var(--pb-notification-popover-max-height, calc(100vh - 7rem - env(safe-area-inset-bottom)));
      }
    }

    @media (max-width: 374px) {
      .pb-notification-popover {
        left: 8px;
        right: 8px;
      }

      .pb-notification-popover__header,
      .pb-notification-item__button,
      .pb-notification-popover__footer {
        padding-left: 18px;
        padding-right: 18px;
      }

      .pb-notification-item__button {
        grid-template-columns: 10px 50px minmax(0, 1fr) auto;
        gap: 12px;
      }

      .pb-notification-icon {
        width: 50px;
        height: 50px;
      }
    }
  `,document.head.append(t)}var It="pb-account-mobile-footer-nav-style",Gt=[{id:"home",label:"Home",icon:"home",path:"/buyer"},{id:"portfolio",label:"Portofolio",icon:"dashboard",path:"/buyer/portfolio"},{id:"catalog",label:"Katalog",icon:"carb",path:"/",featured:!0},{id:"notifications",label:"Notif",icon:"bell",path:"/notifications"},{id:"profile",label:"Profil",icon:"user",path:"/profile"}];function Me({items:t=Gt,activePath:o="/buyer",onNavigate:e=null}={}){Qt();let n=document.createElement("nav");n.id="byr_mobile_footer_nav",n.className="account-mobile-footer account-mobile-footer--buyer",n.dataset.ds="buyer.mobile.footer",n.setAttribute("aria-label","Navigasi buyer mobile");let i=document.createElement("section");i.className="account-mobile-footer__shell";let r=document.createElement("section");r.className="account-mobile-footer__bar";let a=document.createElement("section");a.id="byr_mobile_footer_nav_container",a.className="account-mobile-footer__items";let s=document.createElement("section");return s.className="account-mobile-footer__center",t.forEach(d=>{if(d.featured){s.append(Et({item:d,activePath:o,onNavigate:e}));let l=document.createElement("span");l.className="account-mobile-footer__spacer",l.setAttribute("aria-hidden","true"),a.append(l);return}a.append(Et({item:d,activePath:o,onNavigate:e}))}),i.append(r,a,s),n.append(i),n}function Et({item:t,activePath:o,onNavigate:e}){let n=qt(t,o),i=t.disabled?document.createElement("button"):document.createElement("a");i.id=`byr_nav_mobile_${t.id}`;let r=t.id==="catalog"?bt():t.path;i.className=t.featured?"account-mobile-footer__action":n?"account-mobile-footer__item account-mobile-footer__item--active":"account-mobile-footer__item",t.disabled?(i.type="button",i.disabled=!0,i.setAttribute("aria-disabled","true"),i.classList.add("account-mobile-footer__item--disabled")):(r?i.href=t.id==="catalog"?r:`#${r}`:i.setAttribute("aria-disabled","true"),i.addEventListener("click",d=>{d.preventDefault(),r&&e?.(r)})),n&&i.setAttribute("aria-current","page");let a=document.createElement("span");a.className=t.featured?"account-mobile-footer__action-icon":"account-mobile-footer__icon",a.append(v(t.icon,{className:"account-mobile-footer__svg"})),i.append(a);let s=document.createElement("span");return s.className=t.featured?"account-mobile-footer__action-label text-[#ff6600] mt-3":"account-mobile-footer__label",s.textContent=t.label,i.append(s),i.setAttribute("aria-label",t.label),i.title=t.label,i}function qt(t,o){let e=String(o??"");return t.path==="/buyer"?e==="/buyer":t.path==="/buyer/portfolio"?e==="/buyer/portfolio"||e.startsWith("/buyer/transactions"):t.path==="/"?e==="/"||t.id==="catalog"&&e==="/buyer/cars":e.startsWith(t.path)}function Qt(){if(document.getElementById(It))return;let t=document.createElement("style");t.id=It,t.textContent=`
    .account-mobile-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      z-index: 58;
      display: block;
      padding: 0 0 env(safe-area-inset-bottom, 0px);
      pointer-events: none;
    }

    .account-mobile-footer__shell {
      position: relative;
      width: 100%;
      height: 6.7rem;
      margin: 0;
      pointer-events: auto;
    }

    .account-mobile-footer__bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 5.55rem;
      border: 1px solid color-mix(in srgb, var(--pb-border) 72%, transparent);
      border-right: 0;
      border-left: 0;
      border-bottom: 0;
      border-radius: 1.65rem 1.65rem 0 0;
      background:
        radial-gradient(circle at 50% -24px, transparent 0 3.25rem, rgba(255, 255, 255, 0.94) 3.28rem),
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
      box-shadow: 0 -18px 42px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(18px) saturate(1.15);
      -webkit-backdrop-filter: blur(18px) saturate(1.15);
    }

    .account-mobile-footer__items {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      align-items: center;
      height: 5.55rem;
      padding: 0 max(0.7rem, env(safe-area-inset-left, 0px)) 0 max(0.7rem, env(safe-area-inset-right, 0px));
    }

    .account-mobile-footer__item {
      display: grid;
      min-width: 0;
      min-height: 4.35rem;
      place-items: center;
      align-content: center;
      gap: 0.28rem;
      border: 0;
      border-radius: 1.1rem;
      background: transparent;
      color: #334155;
      text-decoration: none;
      cursor: pointer;
      transition: color 160ms ease, background 160ms ease;
    }

    .account-mobile-footer__item .account-mobile-footer__icon,
    .account-mobile-footer__item .account-mobile-footer__label,
    .account-mobile-footer__item .account-mobile-footer__svg,
    .account-mobile-footer__action .account-mobile-footer__action-label {
      opacity: 1;
      visibility: visible;
    }

    .account-mobile-footer__item:hover,
    .account-mobile-footer__item--active {
      color: var(--pb-brand-primary);
    }

    .account-mobile-footer__item--disabled {
      cursor: not-allowed;
      color: #64748b;
      opacity: 1;
    }

    .account-mobile-footer__icon,
    .account-mobile-footer__action-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
    }

    .account-mobile-footer__icon {
      width: 2rem;
      height: 2rem;
      font-size: 1.28rem;
    }

    .account-mobile-footer__label,
    .account-mobile-footer__action-label {
      display: block;
      width: 100%;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.68rem;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: 0;
      color: inherit;
      opacity: 1;
      visibility: visible;
    }

    .account-mobile-footer__spacer {
      display: block;
      min-width: 0;
    }

    .account-mobile-footer__center {
      position: absolute;
      left: 50%;
      top: 0;
      z-index: 3;
      transform: translate(-50%, -0.05rem);
    }

    .account-mobile-footer__action {
      display: grid;
      width: 4.1rem;
      min-height: 5.15rem;
      align-items: center;
      justify-content: center;
      justify-items: center;
      // align-content: start;
      gap: 0.24rem;
      border: 0;
      border-radius: 1.3rem;
      background: transparent;
      color: #fff;
      text-decoration: none;
      transition: filter 160ms ease, transform 160ms ease;
    }

    .account-mobile-footer__action:hover {
      filter: brightness(0.96);
      transform: translateY(-1px);
    }

    .account-mobile-footer__action-icon {
      width: 3.35rem;
      height: 3.35rem;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--pb-btn-primary-from), var(--pb-btn-primary-to));
      color: #fff;
      font-size: 1.75rem;
      box-shadow: 0 18px 34px rgba(30,129,176, 0.34);
      outline: 8px solid rgba(255, 255, 255, 0.95);
    }

    .account-mobile-footer__action-label {
      width: 4.1rem;
      color: #334155;
    }

    .account-mobile-footer__svg {
      display: block;
      color: currentColor;
      line-height: 1;
    }

    .account-mobile-footer--buyer .account-mobile-footer__shell {
      height: 5.65rem;
    }

    .account-mobile-footer--buyer .account-mobile-footer__bar {
      height: 4.65rem;
      border-radius: 1.35rem 1.35rem 0 0;
      background:
        radial-gradient(circle at 50% -18px, transparent 0 2.7rem, rgba(255, 255, 255, 0.94) 2.73rem),
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
      box-shadow: 0 -14px 32px rgba(15, 23, 42, 0.14);
      backdrop-filter: blur(14px) saturate(1.1);
      -webkit-backdrop-filter: blur(14px) saturate(1.1);
    }

    .account-mobile-footer--buyer .account-mobile-footer__items {
      height: 4.65rem;
      padding: 0 max(0.55rem, env(safe-area-inset-left, 0px)) 0 max(0.55rem, env(safe-area-inset-right, 0px));
    }

    .account-mobile-footer--buyer .account-mobile-footer__item {
      min-height: 3.55rem;
      gap: 0.2rem;
      border-radius: 0.9rem;
    }

    .account-mobile-footer--buyer .account-mobile-footer__icon {
      width: 1.55rem;
      height: 1.55rem;
      font-size: 1rem;
    }

    .account-mobile-footer--buyer .account-mobile-footer__label,
    .account-mobile-footer--buyer .account-mobile-footer__action-label {
      font-size: 0.58rem;
      font-weight: 760;
      line-height: 1;
    }

    .account-mobile-footer--buyer .account-mobile-footer__center {
      transform: translate(-50%, -0.03rem);
    }

    .account-mobile-footer--buyer .account-mobile-footer__action {
      width: 3.45rem;
      min-height: 4.35rem;
      gap: 0.18rem;
      border-radius: 1rem;
    }

    .account-mobile-footer--buyer .account-mobile-footer__action-icon {
      width: 2.75rem;
      height: 2.75rem;
      font-size: 1.42rem;
      box-shadow: 0 14px 26px rgba(30,129,176, 0.3);
      outline: 6px solid rgba(255, 255, 255, 0.95);
    }

    .account-mobile-footer--buyer .account-mobile-footer__action-label {
      width: 3.45rem;
    }

    @media (min-width: 768px) {
      .account-mobile-footer {
        display: none;
      }
    }
  `,document.head.append(t)}export{bt as a,ae as b,g as c,w as d,gt as e,Ee as f,Gt as g,Me as h};
