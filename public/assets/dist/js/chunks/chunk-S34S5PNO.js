import{b as l,d as Q,g as w,j as z}from"./chunk-KJYLVAL2.js";import{b as P}from"./chunk-WVHJATZP.js";function T(t){let o=Pt(t),e=window.location.pathname+window.location.search;o!==e&&(window.history.pushState(null,"",o),window.dispatchEvent(new PopStateEvent("popstate")))}function Pt(t){let o=String(t??"").replace(/^#/,"");return o.startsWith("/")?o:`/${o}`}function te(t=document){let o=e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;let n=e.target.closest?.("a[href]");if(!n||n.target&&n.target!=="_self"||n.hasAttribute("download"))return;let i=n.getAttribute("href")||"";if(i.startsWith("#/")){e.preventDefault(),T(i);return}if(i===""||i==="#"){e.preventDefault();return}let r;try{r=new URL(n.href,window.location.href)}catch{return}r.origin!==window.location.origin||r.pathname===window.location.pathname&&r.search===window.location.search&&r.hash||(e.preventDefault(),T(r.pathname+r.search))};return t.addEventListener("click",o),()=>t.removeEventListener("click",o)}var ct=class{constructor({outlet:o,store:e,preloadManager:n,bus:i,notFound:r=null,guard:a=null,resolveMissing:s=null}={}){this.routes=[],this.resolveMissing=s,this.outletResolver=o,this.store=e,this.preloadManager=n,this.bus=i,this.notFound=r,this.guard=a,this.activePage=null,this.jalurTampil=null,this.gulirDitahan=!1,this.handleChange=this.handleChange.bind(this)}add(o){return this.routes.push({...o,pattern:this.compile(o.path)}),this}start(){return"scrollRestoration"in window.history&&(window.history.scrollRestoration="manual"),window.addEventListener("popstate",this.handleChange),this.handleChange(),()=>this.dispose()}navigate(o){T(o)}async handleChange(){let o=this.location(),e=this.match(o.path);if(!e&&typeof this.resolveMissing=="function")try{await this.resolveMissing(o.path)&&(e=this.match(o.path))}catch(m){console.error("Gagal memuat modul rute secara malas.",m)}let n=e?.route??null,i=e?.params??{},r=this.guard?.({route:n,params:i,location:o,router:this,store:this.store,bus:this.bus})??{type:"allow",route:n},a=r.route??n,s=r.params??i;if(r.type==="redirect"){await this.leaveActivePage(),this.bus?.emit("route:guard-redirect",{...r.meta,toPath:r.path}),this.navigate(r.path);return}let c={name:a?.name??null,path:o.path,params:s,query:o.query,route:a,requestedRoute:n,access:r,store:this.store,router:this,bus:this.bus};await this.ensureRoleSnapshot(a),await this.leaveActivePage(),this.store.patchState("app.currentRoute",{name:c.name,path:c.path,params:c.params,query:c.query,route:a?{name:a.name,path:a.path,shell:a.shell??"public",role:a.role??"public",workingStateKey:a.workingStateKey??null}:null},"route:change"),this.bus?.emit("route:change",c);let u=this.jalurTampil!==o.path;if(this.jalurTampil=o.path,this.gulirDitahan=!1,!a){await this.mountPage(this.notFound(c),c),this.pulangkanGulir(u),this.bus?.emit("route:mounted",c);return}a.workingStateKey&&this.store.destroyWorkingState(a.workingStateKey),await this.mountPage(a.page(c),c),this.pulangkanGulir(u),this.bus?.emit("route:mounted",c),this.preloadManager?.hydrateRoute(a,c).then(()=>this.activePage?.__routeName===a.name?this.call(this.activePage,"hydrate",c):null).catch(m=>this.bus?.emit("route:hydrate-error",{error:m,route:a,context:c}))}pulangkanGulir(o){let e=this.gulirDitahan;this.gulirDitahan=!1,!(!o||e)&&window.scrollTo({top:0,left:0,behavior:"instant"})}tahanGulirSekali(){this.gulirDitahan=!0}async leaveActivePage(){this.activePage&&(await this.call(this.activePage,"unmount"),await this.call(this.activePage,"dispose"),this.activePage.__workingStateKey&&this.store.destroyWorkingState(this.activePage.__workingStateKey),this.activePage=null)}async mountPage(o,e){let n=this.outlet(),i=zt(o);i.__workingStateKey=e.route?.workingStateKey??null,i.__routeName=e.route?.name??null,this.activePage=i,await this.call(i,"bootstrap",e);let r=await i.mount(e);n.replaceChildren(r),await this.call(i,"bindEvents",e)}async ensureRoleSnapshot(o){let e=o?.role??"public";return!this.preloadManager||e==="public"?null:this.preloadManager.boot(e)}async call(o,e,n={}){typeof o?.[e]=="function"&&await o[e](n)}outlet(){return typeof this.outletResolver=="function"?this.outletResolver():this.outletResolver}location(){let o=window.location.pathname||"/",e=window.location.search.replace(/^\?/,"");return{path:this.normalize(o),query:Object.fromEntries(new URLSearchParams(e))}}match(o){for(let e of this.routes){let n=o.match(e.pattern);if(n)return{route:e,params:n.groups??{}}}return null}compile(o){let e=this.normalize(o),n=[],i=e.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,(r,a)=>(n.push(a),`__PARAM_${n.length-1}__`)).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/__PARAM_(\d+)__/g,(r,a)=>`(?<${n[Number(a)]}>[^/]+)`);return new RegExp(`^${i}$`)}normalize(o){let e=`/${String(o||"/").replace(/^#?\/?/,"")}`;return e==="/"?"/":e.replace(/\/$/,"")}dispose(){window.removeEventListener("popstate",this.handleChange),this.leaveActivePage()}};function zt(t){return t instanceof Node?{mount:()=>t,hydrate:()=>{},bindEvents:()=>{},unmount:()=>{},dispose:()=>{}}:t}var R={async snapshot(t={},o={}){let e=await P.get(`/notifications/snapshot${Q(t)}`,o);return{unread_count:e.data?.unread_count??0,items:e.data?.items??[]}},async list(t={},o={}){let e=await P.get(`/notifications${Q(t)}`,o);return{items:e.data?.items??[],next_cursor:e.data?.next_cursor??null,unread_count:e.data?.unread_count??0}},async markRead(t,o={}){let e=await P.post(`/notifications/${encodeURIComponent(t)}/read`,{},o);return{id:e.data?.id??t,is_read:!!e.data?.is_read,read_at:e.data?.read_at??null,unread_count:e.data?.unread_count??0}},async markAllRead(t={}){let o=await P.post("/notifications/read-all",{},t);return{updated_count:o.data?.updated_count??0,unread_count:o.data?.unread_count??0}}};var et="modules.notifications",lt=5,g=Object.freeze({unreadCount:0,items:[],workingItems:[],nextCursor:null,activeFilter:"all",isHydrated:!1,isLoading:!1,isMarkingAllRead:!1,markingIds:{},error:null,lastSyncedAt:null,lastMutationAt:null}),p={get(){return Tt(),l.get(et,C())},snapshot(){let t=this.get();return{unreadCount:t.unreadCount??0,items:t.items??[],isHydrated:!!t.isHydrated,isLoading:!!t.isLoading,error:t.error??null}},working(){let t=this.get();return{unreadCount:t.unreadCount??0,workingItems:t.workingItems??[],nextCursor:t.nextCursor??null,activeFilter:t.activeFilter??"all",isLoading:!!t.isLoading,isMarkingAllRead:!!t.isMarkingAllRead,markingIds:t.markingIds??{},error:t.error??null}},setSnapshot(t={}){let o=this.get(),e=dt(o),n=ft(q(t.items).slice(0,lt),o,e);return h({...o,unreadCount:mt(t,o,e),items:n,isHydrated:!0,isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:snapshot-set"),this.snapshot()},hydrate(t={},{append:o=!1,filter:e=null}={}){let n=this.get(),i=dt(n),r=q(t.items),a=o?J(n.workingItems??[],r):r,s=ft(a,n,i);return h({...n,unreadCount:mt(t,n,i),workingItems:s,nextCursor:t.next_cursor??t.nextCursor??null,activeFilter:e??n.activeFilter??"all",isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:hydrate"),this.working()},async loadList(t={},o={}){let e=ot(t.status??this.get().activeFilter??"all"),n=t.cursor??null;this.setLoading(!0);try{let i=await R.list({...t,status:e},o);return this.hydrate(i,{append:!!n,filter:e})}catch(i){throw this.setError(i),i}},setLoading(t){h({...this.get(),isLoading:!!t},"notifications:loading")},setError(t){h({...this.get(),isLoading:!1,isMarkingAllRead:!1,error:Ft(t)},"notifications:error")},applyMarkRead(t,o=$()){let e=this.get(),n=String(t),i=pt(e.items,n)||pt(e.workingItems,n);h({...e,unreadCount:i?Math.max(0,Number(e.unreadCount??0)-1):Number(e.unreadCount??0),items:W(e.items,n,o),workingItems:W(e.workingItems,n,o),markingIds:{...e.markingIds??{},[n]:!0},error:null,lastMutationAt:Date.now()},"notifications:mark-read-optimistic")},completeMarkRead(t,o={}){let e=this.get(),n=String(t),i={...e.markingIds??{}};delete i[n];let r=o.read_at??o.readAt??$();return h({...e,unreadCount:tt(o.unread_count,o.unreadCount,e.unreadCount,0),items:W(e.items,n,r),workingItems:W(e.workingItems,n,r),markingIds:i,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-read-complete"),this.get()},async markRead(t,o={}){let e=String(t??"");if(!e)return this.get();let n=this.get();if(Dt(n,e)?.isRead)return n;this.applyMarkRead(e);try{let r=await R.markRead(e,o);return this.completeMarkRead(e,r)}catch(r){throw this.restore(n,"notifications:mark-read-rollback"),this.setError(r),r}},applyMarkAllRead(t=$()){let o=this.get();h({...o,unreadCount:0,items:X(o.items,t),workingItems:X(o.workingItems,t),isMarkingAllRead:!0,markingIds:{},error:null,lastMutationAt:Date.now()},"notifications:mark-all-optimistic")},completeMarkAllRead(t={}){let o=this.get();return h({...o,unreadCount:tt(t.unread_count,t.unreadCount,0),isMarkingAllRead:!1,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-all-complete"),this.get()},async markAllRead(t={}){let o=this.get();this.applyMarkAllRead();try{let e=await R.markAllRead(t);return this.completeMarkAllRead(e)}catch(e){throw this.restore(o,"notifications:mark-all-rollback"),this.setError(e),e}},restore(t,o="notifications:rollback"){h(t??C(),o)},pushNotification(t){let o=ht(t);if(!o.id)return this.get();let e=this.get(),n=ut(e.items,o.id),i=ut(e.workingItems,o.id),r=!n&&!i&&!o.isRead?1:0,a=J([o],e.items??[]).slice(0,lt),s=Bt(o,e.activeFilter)?J([o],e.workingItems??[]):e.workingItems??[];return h({...e,unreadCount:Math.max(0,Number(e.unreadCount??0)+r),items:a,workingItems:s,error:null,lastSyncedAt:Date.now()},"notifications:push"),this.get()},reset(){h(C(),"notifications:reset")},subscribe(t){return l.subscribe((o,e)=>{t(o.modules?.notifications??C(),e)})}};function Tt(){l.get(et,void 0)===void 0&&h(C(),"notifications:init")}function h(t,o){l.patchState(et,$t(t),o)}function C(){return{unreadCount:g.unreadCount,items:[],workingItems:[],nextCursor:g.nextCursor,activeFilter:g.activeFilter,isHydrated:g.isHydrated,isLoading:g.isLoading,isMarkingAllRead:g.isMarkingAllRead,markingIds:{},error:g.error,lastSyncedAt:g.lastSyncedAt,lastMutationAt:g.lastMutationAt}}function $t(t={}){return{...C(),...t,unreadCount:Math.max(0,Number(t.unreadCount??0)),items:q(t.items),workingItems:q(t.workingItems),activeFilter:ot(t.activeFilter??"all"),markingIds:{...t.markingIds??{}}}}function q(t=[]){return(Array.isArray(t)?t:[]).map(ht).filter(o=>o.id!=="")}function ht(t={}){let o=t.id??t.notification_id??"",e=t.data??t.data_json??{};return{id:String(o),type:String(t.type??"system_message"),title:String(t.title??""),body:String(t.body??""),data:Ot(e)?e:{},linkUrl:t.linkUrl??t.link_url??null,iconKey:t.iconKey??t.icon_key??null,priority:t.priority??"normal",sourceType:t.sourceType??t.source_type??null,sourceId:t.sourceId??t.source_id??null,actorUserId:t.actorUserId??t.actor_user_id??null,isRead:!!(t.isRead??t.is_read??!1),readAt:t.readAt??t.read_at??null,createdAt:t.createdAt??t.created_at??null,expiresAt:t.expiresAt??t.expires_at??null}}function ot(t){return["all","unread","read"].includes(t)?t:"all"}function Bt(t,o="all"){let e=ot(o);return e==="unread"?!t.isRead:e==="read"?t.isRead:!0}function J(t=[],o=[]){let e=new Set;return[...t,...o].filter(n=>{let i=String(n.id??"");return!i||e.has(i)?!1:(e.add(i),!0)})}function ut(t=[],o){let e=String(o);return(t??[]).some(n=>String(n.id)===e)}function pt(t=[],o){let e=String(o);return(t??[]).some(n=>String(n.id)===e&&!n.isRead)}function Dt(t,o){let e=String(o);return[...t.items??[],...t.workingItems??[]].find(n=>String(n.id)===e)??null}function W(t=[],o,e){let n=String(o);return(t??[]).map(i=>String(i.id)===n?{...i,isRead:!0,readAt:i.readAt??e}:i)}function X(t=[],o){return(t??[]).map(e=>({...e,isRead:!0,readAt:e.readAt??o}))}function dt(t={}){return!!(t.isMarkingAllRead||Object.keys(t.markingIds??{}).length)}function mt(t={},o={},e=!1){let n=tt(t.unread_count,t.unreadCount,o.unreadCount,0);return e?Math.min(n,Number(o.unreadCount??0)):n}function ft(t=[],o={},e=!1){if(!e)return t;if(o.isMarkingAllRead)return X(t,$());let n=new Map;return[...o.items??[],...o.workingItems??[]].filter(i=>i?.isRead).forEach(i=>n.set(String(i.id),i.readAt??$())),t.map(i=>{let r=n.get(String(i.id));return r?{...i,isRead:!0,readAt:r}:i})}function tt(...t){for(let o of t){let e=Number(o);if(Number.isFinite(e))return Math.max(0,e)}return 0}function Ot(t){return t!==null&&typeof t=="object"&&!Array.isArray(t)}function Ft(t){return t?.message??String(t||"Notifikasi gagal diproses.")}function $(){return new Date().toISOString()}var bt="projectB:buyer:showroom-url",jt=/^#?\/s\/[^/?#]+$/;function Ut(t){let o=String(t??"").trim();return o?`/s/${encodeURIComponent(o)}`:""}function gt(t){if(t?.role!=="buyer")return"";let o=Ut(t.home_showroom_slug);if(!o||typeof window>"u")return o;try{window.localStorage?.setItem(bt,o)}catch{}return o}function _t(){if(typeof window>"u")return"";try{let t=String(window.localStorage?.getItem(bt)??"").trim();return jt.test(t)?t:""}catch{return""}}var pe={setContext({user:t=null,actor:o=null,impersonation:e=null}={}){l.patchState("auth",{user:t,actor:o,impersonation:e,isAuthenticated:!!t,role:t?.role??"public"},"auth:set-context"),l.patchState("app.activeRole",t?.role??"public","auth:set-role"),gt(t)},setUser(t){this.setContext({user:t,actor:null,impersonation:null})},patchUser(t={}){let o=this.user();if(!t||typeof t!="object"||Array.isArray(t))return o;if(!o)return Object.keys(t).length?(this.setContext({user:t,actor:this.actor(),impersonation:this.impersonation()}),t):o;let e={...o,...t};return this.setContext({user:e,actor:this.actor(),impersonation:this.impersonation()}),e},user(){return l.get("auth.user",null)},actor(){return l.get("auth.actor",null)},impersonation(){return l.get("auth.impersonation",null)},role(){return l.get("auth.role","public")},isAuthenticated(){return l.get("auth.isAuthenticated",!1)}};var Ht=45e3,j=45e3,B=null,Y="",D=null,O=l,yt=j,nt=!1,x={setSnapshot(t={}){return p.setSnapshot(t)},async loadSnapshot(t={},o={}){let{store:e=l,...n}=o;p.setLoading(!0);try{let i=await R.snapshot(t,n);return Y=M(e.get?.("auth",null)),p.setSnapshot(i)}catch(i){throw p.setError(i),i}},async ensureSnapshot({force:t=!1,ttlMs:o=Ht,store:e=l}={}){let n=e?.get?.("auth",null)??l.get("auth",null);if(!V(n))return p.snapshot();let i=M(n),r=p.get(),a=Number(r.lastSyncedAt??0),s=!!r.isHydrated&&Y===i&&a>0&&Date.now()-a<o;return!t&&s?p.snapshot():(B&&Y===i||(Y=i,B=this.loadSnapshot({},{store:e}).catch(c=>(p.setError(c),p.snapshot())).finally(()=>{B=null})),B)},hydrate(t={},o={}){return p.hydrate(t,o)},async loadList(t={},o={}){return p.loadList(t,o)},async markRead(t,o={}){return p.markRead(t,o)},async markAllRead(t={}){return p.markAllRead(t)},pushNotification(t){return p.pushNotification(t)},reset(){p.reset()},snapshot(){return p.snapshot()},working(){return p.working()},subscribe(t){return p.subscribe(t)},startPolling({intervalMs:t=j,store:o=l,immediate:e=!1}={}){return O=o??l,yt=Kt(t),nt=!0,!G(O)||F()?(this.stopPolling({keepEnabled:!0}),!1):(D!==null||(D=window.setInterval(()=>{this.pollSnapshot({store:O})},yt),e&&this.pollSnapshot({store:O})),!0)},stopPolling({keepEnabled:t=!1}={}){D!==null&&(window.clearInterval(D),D=null),t||(nt=!1)},restartPolling(t={}){return this.stopPolling(),this.startPolling(t)},pollSnapshot({store:t=O}={}){return!G(t)||F()?Promise.resolve(p.snapshot()):this.ensureSnapshot({force:!0,store:t})},bindVisibilityLifecycle({store:t=l,intervalMs:o=j}={}){if(typeof document>"u")return()=>{};let e=()=>{if(F()){this.stopPolling({keepEnabled:!0});return}nt&&G(t)&&this.startPolling({store:t,intervalMs:o,immediate:!0})};return document.addEventListener("visibilitychange",e),()=>document.removeEventListener("visibilitychange",e)},bindAuthReset(t){let o=M(t?.get("auth",null));return t?.subscribe?.(e=>{let n=M(e.auth);o!==n&&(o=n,p.reset())})??(()=>{})},bindAuthLifecycle(t=l){let o=M(t?.get("auth",null));return t?.subscribe?.(e=>{let n=M(e.auth);o!==n&&(o=n,p.reset(),V(e.auth)&&this.ensureSnapshot({force:!0,store:t}))})??(()=>{})},bindRealtimeLifecycle(t=l,{intervalMs:o=j}={}){let e=[];e.push(this.bindAuthLifecycle(t)),e.push(this.bindVisibilityLifecycle({store:t,intervalMs:o})),G(t)&&!F()&&this.startPolling({store:t,intervalMs:o,immediate:!0});let n=t?.subscribe?.(i=>{if(!V(i.auth)){this.stopPolling();return}F()||this.startPolling({store:t,intervalMs:o,immediate:!0})})??null;return n&&e.push(n),()=>{e.splice(0).forEach(i=>i?.()),this.stopPolling()}}};function M(t=null){let o=t?.user?.id??t?.user?.user_id??"",e=t?.role??t?.user?.role??"public";return`${o}:${e}`}function V(t=null){let o=t?.role??t?.user?.role??"public",e=t?.user?.id??t?.user?.user_id??null;return!!(t?.isAuthenticated&&e&&o!=="public")}function G(t=l){return V(t?.get?.("auth",null)??l.get("auth",null))}function F(){return typeof document<"u"&&document.visibilityState==="hidden"}function Kt(t){let o=Number(t);return Number.isFinite(o)?Math.max(3e4,Math.min(o,6e4)):j}var Wt={payment:"creditCard",transaction:"shoppingBag",message:"message",offer:"tag",security:"shield",commission:"commission",settlement:"wallet",inspection:"clipboard",listing:"car",system:"bell",transaction_paid:"creditCard",transaction_new:"shoppingBag",transaction_processing:"shoppingBag",transaction_completed:"circleCheck",message_new:"message",security_alert:"shield",commission_accrued:"commission",settlement_paid:"wallet",inspection_needed:"clipboard",listing_approved:"car",listing_rejected:"triangleWarning",system_message:"bell"},qt={payment:"blue",transaction:"red",message:"blue",offer:"green",security:"purple",commission:"green",settlement:"green",inspection:"blue",listing:"blue",system:"blue",transaction_paid:"blue",transaction_new:"red",transaction_processing:"red",transaction_completed:"green",message_new:"blue",security_alert:"purple",commission_accrued:"green",settlement_paid:"green",inspection_needed:"blue",listing_approved:"green",listing_rejected:"red",system_message:"blue"};function vt({item:t={}}={}){let o=String(t.iconKey??t.icon_key??t.type??"system").trim()||"system",e=Wt[o]??"bell",n=qt[o]??"blue",i=document.createElement("span");return i.className=`pb-notification-icon pb-notification-icon--${n}`,i.setAttribute("aria-hidden","true"),i.append(w(e,{className:"pb-notification-icon__svg"})),i}function L(t,o){let e=String(t??"").trim();if(!e)return;let n=e.startsWith("#")?e.slice(1):e,i=n.startsWith("/")?n:`/${n}`;if(typeof o=="function"){o(i);return}T(i)}function xt({item:t={},onNavigate:o=null,onClose:e=null}={}){let n=document.createElement("article");n.className="pb-notification-item",n.id=`ntf_item_${Gt(t.id)}`;let i=document.createElement("button");i.type="button",i.className="pb-notification-item__button",i.addEventListener("click",async()=>{let c=!wt(t);try{c&&t.id&&await x.markRead(t.id);let u=t.linkUrl??t.link_url??"";u&&(e?.(),L(u,o))}catch(u){z(u.message||"Gagal menandai notifikasi.",{type:"error"})}});let r=document.createElement("span");r.className=wt(t)?"pb-notification-item__dot pb-notification-item__dot--hidden":"pb-notification-item__dot",r.setAttribute("aria-hidden","true");let a=document.createElement("section");a.className="pb-notification-item__content",a.append(it("h3",t.title||"Notifikasi"),it("p",t.body||"Aktivitas baru tersedia."));let s=it("span",Yt(t.createdAt??t.created_at));return s.className="pb-notification-item__time",i.append(r,vt({item:t}),a,s),n.append(i),n}function wt(t={}){return!!(t.isRead??t.is_read)}function Yt(t){if(!t)return"";let o=new Date(t).getTime();if(!Number.isFinite(o))return"";let e=Math.max(0,Math.floor((Date.now()-o)/1e3));if(e<60)return"Baru saja";let n=Math.floor(e/60);if(n<60)return`${n}m lalu`;let i=Math.floor(n/60);if(i<24)return`${i}j lalu`;let r=Math.floor(i/24);return r<7?`${r}h lalu`:new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short"}).format(new Date(o))}function it(t,o){let e=document.createElement(t);return e.textContent=o??"",e}function Gt(t){return String(t??"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"unknown"}function St({id:t="ntf_popover",open:o=!1,snapshot:e={},onClose:n=null,onNavigate:i=null}={}){let r=document.createElement("section");r.id=t,r.className=o?"pb-notification-popover is-open":"pb-notification-popover",r.hidden=!o,r.setAttribute("aria-hidden",o?"false":"true");let a=document.createElement("span");a.className="pb-notification-popover__pointer",a.setAttribute("aria-hidden","true");let s=document.createElement("section");s.className="pb-notification-popover__header";let c=document.createElement("h2");c.className="pb-notification-popover__title",c.textContent="Notifikasi";let u=document.createElement("button");u.type="button",u.className="pb-notification-popover__mark",u.textContent=e.isMarkingAllRead?"Memproses...":"Tandai semua dibaca",u.disabled=!!(e.isMarkingAllRead||!Number(e.unreadCount??0)),u.addEventListener("click",async()=>{try{await x.markAllRead(),z("Semua notifikasi ditandai dibaca.",{type:"success"})}catch(E){z(E.message||"Gagal menandai semua notifikasi.",{type:"error"})}}),s.append(c,u);let m=document.createElement("section");m.className="pb-notification-popover__list";let _=Array.isArray(e.items)?e.items.slice(0,5):[];e.error?m.append(kt({title:"Notifikasi belum bisa dimuat",body:"Coba lagi nanti.",icon:"triangleWarning"})):_.length?_.forEach(E=>{m.append(xt({item:E,onNavigate:i,onClose:n}))}):m.append(kt({title:"Belum ada notifikasi",body:"Aktivitas penting akan muncul di sini.",icon:"bell"}));let b=document.createElement("button");b.type="button",b.className="pb-notification-popover__footer",b.addEventListener("click",()=>{n?.(),L("/notifications",i)});let y=document.createElement("span");return y.className="pb-notification-popover__footer-label",y.append(rt("bell","pb-notification-popover__footer-icon"),at("span","Lihat semua notifikasi")),b.append(y,rt("chevronRight","pb-notification-popover__chevron")),r.append(a,s,m,b),r}function kt({title:t,body:o,icon:e}){let n=document.createElement("section");return n.className="pb-notification-popover__state",n.append(rt(e,"pb-notification-popover__state-icon"),at("h3",t),at("p",o)),n}function rt(t,o){let e=document.createElement("span");return e.className=o,e.append(w(t,{className:"block h-4 w-4 leading-none"})),e}function at(t,o){let e=document.createElement(t);return e.textContent=o??"",e}var At="pb-notification-components-style",It="notification_overlay_root";function Be({idPrefix:t="ntf",onNavigate:o=null,compact:e=!1,subscribe:n=!0,withBackdrop:i=!1}={}){Zt();let r=document.createElement("section");r.className="pb-notification-bell",r.id=`${t}_notification_host`;let a=!1,s=!1,c=null,u=null,m=null,_=null,b=null,y=()=>{a&&(a=!1,Z(),H(),U())},E=()=>y(),U=()=>{if(s)return;if(Z(),H(),!l.get("auth",{})?.isAuthenticated){r.hidden=!0,r.classList.remove("is-open"),r.replaceChildren(),a=!1;return}r.hidden=!1,r.classList.toggle("is-open",a);let v=x.snapshot(),k=x.working(),N={...v,isMarkingAllRead:k.isMarkingAllRead},d=Number(N.unreadCount??0),S=`${t}_ntf_popover`,Lt=`${t}_ntf_backdrop`,f=document.createElement("button");if(f.id=`${t}_ntf_bell_button`,f.type="button",f.className=e?"pb-notification-bell__button pb-notification-bell__button--compact":"pb-notification-bell__button",f.setAttribute("aria-label",a?"Tutup notifikasi":"Buka notifikasi"),f.setAttribute("aria-haspopup","dialog"),f.setAttribute("aria-expanded",a?"true":"false"),f.setAttribute("aria-controls",S),f.addEventListener("click",()=>{a=!a,U()}),f.append(w("bell",{className:"pb-notification-bell__icon"})),d>0){let I=document.createElement("span");I.id=`${t}_ntf_bell_badge`,I.className=d>9?"pb-notification-bell__badge pb-notification-bell__badge--count":"pb-notification-bell__badge",I.textContent=d>99?"99+":d>9?String(d):"",I.setAttribute("aria-label",`${d} notifikasi belum dibaca`),f.append(I)}let A=a?St({id:S,open:a,snapshot:N,onClose:y,onNavigate:I=>L(I,o)}):null;i&&A?(A.classList.add("pb-notification-popover--portal"),r.replaceChildren(f),Mt(Lt,A,f),st({button:f,popover:A})):A?(r.replaceChildren(f,A),st({button:f,popover:A})):r.replaceChildren(f)};return n&&(c=x.subscribe(U)),U(),window.addEventListener("popstate",E),r.dispose=()=>{s=!0,Z(),H(),c?.(),window.removeEventListener("popstate",E)},r;function st({button:K,popover:v}){if(!a)return;let k=N=>{let d=N.target;d instanceof Node&&(v.contains(d)||K.contains(d)||y())};document.addEventListener("pointerdown",k,!0),u=()=>document.removeEventListener("pointerdown",k,!0)}function Z(){u?.(),u=null}function Mt(K,v,k){if(!a||!i||typeof document>"u"){H();return}let N=Vt(),d=document.createElement("button");d.id=K,d.type="button",d.className="pb-notification-popover__backdrop is-open",d.hidden=!1,d.setAttribute("aria-hidden","true"),d.tabIndex=-1,d.addEventListener("click",y),N.append(d,v),_=d,b=v,Et(k,v);let S=()=>Et(k,v);window.addEventListener("resize",S,{passive:!0}),window.addEventListener("scroll",S,{passive:!0,capture:!0}),m=()=>{window.removeEventListener("resize",S),window.removeEventListener("scroll",S,{capture:!0})}}function H(){m?.(),m=null,_?.remove(),_=null,b?.remove(),b=null}}function Vt(){let t=document.getElementById(It);return t||(t=document.createElement("div"),t.id=It,t.className="pb-notification-overlay-root",document.body.append(t),t)}function Et(t,o){if(!t?.isConnected||!o?.isConnected)return;let e=t.getBoundingClientRect(),n=window.innerWidth||document.documentElement.clientWidth||0,i=window.innerHeight||document.documentElement.clientHeight||0,r=n<=520,a=n<=374?8:16,s=Math.max(280,Math.min(410,n-a*2)),c=e.left+e.width/2,u=r?Math.max(72,e.bottom+12):Math.max(a,e.bottom+16),m=r?a:Nt(e.right-s,a,Math.max(a,n-a-s)),_=Nt(m+s-c-14,24,Math.max(24,s-52)),b=Math.max(220,i-u-a);o.style.setProperty("--pb-notification-popover-top",`${Math.round(u)}px`),o.style.setProperty("--pb-notification-popover-left",`${Math.round(m)}px`),o.style.setProperty("--pb-notification-popover-width",`${Math.round(s)}px`),o.style.setProperty("--pb-notification-popover-max-height",`${Math.round(b)}px`),o.style.setProperty("--pb-notification-popover-pointer-right",`${Math.round(_)}px`)}function Nt(t,o,e){return Math.min(Math.max(t,o),e)}function Zt(){if(document.getElementById(At))return;let t=document.createElement("style");t.id=At,t.textContent=`
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
  `,document.head.append(t)}var Rt="pb-account-mobile-footer-nav-style",Qt=[{id:"home",label:"Home",icon:"home",path:"/buyer"},{id:"portfolio",label:"Portofolio",icon:"dashboard",path:"/buyer/portfolio"},{id:"catalog",label:"Katalog",icon:"carb",path:"/",featured:!0},{id:"notifications",label:"Notif",icon:"bell",path:"/notifications"},{id:"profile",label:"Profil",icon:"user",path:"/profile"}];function je({items:t=Qt,activePath:o="/buyer",onNavigate:e=null}={}){Xt();let n=document.createElement("nav");n.id="byr_mobile_footer_nav",n.className="account-mobile-footer account-mobile-footer--buyer",n.dataset.ds="buyer.mobile.footer",n.setAttribute("aria-label","Navigasi buyer mobile");let i=document.createElement("section");i.className="account-mobile-footer__shell";let r=document.createElement("section");r.className="account-mobile-footer__bar";let a=document.createElement("section");a.id="byr_mobile_footer_nav_container",a.className="account-mobile-footer__items";let s=document.createElement("section");return s.className="account-mobile-footer__center",t.forEach(c=>{if(c.featured){s.append(Ct({item:c,activePath:o,onNavigate:e}));let u=document.createElement("span");u.className="account-mobile-footer__spacer",u.setAttribute("aria-hidden","true"),a.append(u);return}a.append(Ct({item:c,activePath:o,onNavigate:e}))}),i.append(r,a,s),n.append(i),n}function Ct({item:t,activePath:o,onNavigate:e}){let n=Jt(t,o),i=t.disabled?document.createElement("button"):document.createElement("a");i.id=`byr_nav_mobile_${t.id}`;let r=t.id==="catalog"?_t():t.path;i.className=t.featured?"account-mobile-footer__action":n?"account-mobile-footer__item account-mobile-footer__item--active":"account-mobile-footer__item",t.disabled?(i.type="button",i.disabled=!0,i.setAttribute("aria-disabled","true"),i.classList.add("account-mobile-footer__item--disabled")):(r?i.href=t.id==="catalog"?r:`#${r}`:i.setAttribute("aria-disabled","true"),i.addEventListener("click",c=>{c.preventDefault(),r&&e?.(r)})),n&&i.setAttribute("aria-current","page");let a=document.createElement("span");a.className=t.featured?"account-mobile-footer__action-icon":"account-mobile-footer__icon",a.append(w(t.icon,{className:"account-mobile-footer__svg"})),i.append(a);let s=document.createElement("span");return s.className=t.featured?"account-mobile-footer__action-label text-[#ff6600] mt-3":"account-mobile-footer__label",s.textContent=t.label,i.append(s),i.setAttribute("aria-label",t.label),i.title=t.label,i}function Jt(t,o){let e=String(o??"");return t.path==="/buyer"?e==="/buyer":t.path==="/buyer/portfolio"?e==="/buyer/portfolio"||e.startsWith("/buyer/transactions"):t.path==="/"?e==="/"||t.id==="catalog"&&e==="/buyer/cars":e.startsWith(t.path)}function Xt(){if(document.getElementById(Rt))return;let t=document.createElement("style");t.id=Rt,t.textContent=`
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
  `,document.head.append(t)}export{T as a,te as b,ct as c,_t as d,pe as e,g as f,x as g,vt as h,L as i,Be as j,Qt as k,je as l};
