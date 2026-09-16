import{a as Q,e as X,g as l,h as ht,j as _,l as J,p as $}from"./chunk-36HDNRPC.js";import{b as L}from"./chunk-WILMVHRH.js";function Gt(t,e){return t[e]||t.default||null}function gt(t){return new Set(Object.values(t))}function Ee({locationRef:t=window.location,windowRef:e=window}={}){let o=bt({locationRef:t}),n=()=>bt({locationRef:t});return e.addEventListener("popstate",n),{redirected:o,dispose:()=>e.removeEventListener("popstate",n)}}function bt({locationRef:t=window.location}={}){let e=Q();if(!e.default)return!1;let o=X(t.hostname||t.host);if(!gt(e).has(o))return!1;let n=oe(t),i=Jt(e,o);if(n==="/"&&i!==null)return tt(t,o,i),!0;let r=_t(e,o);if(r&&Qt({locationRef:t,path:n,host:o,role:r}))return!0;let a=et(n,{locationRef:t,peta:e,currentHost:o});return a?(t.replace(a),!0):!1}function et(t,{locationRef:e=window.location,peta:o=Q(),currentHost:n=X(e.hostname||e.host)}={}){if(!o.default||!gt(o).has(n))return null;let i=t.startsWith("/")?t:`/${t}`,r=_t(o,n);if(r)return Vt(r,i)||Zt(r,i)||Xt(i)?null:`${e.protocol}//${o.default}${i}`;let a=te(i),s=a?Gt(o,a):null;return!s||s===n?null:`${e.protocol}//${s}${i}`}function tt(t,e,o){t.replace(`${t.protocol}//${e}${o}`)}function _t(t,e){return Object.keys(t).find(o=>o!=="default"&&t[o]===e)??null}var qt={admin:["/admin","/super-admin"],seller:["/seller"],buyer:["/buyer"],affiliate:["/affiliate"]};function Vt(t,e){return(qt[t]??[]).some(o=>e===o||e.startsWith(`${o}/`))}function Zt(t,e){return e===`/login/${t}`||e===`/google-login/${t}`}function Qt({locationRef:t,path:e,host:o,role:n}){if(e.startsWith("/google-login/")){let i=`/google-login/${n}`;return e!==i?(tt(t,o,i),!0):!1}return e.startsWith("/login/")&&e!==`/login/${n}`?(tt(t,o,`/login/${n}`),!0):!1}function Xt(t){return t==="/profile"||t.startsWith("/profile/")||t==="/notifications"||t.startsWith("/notifications/")}function Jt(t,e){return t.admin&&e===t.admin?"/admin":t.seller&&e===t.seller?"/seller":t.affiliate&&e===t.affiliate?"/login/affiliate":t.buyer&&e===t.buyer?"/buyer":null}function te(t){return t==="/admin"||t.startsWith("/admin/")||t==="/super-admin"||t.startsWith("/super-admin/")?"admin":t==="/seller"||t.startsWith("/seller/")?"seller":t==="/affiliate"||t.startsWith("/affiliate/")||t==="/login/affiliate"?"affiliate":t==="/buyer"||t.startsWith("/buyer/")?"buyer":t.startsWith("/google-login/")||t.startsWith("/login/")?ee(t):null}function ee(t){let e=t.split("/")[2]||"";return e==="admin"?"admin":e==="seller"?"seller":e==="affiliate"?"affiliate":e==="buyer"?"buyer":null}function oe(t){let o=`/${String(t.pathname||"/").replace(/^\/?/,"")}`;return o==="/"?"/":o.replace(/\/$/,"")}function z(t){let e=ne(t),o=et(e);if(o){window.location.replace(o);return}let n=window.location.pathname+window.location.search;e!==n&&(window.history.pushState(null,"",e),window.dispatchEvent(new PopStateEvent("popstate")))}function ne(t){let e=String(t??"").replace(/^#/,"");return e.startsWith("/")?e:`/${e}`}function Ce(t=document){let e=o=>{if(o.defaultPrevented||o.button!==0||o.metaKey||o.ctrlKey||o.shiftKey||o.altKey)return;let n=o.target.closest?.("a[href]");if(!n||n.target&&n.target!=="_self"||n.hasAttribute("download"))return;let i=n.getAttribute("href")||"";if(i.startsWith("#/")){o.preventDefault(),z(i);return}if(i===""||i==="#"){o.preventDefault();return}let r;try{r=new URL(n.href,window.location.href)}catch{return}r.origin!==window.location.origin||r.pathname===window.location.pathname&&r.search===window.location.search&&r.hash||(o.preventDefault(),z(r.pathname+r.search))};return t.addEventListener("click",e),()=>t.removeEventListener("click",e)}var yt=class{constructor({outlet:e,store:o,preloadManager:n,bus:i,notFound:r=null,guard:a=null,resolveMissing:s=null,resolveArea:u=null}={}){this.routes=[],this.resolveMissing=s,this.resolveArea=u,this.outletResolver=e,this.store=o,this.preloadManager=n,this.bus=i,this.notFound=r,this.guard=a,this.activePage=null,this.jalurTampil=null,this.gulirDitahan=!1,this.handleChange=this.handleChange.bind(this)}add(e){return this.routes.push({...e,pattern:e.pattern??this.compile(e.path)}),this}start(){return"scrollRestoration"in window.history&&(window.history.scrollRestoration="manual"),window.addEventListener("popstate",this.handleChange),this.handleChange(),()=>this.dispose()}navigate(e){z(e)}async handleChange(){let e=this.location(),o=this.match(e.path);if(!o&&typeof this.resolveMissing=="function")try{await this.resolveMissing(e.path)&&(o=this.match(e.path))}catch(h){console.error("Gagal memuat modul rute secara malas.",h)}let n=o?.route??null,i=o?.params??{},r=this.guard?.({route:n,params:i,location:e,router:this,store:this.store,bus:this.bus})??{type:"allow",route:n},a=r.route??n,s=r.params??i;if(r.type==="redirect"){await this.leaveActivePage(),this.bus?.emit("route:guard-redirect",{...r.meta,toPath:r.path}),this.navigate(r.path);return}let u=a?null:this.resolveArea?.(e.path)??null,c={name:a?.name??null,path:e.path,params:s,query:e.query,route:a,requestedRoute:n,area:u,access:r,store:this.store,router:this,bus:this.bus};await this.ensureRoleSnapshot(a),await this.leaveActivePage(),this.store.patchState("app.currentRoute",{name:c.name,path:c.path,params:c.params,query:c.query,route:a?{name:a.name,path:a.path,shell:a.shell??"public",role:a.role??"public",workingStateKey:a.workingStateKey??null}:u?{name:null,path:e.path,shell:u.shell??"app",role:u.role??"public",workingStateKey:null}:null},"route:change"),this.bus?.emit("route:change",c);let f=this.jalurTampil!==e.path;if(this.jalurTampil=e.path,this.gulirDitahan=!1,!a){await this.mountPage(this.notFound(c),c),this.pulangkanGulir(f),this.bus?.emit("route:mounted",c);return}a.workingStateKey&&this.store.destroyWorkingState(a.workingStateKey),await this.mountPage(a.page(c),c),this.pulangkanGulir(f),this.bus?.emit("route:mounted",c),this.preloadManager?.hydrateRoute(a,c).then(()=>this.activePage?.__routeName===a.name?this.call(this.activePage,"hydrate",c):null).catch(h=>this.bus?.emit("route:hydrate-error",{error:h,route:a,context:c}))}pulangkanGulir(e){let o=this.gulirDitahan;this.gulirDitahan=!1,!(!e||o)&&window.scrollTo({top:0,left:0,behavior:"instant"})}tahanGulirSekali(){this.gulirDitahan=!0}async leaveActivePage(){this.activePage&&(await this.call(this.activePage,"unmount"),await this.call(this.activePage,"dispose"),this.activePage.__workingStateKey&&this.store.destroyWorkingState(this.activePage.__workingStateKey),this.activePage=null)}async mountPage(e,o){let n=this.outlet(),i=ie(e);i.__workingStateKey=o.route?.workingStateKey??null,i.__routeName=o.route?.name??null,this.activePage=i,await this.call(i,"bootstrap",o);let r=await i.mount(o);n.replaceChildren(r),await this.call(i,"bindEvents",o)}async ensureRoleSnapshot(e){let o=e?.role??"public";return!this.preloadManager||o==="public"?null:this.preloadManager.boot(o)}async call(e,o,n={}){typeof e?.[o]=="function"&&await e[o](n)}outlet(){return typeof this.outletResolver=="function"?this.outletResolver():this.outletResolver}location(){let e=window.location.pathname||"/",o=window.location.search.replace(/^\?/,"");return{path:this.normalize(e),query:Object.fromEntries(new URLSearchParams(o))}}match(e){for(let o of this.routes){let n=e.match(o.pattern);if(n)return{route:o,params:n.groups??{}}}return null}compile(e){let o=this.normalize(e),n=[],i=o.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,(r,a)=>(n.push(a),`__PARAM_${n.length-1}__`)).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/__PARAM_(\d+)__/g,(r,a)=>`(?<${n[Number(a)]}>[^/]+)`);return new RegExp(`^${i}$`)}normalize(e){let o=`/${String(e||"/").replace(/^#?\/?/,"")}`;return o==="/"?"/":o.replace(/\/$/,"")}dispose(){window.removeEventListener("popstate",this.handleChange),this.leaveActivePage()}};function ie(t){return t instanceof Node?{mount:()=>t,hydrate:()=>{},bindEvents:()=>{},unmount:()=>{},dispose:()=>{}}:t}var N={async snapshot(t={},e={}){let o=await L.get(`/notifications/snapshot${J(t)}`,e);return{unread_count:o.data?.unread_count??0,items:o.data?.items??[]}},async list(t={},e={}){let o=await L.get(`/notifications${J(t)}`,e);return{items:o.data?.items??[],next_cursor:o.data?.next_cursor??null,unread_count:o.data?.unread_count??0}},async markRead(t,e={}){let o=await L.post(`/notifications/${encodeURIComponent(t)}/read`,{},e);return{id:o.data?.id??t,is_read:!!o.data?.is_read,read_at:o.data?.read_at??null,unread_count:o.data?.unread_count??0}},async markAllRead(t={}){let e=await L.post("/notifications/read-all",{},t);return{updated_count:e.data?.updated_count??0,unread_count:e.data?.unread_count??0}}};var rt="modules.notifications",wt=5,y=Object.freeze({unreadCount:0,items:[],workingItems:[],nextCursor:null,activeFilter:"all",isHydrated:!1,isLoading:!1,isMarkingAllRead:!1,markingIds:{},error:null,lastSyncedAt:null,lastMutationAt:null}),d={get(){return re(),l.get(rt,C())},snapshot(){let t=this.get();return{unreadCount:t.unreadCount??0,items:t.items??[],isHydrated:!!t.isHydrated,isLoading:!!t.isLoading,error:t.error??null}},working(){let t=this.get();return{unreadCount:t.unreadCount??0,workingItems:t.workingItems??[],nextCursor:t.nextCursor??null,activeFilter:t.activeFilter??"all",isLoading:!!t.isLoading,isMarkingAllRead:!!t.isMarkingAllRead,markingIds:t.markingIds??{},error:t.error??null}},setSnapshot(t={}){let e=this.get(),o=kt(e),n=At(Y(t.items).slice(0,wt),e,o);return b({...e,unreadCount:St(t,e,o),items:n,isHydrated:!0,isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:snapshot-set"),this.snapshot()},hydrate(t={},{append:e=!1,filter:o=null}={}){let n=this.get(),i=kt(n),r=Y(t.items),a=e?ot(n.workingItems??[],r):r,s=At(a,n,i);return b({...n,unreadCount:St(t,n,i),workingItems:s,nextCursor:t.next_cursor??t.nextCursor??null,activeFilter:o??n.activeFilter??"all",isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:hydrate"),this.working()},async loadList(t={},e={}){let o=at(t.status??this.get().activeFilter??"all"),n=t.cursor??null;this.setLoading(!0);try{let i=await N.list({...t,status:o},e);return this.hydrate(i,{append:!!n,filter:o})}catch(i){throw this.setError(i),i}},setLoading(t){b({...this.get(),isLoading:!!t},"notifications:loading")},setError(t){b({...this.get(),isLoading:!1,isMarkingAllRead:!1,error:ue(t)},"notifications:error")},applyMarkRead(t,e=O()){let o=this.get(),n=String(t),i=xt(o.items,n)||xt(o.workingItems,n);b({...o,unreadCount:i?Math.max(0,Number(o.unreadCount??0)-1):Number(o.unreadCount??0),items:K(o.items,n,e),workingItems:K(o.workingItems,n,e),markingIds:{...o.markingIds??{},[n]:!0},error:null,lastMutationAt:Date.now()},"notifications:mark-read-optimistic")},completeMarkRead(t,e={}){let o=this.get(),n=String(t),i={...o.markingIds??{}};delete i[n];let r=e.read_at??e.readAt??O();return b({...o,unreadCount:it(e.unread_count,e.unreadCount,o.unreadCount,0),items:K(o.items,n,r),workingItems:K(o.workingItems,n,r),markingIds:i,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-read-complete"),this.get()},async markRead(t,e={}){let o=String(t??"");if(!o)return this.get();let n=this.get();if(ce(n,o)?.isRead)return n;this.applyMarkRead(o);try{let r=await N.markRead(o,e);return this.completeMarkRead(o,r)}catch(r){throw this.restore(n,"notifications:mark-read-rollback"),this.setError(r),r}},applyMarkAllRead(t=O()){let e=this.get();b({...e,unreadCount:0,items:nt(e.items,t),workingItems:nt(e.workingItems,t),isMarkingAllRead:!0,markingIds:{},error:null,lastMutationAt:Date.now()},"notifications:mark-all-optimistic")},completeMarkAllRead(t={}){let e=this.get();return b({...e,unreadCount:it(t.unread_count,t.unreadCount,0),isMarkingAllRead:!1,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-all-complete"),this.get()},async markAllRead(t={}){let e=this.get();this.applyMarkAllRead();try{let o=await N.markAllRead(t);return this.completeMarkAllRead(o)}catch(o){throw this.restore(e,"notifications:mark-all-rollback"),this.setError(o),o}},restore(t,e="notifications:rollback"){b(t??C(),e)},pushNotification(t){let e=It(t);if(!e.id)return this.get();let o=this.get(),n=vt(o.items,e.id),i=vt(o.workingItems,e.id),r=!n&&!i&&!e.isRead?1:0,a=ot([e],o.items??[]).slice(0,wt),s=se(e,o.activeFilter)?ot([e],o.workingItems??[]):o.workingItems??[];return b({...o,unreadCount:Math.max(0,Number(o.unreadCount??0)+r),items:a,workingItems:s,error:null,lastSyncedAt:Date.now()},"notifications:push"),this.get()},reset(){b(C(),"notifications:reset")},subscribe(t){return l.subscribe((e,o)=>{t(e.modules?.notifications??C(),o)})}};function re(){l.get(rt,void 0)===void 0&&b(C(),"notifications:init")}function b(t,e){l.patchState(rt,ae(t),e)}function C(){return{unreadCount:y.unreadCount,items:[],workingItems:[],nextCursor:y.nextCursor,activeFilter:y.activeFilter,isHydrated:y.isHydrated,isLoading:y.isLoading,isMarkingAllRead:y.isMarkingAllRead,markingIds:{},error:y.error,lastSyncedAt:y.lastSyncedAt,lastMutationAt:y.lastMutationAt}}function ae(t={}){return{...C(),...t,unreadCount:Math.max(0,Number(t.unreadCount??0)),items:Y(t.items),workingItems:Y(t.workingItems),activeFilter:at(t.activeFilter??"all"),markingIds:{...t.markingIds??{}}}}function Y(t=[]){return(Array.isArray(t)?t:[]).map(It).filter(e=>e.id!=="")}function It(t={}){let e=t.id??t.notification_id??"",o=t.data??t.data_json??{};return{id:String(e),type:String(t.type??"system_message"),title:String(t.title??""),body:String(t.body??""),data:le(o)?o:{},linkUrl:t.linkUrl??t.link_url??null,iconKey:t.iconKey??t.icon_key??null,priority:t.priority??"normal",sourceType:t.sourceType??t.source_type??null,sourceId:t.sourceId??t.source_id??null,actorUserId:t.actorUserId??t.actor_user_id??null,isRead:!!(t.isRead??t.is_read??!1),readAt:t.readAt??t.read_at??null,createdAt:t.createdAt??t.created_at??null,expiresAt:t.expiresAt??t.expires_at??null}}function at(t){return["all","unread","read"].includes(t)?t:"all"}function se(t,e="all"){let o=at(e);return o==="unread"?!t.isRead:o==="read"?t.isRead:!0}function ot(t=[],e=[]){let o=new Set;return[...t,...e].filter(n=>{let i=String(n.id??"");return!i||o.has(i)?!1:(o.add(i),!0)})}function vt(t=[],e){let o=String(e);return(t??[]).some(n=>String(n.id)===o)}function xt(t=[],e){let o=String(e);return(t??[]).some(n=>String(n.id)===o&&!n.isRead)}function ce(t,e){let o=String(e);return[...t.items??[],...t.workingItems??[]].find(n=>String(n.id)===o)??null}function K(t=[],e,o){let n=String(e);return(t??[]).map(i=>String(i.id)===n?{...i,isRead:!0,readAt:i.readAt??o}:i)}function nt(t=[],e){return(t??[]).map(o=>({...o,isRead:!0,readAt:o.readAt??e}))}function kt(t={}){return!!(t.isMarkingAllRead||Object.keys(t.markingIds??{}).length)}function St(t={},e={},o=!1){let n=it(t.unread_count,t.unreadCount,e.unreadCount,0);return o?Math.min(n,Number(e.unreadCount??0)):n}function At(t=[],e={},o=!1){if(!o)return t;if(e.isMarkingAllRead)return nt(t,O());let n=new Map;return[...e.items??[],...e.workingItems??[]].filter(i=>i?.isRead).forEach(i=>n.set(String(i.id),i.readAt??O())),t.map(i=>{let r=n.get(String(i.id));return r?{...i,isRead:!0,readAt:r}:i})}function it(...t){for(let e of t){let o=Number(e);if(Number.isFinite(o))return Math.max(0,o)}return 0}function le(t){return t!==null&&typeof t=="object"&&!Array.isArray(t)}function ue(t){return t?.message??String(t||"Notifikasi gagal diproses.")}function O(){return new Date().toISOString()}var Et=Object.freeze(["admin","super-admin","seller","buyer","affiliate","login","google-login","auth","api","cars","transactions","profile","notifications","public","showrooms","af","a","s","daftar-showroom","saas-landing","contoh-katalog","health","uploads","assets","tester","app"]);var Rt="projectB:buyer:showroom-url",de=new RegExp(`^(?:${Et.join("|")})$`);function pe(t){let e=t.match(/^#?\/s\/([^/?#]+)$/);if(e)return!!e[1];let o=t.match(/^#?\/([^/?#]+)$/);return!!o&&!de.test(o[1])}function me(t){let e=String(t??"").trim();return e?`/${encodeURIComponent(e)}`:""}function Nt(t){if(t?.role!=="buyer")return"";let e=me(t.home_showroom_slug);if(!e||typeof window>"u")return e;try{window.localStorage?.setItem(Rt,e)}catch{}return e}function Ct(){if(typeof window>"u")return"";try{let t=String(window.localStorage?.getItem(Rt)??"").trim();return pe(t)?t:""}catch{return""}}var lt="projectB:buyer:showroom-icon-url",st="projectB:buyer:showroom-icon-slug";async function Pt(t){let e=String(t?.home_showroom_slug??"").trim();if(t?.role!=="buyer"||!e)return Mt(),"";try{if(window.localStorage?.getItem(st)===e)return ct()}catch{}try{let o=await ht.validateSlug(e),n=String(o?.showroom?.icon_url??"").trim();return n?(window.localStorage?.setItem(lt,n),window.localStorage?.setItem(st,e),n):(Mt(),"")}catch{return ct()}}function Mt(){try{window.localStorage?.removeItem(lt),window.localStorage?.removeItem(st)}catch{}}function ct(){if(typeof window>"u")return"";try{return String(window.localStorage?.getItem(lt)??"").trim()}catch{return""}}function He({size:t="h-11 w-11",wrapperClassName:e="",icon:o="car",iconSize:n="h-5 w-5"}={}){let i=document.createElement("span");i.className=["inline-flex shrink-0 items-center justify-center overflow-hidden leading-none",t,e].filter(Boolean).join(" ");let r=ct();if(r){let a=document.createElement("img");return a.src=fe(r),a.alt="Logo showroom",a.loading="lazy",a.className="block h-full w-full object-cover",a.addEventListener("error",()=>{i.replaceChildren(_(o,{className:`block ${n} leading-none`}))},{once:!0}),i.append(a),i}return i.append(_(o,{className:`block ${n} leading-none`})),i}function fe(t){let e=String(t??"").trim();return!e||e.startsWith("http://")||e.startsWith("https://")||e.startsWith("data:")||e.startsWith("/")?e:`/${e.replace(/^\/+/,"")}`}var qe={setContext({user:t=null,actor:e=null,impersonation:o=null}={}){l.patchState("auth",{user:t,actor:e,impersonation:o,isAuthenticated:!!t,role:t?.role??"public"},"auth:set-context"),l.patchState("app.activeRole",t?.role??"public","auth:set-role"),Nt(t),Pt(t)},setUser(t){this.setContext({user:t,actor:null,impersonation:null})},patchUser(t={}){let e=this.user();if(!t||typeof t!="object"||Array.isArray(t))return e;if(!e)return Object.keys(t).length?(this.setContext({user:t,actor:this.actor(),impersonation:this.impersonation()}),t):e;let o={...e,...t};return this.setContext({user:o,actor:this.actor(),impersonation:this.impersonation()}),o},user(){return l.get("auth.user",null)},actor(){return l.get("auth.actor",null)},impersonation(){return l.get("auth.impersonation",null)},role(){return l.get("auth.role","public")},isAuthenticated(){return l.get("auth.isAuthenticated",!1)}};var he=45e3,j=45e3,B=null,G="",T=null,D=l,Lt=j,ut=!1,x={setSnapshot(t={}){return d.setSnapshot(t)},async loadSnapshot(t={},e={}){let{store:o=l,...n}=e;d.setLoading(!0);try{let i=await N.snapshot(t,n);return G=M(o.get?.("auth",null)),d.setSnapshot(i)}catch(i){throw d.setError(i),i}},async ensureSnapshot({force:t=!1,ttlMs:e=he,store:o=l}={}){let n=o?.get?.("auth",null)??l.get("auth",null);if(!V(n))return d.snapshot();let i=M(n),r=d.get(),a=Number(r.lastSyncedAt??0),s=!!r.isHydrated&&G===i&&a>0&&Date.now()-a<e;return!t&&s?d.snapshot():(B&&G===i||(G=i,B=this.loadSnapshot({},{store:o}).catch(u=>(d.setError(u),d.snapshot())).finally(()=>{B=null})),B)},hydrate(t={},e={}){return d.hydrate(t,e)},async loadList(t={},e={}){return d.loadList(t,e)},async markRead(t,e={}){return d.markRead(t,e)},async markAllRead(t={}){return d.markAllRead(t)},pushNotification(t){return d.pushNotification(t)},reset(){d.reset()},snapshot(){return d.snapshot()},working(){return d.working()},subscribe(t){return d.subscribe(t)},startPolling({intervalMs:t=j,store:e=l,immediate:o=!1}={}){return D=e??l,Lt=be(t),ut=!0,!q(D)||W()?(this.stopPolling({keepEnabled:!0}),!1):(T!==null||(T=window.setInterval(()=>{this.pollSnapshot({store:D})},Lt),o&&this.pollSnapshot({store:D})),!0)},stopPolling({keepEnabled:t=!1}={}){T!==null&&(window.clearInterval(T),T=null),t||(ut=!1)},restartPolling(t={}){return this.stopPolling(),this.startPolling(t)},pollSnapshot({store:t=D}={}){return!q(t)||W()?Promise.resolve(d.snapshot()):this.ensureSnapshot({force:!0,store:t})},bindVisibilityLifecycle({store:t=l,intervalMs:e=j}={}){if(typeof document>"u")return()=>{};let o=()=>{if(W()){this.stopPolling({keepEnabled:!0});return}ut&&q(t)&&this.startPolling({store:t,intervalMs:e,immediate:!0})};return document.addEventListener("visibilitychange",o),()=>document.removeEventListener("visibilitychange",o)},bindAuthReset(t){let e=M(t?.get("auth",null));return t?.subscribe?.(o=>{let n=M(o.auth);e!==n&&(e=n,d.reset())})??(()=>{})},bindAuthLifecycle(t=l){let e=M(t?.get("auth",null));return t?.subscribe?.(o=>{let n=M(o.auth);e!==n&&(e=n,d.reset(),V(o.auth)&&this.ensureSnapshot({force:!0,store:t}))})??(()=>{})},bindRealtimeLifecycle(t=l,{intervalMs:e=j}={}){let o=[];o.push(this.bindAuthLifecycle(t)),o.push(this.bindVisibilityLifecycle({store:t,intervalMs:e})),q(t)&&!W()&&this.startPolling({store:t,intervalMs:e,immediate:!0});let n=t?.subscribe?.(i=>{if(!V(i.auth)){this.stopPolling();return}W()||this.startPolling({store:t,intervalMs:e,immediate:!0})})??null;return n&&o.push(n),()=>{o.splice(0).forEach(i=>i?.()),this.stopPolling()}}};function M(t=null){let e=t?.user?.id??t?.user?.user_id??"",o=t?.role??t?.user?.role??"public";return`${e}:${o}`}function V(t=null){let e=t?.role??t?.user?.role??"public",o=t?.user?.id??t?.user?.user_id??null;return!!(t?.isAuthenticated&&o&&e!=="public")}function q(t=l){return V(t?.get?.("auth",null)??l.get("auth",null))}function W(){return typeof document<"u"&&document.visibilityState==="hidden"}function be(t){let e=Number(t);return Number.isFinite(e)?Math.max(3e4,Math.min(e,6e4)):j}var ge={payment:"creditCard",transaction:"shoppingBag",message:"message",offer:"tag",security:"shield",commission:"commission",settlement:"wallet",inspection:"clipboard",listing:"car",system:"bell",transaction_paid:"creditCard",transaction_new:"shoppingBag",transaction_processing:"shoppingBag",transaction_completed:"circleCheck",message_new:"message",security_alert:"shield",commission_accrued:"commission",settlement_paid:"wallet",inspection_needed:"clipboard",listing_approved:"car",listing_rejected:"triangleWarning",system_message:"bell"},_e={payment:"blue",transaction:"red",message:"blue",offer:"green",security:"purple",commission:"green",settlement:"green",inspection:"blue",listing:"blue",system:"blue",transaction_paid:"blue",transaction_new:"red",transaction_processing:"red",transaction_completed:"green",message_new:"blue",security_alert:"purple",commission_accrued:"green",settlement_paid:"green",inspection_needed:"blue",listing_approved:"green",listing_rejected:"red",system_message:"blue"};function $t({item:t={}}={}){let e=String(t.iconKey??t.icon_key??t.type??"system").trim()||"system",o=ge[e]??"bell",n=_e[e]??"blue",i=document.createElement("span");return i.className=`pb-notification-icon pb-notification-icon--${n}`,i.setAttribute("aria-hidden","true"),i.append(_(o,{className:"pb-notification-icon__svg"})),i}function P(t,e){let o=String(t??"").trim();if(!o)return;let n=o.startsWith("#")?o.slice(1):o,i=n.startsWith("/")?n:`/${n}`;if(typeof e=="function"){e(i);return}z(i)}function Ot({item:t={},onNavigate:e=null,onClose:o=null}={}){let n=document.createElement("article");n.className="pb-notification-item",n.id=`ntf_item_${we(t.id)}`;let i=document.createElement("button");i.type="button",i.className="pb-notification-item__button",i.addEventListener("click",async()=>{let u=!zt(t);try{u&&t.id&&await x.markRead(t.id);let c=t.linkUrl??t.link_url??"";c&&(o?.(),P(c,e))}catch(c){$(c.message||"Gagal menandai notifikasi.",{type:"error"})}});let r=document.createElement("span");r.className=zt(t)?"pb-notification-item__dot pb-notification-item__dot--hidden":"pb-notification-item__dot",r.setAttribute("aria-hidden","true");let a=document.createElement("section");a.className="pb-notification-item__content",a.append(dt("h3",t.title||"Notifikasi"),dt("p",t.body||"Aktivitas baru tersedia."));let s=dt("span",ye(t.createdAt??t.created_at));return s.className="pb-notification-item__time",i.append(r,$t({item:t}),a,s),n.append(i),n}function zt(t={}){return!!(t.isRead??t.is_read)}function ye(t){if(!t)return"";let e=new Date(t).getTime();if(!Number.isFinite(e))return"";let o=Math.max(0,Math.floor((Date.now()-e)/1e3));if(o<60)return"Baru saja";let n=Math.floor(o/60);if(n<60)return`${n}m lalu`;let i=Math.floor(n/60);if(i<24)return`${i}j lalu`;let r=Math.floor(i/24);return r<7?`${r}h lalu`:new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short"}).format(new Date(e))}function dt(t,e){let o=document.createElement(t);return o.textContent=e??"",o}function we(t){return String(t??"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"unknown"}function Tt({id:t="ntf_popover",open:e=!1,snapshot:o={},onClose:n=null,onNavigate:i=null}={}){let r=document.createElement("section");r.id=t,r.className=e?"pb-notification-popover is-open":"pb-notification-popover",r.hidden=!e,r.setAttribute("aria-hidden",e?"false":"true");let a=document.createElement("span");a.className="pb-notification-popover__pointer",a.setAttribute("aria-hidden","true");let s=document.createElement("section");s.className="pb-notification-popover__header";let u=document.createElement("h2");u.className="pb-notification-popover__title",u.textContent="Notifikasi";let c=document.createElement("button");c.type="button",c.className="pb-notification-popover__mark",c.textContent=o.isMarkingAllRead?"Memproses...":"Tandai semua dibaca",c.disabled=!!(o.isMarkingAllRead||!Number(o.unreadCount??0)),c.addEventListener("click",async()=>{try{await x.markAllRead(),$("Semua notifikasi ditandai dibaca.",{type:"success"})}catch(E){$(E.message||"Gagal menandai semua notifikasi.",{type:"error"})}}),s.append(u,c);let f=document.createElement("section");f.className="pb-notification-popover__list";let h=Array.isArray(o.items)?o.items.slice(0,5):[];o.error?f.append(Bt({title:"Notifikasi belum bisa dimuat",body:"Coba lagi nanti.",icon:"triangleWarning"})):h.length?h.forEach(E=>{f.append(Ot({item:E,onNavigate:i,onClose:n}))}):f.append(Bt({title:"Belum ada notifikasi",body:"Aktivitas penting akan muncul di sini.",icon:"bell"}));let g=document.createElement("button");g.type="button",g.className="pb-notification-popover__footer",g.addEventListener("click",()=>{n?.(),P("/notifications",i)});let w=document.createElement("span");return w.className="pb-notification-popover__footer-label",w.append(pt("bell","pb-notification-popover__footer-icon"),mt("span","Lihat semua notifikasi")),g.append(w,pt("chevronRight","pb-notification-popover__chevron")),r.append(a,s,f,g),r}function Bt({title:t,body:e,icon:o}){let n=document.createElement("section");return n.className="pb-notification-popover__state",n.append(pt(o,"pb-notification-popover__state-icon"),mt("h3",t),mt("p",e)),n}function pt(t,e){let o=document.createElement("span");return o.className=e,o.append(_(t,{className:"block h-4 w-4 leading-none"})),o}function mt(t,e){let o=document.createElement(t);return o.textContent=e??"",o}var Dt="pb-notification-components-style",Wt="notification_overlay_root";function vo({idPrefix:t="ntf",onNavigate:e=null,compact:o=!1,subscribe:n=!0,withBackdrop:i=!1}={}){xe();let r=document.createElement("section");r.className="pb-notification-bell",r.id=`${t}_notification_host`;let a=!1,s=!1,u=null,c=null,f=null,h=null,g=null,w=()=>{a&&(a=!1,Z(),H(),F())},E=()=>w(),F=()=>{if(s)return;if(Z(),H(),!l.get("auth",{})?.isAuthenticated){r.hidden=!0,r.classList.remove("is-open"),r.replaceChildren(),a=!1;return}r.hidden=!1,r.classList.toggle("is-open",a);let v=x.snapshot(),k=x.working(),R={...v,isMarkingAllRead:k.isMarkingAllRead},p=Number(R.unreadCount??0),S=`${t}_ntf_popover`,Yt=`${t}_ntf_backdrop`,m=document.createElement("button");if(m.id=`${t}_ntf_bell_button`,m.type="button",m.className=o?"pb-notification-bell__button pb-notification-bell__button--compact":"pb-notification-bell__button",m.setAttribute("aria-label",a?"Tutup notifikasi":"Buka notifikasi"),m.setAttribute("aria-haspopup","dialog"),m.setAttribute("aria-expanded",a?"true":"false"),m.setAttribute("aria-controls",S),m.addEventListener("click",()=>{a=!a,F()}),m.append(_("bell",{className:"pb-notification-bell__icon"})),p>0){let I=document.createElement("span");I.id=`${t}_ntf_bell_badge`,I.className=p>9?"pb-notification-bell__badge pb-notification-bell__badge--count":"pb-notification-bell__badge",I.textContent=p>99?"99+":p>9?String(p):"",I.setAttribute("aria-label",`${p} notifikasi belum dibaca`),m.append(I)}let A=a?Tt({id:S,open:a,snapshot:R,onClose:w,onNavigate:I=>P(I,e)}):null;i&&A?(A.classList.add("pb-notification-popover--portal"),r.replaceChildren(m),Kt(Yt,A,m),ft({button:m,popover:A})):A?(r.replaceChildren(m,A),ft({button:m,popover:A})):r.replaceChildren(m)};return n&&(u=x.subscribe(F)),F(),window.addEventListener("popstate",E),r.dispose=()=>{s=!0,Z(),H(),u?.(),window.removeEventListener("popstate",E)},r;function ft({button:U,popover:v}){if(!a)return;let k=R=>{let p=R.target;p instanceof Node&&(v.contains(p)||U.contains(p)||w())};document.addEventListener("pointerdown",k,!0),c=()=>document.removeEventListener("pointerdown",k,!0)}function Z(){c?.(),c=null}function Kt(U,v,k){if(!a||!i||typeof document>"u"){H();return}let R=ve(),p=document.createElement("button");p.id=U,p.type="button",p.className="pb-notification-popover__backdrop is-open",p.hidden=!1,p.setAttribute("aria-hidden","true"),p.tabIndex=-1,p.addEventListener("click",w),R.append(p,v),h=p,g=v,jt(k,v);let S=()=>jt(k,v);window.addEventListener("resize",S,{passive:!0}),window.addEventListener("scroll",S,{passive:!0,capture:!0}),f=()=>{window.removeEventListener("resize",S),window.removeEventListener("scroll",S,{capture:!0})}}function H(){f?.(),f=null,h?.remove(),h=null,g?.remove(),g=null}}function ve(){let t=document.getElementById(Wt);return t||(t=document.createElement("div"),t.id=Wt,t.className="pb-notification-overlay-root",document.body.append(t),t)}function jt(t,e){if(!t?.isConnected||!e?.isConnected)return;let o=t.getBoundingClientRect(),n=window.innerWidth||document.documentElement.clientWidth||0,i=window.innerHeight||document.documentElement.clientHeight||0,r=n<=520,a=n<=374?8:16,s=Math.max(280,Math.min(410,n-a*2)),u=o.left+o.width/2,c=r?Math.max(72,o.bottom+12):Math.max(a,o.bottom+16),f=r?a:Ft(o.right-s,a,Math.max(a,n-a-s)),h=Ft(f+s-u-14,24,Math.max(24,s-52)),g=Math.max(220,i-c-a);e.style.setProperty("--pb-notification-popover-top",`${Math.round(c)}px`),e.style.setProperty("--pb-notification-popover-left",`${Math.round(f)}px`),e.style.setProperty("--pb-notification-popover-width",`${Math.round(s)}px`),e.style.setProperty("--pb-notification-popover-max-height",`${Math.round(g)}px`),e.style.setProperty("--pb-notification-popover-pointer-right",`${Math.round(h)}px`)}function Ft(t,e,o){return Math.min(Math.max(t,e),o)}function xe(){if(document.getElementById(Dt))return;let t=document.createElement("style");t.id=Dt,t.textContent=`
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
  `,document.head.append(t)}var Ht="pb-account-mobile-footer-nav-style",ke=[{id:"home",label:"Home",icon:"home",path:"/buyer"},{id:"portfolio",label:"Portofolio",icon:"dashboard",path:"/buyer/portfolio"},{id:"catalog",label:"Katalog",icon:"carb",path:"/",featured:!0},{id:"notifications",label:"Notif",icon:"bell",path:"/notifications"},{id:"profile",label:"Profil",icon:"user",path:"/profile"}];function Ao({items:t=ke,activePath:e="/buyer",onNavigate:o=null}={}){Ae();let n=document.createElement("nav");n.id="byr_mobile_footer_nav",n.className="account-mobile-footer account-mobile-footer--buyer",n.dataset.ds="buyer.mobile.footer",n.setAttribute("aria-label","Navigasi buyer mobile");let i=document.createElement("section");i.className="account-mobile-footer__shell";let r=document.createElement("section");r.className="account-mobile-footer__bar";let a=document.createElement("section");a.id="byr_mobile_footer_nav_container",a.className="account-mobile-footer__items";let s=document.createElement("section");return s.className="account-mobile-footer__center",t.forEach(u=>{if(u.featured){s.append(Ut({item:u,activePath:e,onNavigate:o}));let c=document.createElement("span");c.className="account-mobile-footer__spacer",c.setAttribute("aria-hidden","true"),a.append(c);return}a.append(Ut({item:u,activePath:e,onNavigate:o}))}),i.append(r,a,s),n.append(i),n}function Ut({item:t,activePath:e,onNavigate:o}){let n=Se(t,e),i=t.disabled?document.createElement("button"):document.createElement("a");i.id=`byr_nav_mobile_${t.id}`;let r=t.id==="catalog"?Ct():t.path;i.className=t.featured?"account-mobile-footer__action":n?"account-mobile-footer__item account-mobile-footer__item--active":"account-mobile-footer__item",t.disabled?(i.type="button",i.disabled=!0,i.setAttribute("aria-disabled","true"),i.classList.add("account-mobile-footer__item--disabled")):(r?i.href=t.id==="catalog"?r:`#${r}`:i.setAttribute("aria-disabled","true"),i.addEventListener("click",u=>{u.preventDefault(),r&&o?.(r)})),n&&i.setAttribute("aria-current","page");let a=document.createElement("span");a.className=t.featured?"account-mobile-footer__action-icon":"account-mobile-footer__icon",a.append(_(t.icon,{className:"account-mobile-footer__svg"})),i.append(a);let s=document.createElement("span");return s.className=t.featured?"account-mobile-footer__action-label text-[#ff6600] mt-3":"account-mobile-footer__label",s.textContent=t.label,i.append(s),i.setAttribute("aria-label",t.label),i.title=t.label,i}function Se(t,e){let o=String(e??"");return t.path==="/buyer"?o==="/buyer":t.path==="/buyer/portfolio"?o==="/buyer/portfolio"||o.startsWith("/buyer/transactions"):t.path==="/"?o==="/"||t.id==="catalog"&&o==="/buyer/cars":o.startsWith(t.path)}function Ae(){if(document.getElementById(Ht))return;let t=document.createElement("style");t.id=Ht,t.textContent=`
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
  `,document.head.append(t)}export{Ee as a,z as b,Ce as c,yt as d,Et as e,Ct as f,He as g,qe as h,y as i,x as j,$t as k,P as l,vo as m,ke as n,Ao as o};
