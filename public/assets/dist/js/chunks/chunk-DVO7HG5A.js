import{a as Q,e as X,g as f,i as pt,l as w,p as J,t as $}from"./chunk-6IPW3XO2.js";import{c as L}from"./chunk-DJQM5VBU.js";function Ft(t,e){return t[e]||t.default||null}function mt(t){return new Set(Object.values(t))}function me({locationRef:t=window.location,windowRef:e=window}={}){let n=ft({locationRef:t}),o=()=>ft({locationRef:t});return e.addEventListener("popstate",o),{redirected:n,dispose:()=>e.removeEventListener("popstate",o)}}function ft({locationRef:t=window.location}={}){let e=Q();if(!e.default)return!1;let n=X(t.hostname||t.host);if(!mt(e).has(n))return!1;let o=Gt(t);if(o==="/admin/tasks")return t.replace(`${t.protocol}//${e.default}/tasks`),!0;let i=Kt(e,n);if(o==="/"&&i!==null)return tt(t,n,i),!0;let r=ht(e,n);if(r&&jt({locationRef:t,path:o,host:n,role:r}))return!0;let a=et(o,{locationRef:t,peta:e,currentHost:n});return a?(t.replace(a),!0):!1}function et(t,{locationRef:e=window.location,peta:n=Q(),currentHost:o=X(e.hostname||e.host)}={}){if(!n.default||!mt(n).has(o))return null;let i=t.startsWith("/")?t:`/${t}`;if(i==="/admin/tasks")return`${e.protocol}//${n.default}/tasks`;let r=ht(n,o);if(r)return Wt(r,i)||Bt(r,i)||Ht(i)?null:`${e.protocol}//${n.default}${i}`;let a=Ut(i),l=a?Ft(n,a):null;return!l||l===o?null:`${e.protocol}//${l}${i}`}function tt(t,e,n){t.replace(`${t.protocol}//${e}${n}`)}function ht(t,e){return Object.keys(t).find(n=>n!=="default"&&t[n]===e)??null}var Ot={admin:["/admin","/super-admin"],seller:["/seller"],buyer:["/buyer"],affiliate:["/affiliate"]};function Wt(t,e){return(Ot[t]??[]).some(n=>e===n||e.startsWith(`${n}/`))}function Bt(t,e){return e===`/login/${t}`||e===`/google-login/${t}`}function jt({locationRef:t,path:e,host:n,role:o}){if(e.startsWith("/google-login/")){let i=`/google-login/${o}`;return e!==i?(tt(t,n,i),!0):!1}return e.startsWith("/login/")&&e!==`/login/${o}`?(tt(t,n,`/login/${o}`),!0):!1}function Ht(t){return t==="/profile"||t.startsWith("/profile/")||t==="/notifications"||t.startsWith("/notifications/")}function Kt(t,e){return t.admin&&e===t.admin?"/admin":t.seller&&e===t.seller?"/seller":t.affiliate&&e===t.affiliate?"/login/affiliate":t.buyer&&e===t.buyer?"/buyer":null}function Ut(t){return t==="/admin"||t.startsWith("/admin/")||t==="/super-admin"||t.startsWith("/super-admin/")?"admin":t==="/seller"||t.startsWith("/seller/")?"seller":t==="/affiliate"||t.startsWith("/affiliate/")||t==="/login/affiliate"?"affiliate":t==="/buyer"||t.startsWith("/buyer/")?"buyer":t.startsWith("/google-login/")||t.startsWith("/login/")?qt(t):null}function qt(t){let e=t.split("/")[2]||"";return e==="admin"?"admin":e==="seller"?"seller":e==="affiliate"?"affiliate":e==="buyer"?"buyer":null}function Gt(t){let n=`/${String(t.pathname||"/").replace(/^\/?/,"")}`;return n==="/"?"/":n.replace(/\/$/,"")}function z(t){let e=Yt(t),n=et(e);if(n){window.location.replace(n);return}let o=window.location.pathname+window.location.search;e!==o&&(window.history.pushState(null,"",e),window.dispatchEvent(new PopStateEvent("popstate")))}function Yt(t){let e=String(t??"").replace(/^#/,"");return e.startsWith("/")?e:`/${e}`}function ge(t=document){let e=n=>{if(n.defaultPrevented||n.button!==0||n.metaKey||n.ctrlKey||n.shiftKey||n.altKey)return;let o=n.target.closest?.("a[href]");if(!o||o.target&&o.target!=="_self"||o.hasAttribute("download"))return;let i=o.getAttribute("href")||"";if(i.startsWith("#/")){n.preventDefault(),z(i);return}if(i===""||i==="#"){n.preventDefault();return}let r;try{r=new URL(o.href,window.location.href)}catch{return}r.origin!==window.location.origin||r.pathname===window.location.pathname&&r.search===window.location.search&&r.hash||(n.preventDefault(),z(r.pathname+r.search))};return t.addEventListener("click",e),()=>t.removeEventListener("click",e)}var bt=class{constructor({outlet:e,store:n,preloadManager:o,bus:i,notFound:r=null,guard:a=null,resolveMissing:l=null,resolveArea:c=null}={}){this.routes=[],this.resolveMissing=l,this.resolveArea=c,this.outletResolver=e,this.store=n,this.preloadManager=o,this.bus=i,this.notFound=r,this.guard=a,this.activePage=null,this.jalurTampil=null,this.gulirDitahan=!1,this.handleChange=this.handleChange.bind(this)}add(e){return this.routes.push({...e,pattern:e.pattern??this.compile(e.path)}),this}start(){return"scrollRestoration"in window.history&&(window.history.scrollRestoration="manual"),window.addEventListener("popstate",this.handleChange),this.handleChange(),()=>this.dispose()}navigate(e){z(e)}async handleChange(){let e=this.location(),n=this.match(e.path);if(!n&&typeof this.resolveMissing=="function")try{await this.resolveMissing(e.path)&&(n=this.match(e.path))}catch(m){console.error("Gagal memuat modul rute secara malas.",m)}let o=n?.route??null,i=n?.params??{},r=this.guard?.({route:o,params:i,location:e,router:this,store:this.store,bus:this.bus})??{type:"allow",route:o},a=r.route??o,l=r.params??i;if(r.type==="redirect"){await this.leaveActivePage(),this.bus?.emit("route:guard-redirect",{...r.meta,toPath:r.path}),this.navigate(r.path);return}let c=a?null:this.resolveArea?.(e.path)??null,s={name:a?.name??null,path:e.path,params:l,query:e.query,route:a,requestedRoute:o,area:c,access:r,store:this.store,router:this,bus:this.bus};await this.ensureRoleSnapshot(a),await this.leaveActivePage(),this.store.patchState("app.currentRoute",{name:s.name,path:s.path,params:s.params,query:s.query,route:a?{name:a.name,path:a.path,shell:a.shell??"public",role:a.role??"public",workingStateKey:a.workingStateKey??null}:c?{name:null,path:e.path,shell:c.shell??"app",role:c.role??"public",workingStateKey:null}:null},"route:change"),this.bus?.emit("route:change",s);let d=this.jalurTampil!==e.path;if(this.jalurTampil=e.path,this.gulirDitahan=!1,!a){await this.mountPage(this.notFound(s),s),this.pulangkanGulir(d),this.bus?.emit("route:mounted",s);return}a.workingStateKey&&this.store.destroyWorkingState(a.workingStateKey),await this.mountPage(a.page(s),s),this.pulangkanGulir(d),this.bus?.emit("route:mounted",s),this.preloadManager?.hydrateRoute(a,s).then(()=>this.activePage?.__routeName===a.name?this.call(this.activePage,"hydrate",s):null).catch(m=>this.bus?.emit("route:hydrate-error",{error:m,route:a,context:s}))}pulangkanGulir(e){let n=this.gulirDitahan;this.gulirDitahan=!1,!(!e||n)&&window.scrollTo({top:0,left:0,behavior:"instant"})}tahanGulirSekali(){this.gulirDitahan=!0}async leaveActivePage(){this.activePage&&(await this.call(this.activePage,"unmount"),await this.call(this.activePage,"dispose"),this.activePage.__workingStateKey&&this.store.destroyWorkingState(this.activePage.__workingStateKey),this.activePage=null)}async mountPage(e,n){let o=this.outlet(),i=Vt(e);i.__workingStateKey=n.route?.workingStateKey??null,i.__routeName=n.route?.name??null,this.activePage=i,await this.call(i,"bootstrap",n);let r=await i.mount(n);o.replaceChildren(r),await this.call(i,"bindEvents",n)}async ensureRoleSnapshot(e){let n=e?.role??"public";return!this.preloadManager||n==="public"?null:this.preloadManager.boot(n)}async call(e,n,o={}){typeof e?.[n]=="function"&&await e[n](o)}outlet(){return typeof this.outletResolver=="function"?this.outletResolver():this.outletResolver}location(){let e=window.location.pathname||"/",n=window.location.search.replace(/^\?/,"");return{path:this.normalize(e),query:Object.fromEntries(new URLSearchParams(n))}}match(e){for(let n of this.routes){let o=e.match(n.pattern);if(o)return{route:n,params:o.groups??{}}}return null}compile(e){let n=this.normalize(e),o=[],i=n.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,(r,a)=>(o.push(a),`__PARAM_${o.length-1}__`)).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/__PARAM_(\d+)__/g,(r,a)=>`(?<${o[Number(a)]}>[^/]+)`);return new RegExp(`^${i}$`)}normalize(e){let n=`/${String(e||"/").replace(/^#?\/?/,"")}`;return n==="/"?"/":n.replace(/\/$/,"")}dispose(){window.removeEventListener("popstate",this.handleChange),this.leaveActivePage()}};function Vt(t){return t instanceof Node?{mount:()=>t,hydrate:()=>{},bindEvents:()=>{},unmount:()=>{},dispose:()=>{}}:t}var C={async snapshot(t={},e={}){let n=await L.get(`/notifications/snapshot${J(t)}`,e);return{unread_count:n.data?.unread_count??0,items:n.data?.items??[]}},async list(t={},e={}){let n=await L.get(`/notifications${J(t)}`,e);return{items:n.data?.items??[],next_cursor:n.data?.next_cursor??null,unread_count:n.data?.unread_count??0}},async markRead(t,e={}){let n=await L.post(`/notifications/${encodeURIComponent(t)}/read`,{},e);return{id:n.data?.id??t,is_read:!!n.data?.is_read,read_at:n.data?.read_at??null,unread_count:n.data?.unread_count??0}},async markAllRead(t={}){let e=await L.post("/notifications/read-all",{},t);return{updated_count:e.data?.updated_count??0,unread_count:e.data?.unread_count??0}}};var rt="modules.notifications",gt=5,_=Object.freeze({unreadCount:0,items:[],workingItems:[],nextCursor:null,activeFilter:"all",isHydrated:!1,isLoading:!1,isMarkingAllRead:!1,markingIds:{},error:null,lastSyncedAt:null,lastMutationAt:null}),u={get(){return Zt(),f.get(rt,M())},snapshot(){let t=this.get();return{unreadCount:t.unreadCount??0,items:t.items??[],isHydrated:!!t.isHydrated,isLoading:!!t.isLoading,error:t.error??null}},working(){let t=this.get();return{unreadCount:t.unreadCount??0,workingItems:t.workingItems??[],nextCursor:t.nextCursor??null,activeFilter:t.activeFilter??"all",isLoading:!!t.isLoading,isMarkingAllRead:!!t.isMarkingAllRead,markingIds:t.markingIds??{},error:t.error??null}},setSnapshot(t={}){let e=this.get(),n=vt(e),o=xt(q(t.items).slice(0,gt),e,n);return b({...e,unreadCount:wt(t,e,n),items:o,isHydrated:!0,isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:snapshot-set"),this.snapshot()},hydrate(t={},{append:e=!1,filter:n=null}={}){let o=this.get(),i=vt(o),r=q(t.items),a=e?nt(o.workingItems??[],r):r,l=xt(a,o,i);return b({...o,unreadCount:wt(t,o,i),workingItems:l,nextCursor:t.next_cursor??t.nextCursor??null,activeFilter:n??o.activeFilter??"all",isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:hydrate"),this.working()},async loadList(t={},e={}){let n=at(t.status??this.get().activeFilter??"all"),o=t.cursor??null;this.setLoading(!0);try{let i=await C.list({...t,status:n},e);return this.hydrate(i,{append:!!o,filter:n})}catch(i){throw this.setError(i),i}},setLoading(t){b({...this.get(),isLoading:!!t},"notifications:loading")},setError(t){b({...this.get(),isLoading:!1,isMarkingAllRead:!1,error:ee(t)},"notifications:error")},applyMarkRead(t,e=T()){let n=this.get(),o=String(t),i=yt(n.items,o)||yt(n.workingItems,o);b({...n,unreadCount:i?Math.max(0,Number(n.unreadCount??0)-1):Number(n.unreadCount??0),items:U(n.items,o,e),workingItems:U(n.workingItems,o,e),markingIds:{...n.markingIds??{},[o]:!0},error:null,lastMutationAt:Date.now()},"notifications:mark-read-optimistic")},completeMarkRead(t,e={}){let n=this.get(),o=String(t),i={...n.markingIds??{}};delete i[o];let r=e.read_at??e.readAt??T();return b({...n,unreadCount:it(e.unread_count,e.unreadCount,n.unreadCount,0),items:U(n.items,o,r),workingItems:U(n.workingItems,o,r),markingIds:i,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-read-complete"),this.get()},async markRead(t,e={}){let n=String(t??"");if(!n)return this.get();let o=this.get();if(Jt(o,n)?.isRead)return o;this.applyMarkRead(n);try{let r=await C.markRead(n,e);return this.completeMarkRead(n,r)}catch(r){throw this.restore(o,"notifications:mark-read-rollback"),this.setError(r),r}},applyMarkAllRead(t=T()){let e=this.get();b({...e,unreadCount:0,items:ot(e.items,t),workingItems:ot(e.workingItems,t),isMarkingAllRead:!0,markingIds:{},error:null,lastMutationAt:Date.now()},"notifications:mark-all-optimistic")},completeMarkAllRead(t={}){let e=this.get();return b({...e,unreadCount:it(t.unread_count,t.unreadCount,0),isMarkingAllRead:!1,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-all-complete"),this.get()},async markAllRead(t={}){let e=this.get();this.applyMarkAllRead();try{let n=await C.markAllRead(t);return this.completeMarkAllRead(n)}catch(n){throw this.restore(e,"notifications:mark-all-rollback"),this.setError(n),n}},restore(t,e="notifications:rollback"){b(t??M(),e)},pushNotification(t){let e=kt(t);if(!e.id)return this.get();let n=this.get(),o=_t(n.items,e.id),i=_t(n.workingItems,e.id),r=!o&&!i&&!e.isRead?1:0,a=nt([e],n.items??[]).slice(0,gt),l=Xt(e,n.activeFilter)?nt([e],n.workingItems??[]):n.workingItems??[];return b({...n,unreadCount:Math.max(0,Number(n.unreadCount??0)+r),items:a,workingItems:l,error:null,lastSyncedAt:Date.now()},"notifications:push"),this.get()},reset(){b(M(),"notifications:reset")},subscribe(t){return f.subscribe((e,n)=>{t(e.modules?.notifications??M(),n)})}};function Zt(){f.get(rt,void 0)===void 0&&b(M(),"notifications:init")}function b(t,e){f.patchState(rt,Qt(t),e)}function M(){return{unreadCount:_.unreadCount,items:[],workingItems:[],nextCursor:_.nextCursor,activeFilter:_.activeFilter,isHydrated:_.isHydrated,isLoading:_.isLoading,isMarkingAllRead:_.isMarkingAllRead,markingIds:{},error:_.error,lastSyncedAt:_.lastSyncedAt,lastMutationAt:_.lastMutationAt}}function Qt(t={}){return{...M(),...t,unreadCount:Math.max(0,Number(t.unreadCount??0)),items:q(t.items),workingItems:q(t.workingItems),activeFilter:at(t.activeFilter??"all"),markingIds:{...t.markingIds??{}}}}function q(t=[]){return(Array.isArray(t)?t:[]).map(kt).filter(e=>e.id!=="")}function kt(t={}){let e=t.id??t.notification_id??"",n=t.data??t.data_json??{};return{id:String(e),type:String(t.type??"system_message"),title:String(t.title??""),body:String(t.body??""),data:te(n)?n:{},linkUrl:t.linkUrl??t.link_url??null,iconKey:t.iconKey??t.icon_key??null,priority:t.priority??"normal",sourceType:t.sourceType??t.source_type??null,sourceId:t.sourceId??t.source_id??null,actorUserId:t.actorUserId??t.actor_user_id??null,isRead:!!(t.isRead??t.is_read??!1),readAt:t.readAt??t.read_at??null,createdAt:t.createdAt??t.created_at??null,expiresAt:t.expiresAt??t.expires_at??null}}function at(t){return["all","unread","read"].includes(t)?t:"all"}function Xt(t,e="all"){let n=at(e);return n==="unread"?!t.isRead:n==="read"?t.isRead:!0}function nt(t=[],e=[]){let n=new Set;return[...t,...e].filter(o=>{let i=String(o.id??"");return!i||n.has(i)?!1:(n.add(i),!0)})}function _t(t=[],e){let n=String(e);return(t??[]).some(o=>String(o.id)===n)}function yt(t=[],e){let n=String(e);return(t??[]).some(o=>String(o.id)===n&&!o.isRead)}function Jt(t,e){let n=String(e);return[...t.items??[],...t.workingItems??[]].find(o=>String(o.id)===n)??null}function U(t=[],e,n){let o=String(e);return(t??[]).map(i=>String(i.id)===o?{...i,isRead:!0,readAt:i.readAt??n}:i)}function ot(t=[],e){return(t??[]).map(n=>({...n,isRead:!0,readAt:n.readAt??e}))}function vt(t={}){return!!(t.isMarkingAllRead||Object.keys(t.markingIds??{}).length)}function wt(t={},e={},n=!1){let o=it(t.unread_count,t.unreadCount,e.unreadCount,0);return n?Math.min(o,Number(e.unreadCount??0)):o}function xt(t=[],e={},n=!1){if(!n)return t;if(e.isMarkingAllRead)return ot(t,T());let o=new Map;return[...e.items??[],...e.workingItems??[]].filter(i=>i?.isRead).forEach(i=>o.set(String(i.id),i.readAt??T())),t.map(i=>{let r=o.get(String(i.id));return r?{...i,isRead:!0,readAt:r}:i})}function it(...t){for(let e of t){let n=Number(e);if(Number.isFinite(n))return Math.max(0,n)}return 0}function te(t){return t!==null&&typeof t=="object"&&!Array.isArray(t)}function ee(t){return t?.message??String(t||"Notifikasi gagal diproses.")}function T(){return new Date().toISOString()}var ne=45e3,B=45e3,D=null,G="",F=null,O=f,At=B,st=!1,x={setSnapshot(t={}){return u.setSnapshot(t)},async loadSnapshot(t={},e={}){let{store:n=f,...o}=e;u.setLoading(!0);try{let i=await C.snapshot(t,o);return G=P(n.get?.("auth",null)),u.setSnapshot(i)}catch(i){throw u.setError(i),i}},async ensureSnapshot({force:t=!1,ttlMs:e=ne,store:n=f}={}){let o=n?.get?.("auth",null)??f.get("auth",null);if(!V(o))return u.snapshot();let i=P(o),r=u.get(),a=Number(r.lastSyncedAt??0),l=!!r.isHydrated&&G===i&&a>0&&Date.now()-a<e;return!t&&l?u.snapshot():(D&&G===i||(G=i,D=this.loadSnapshot({},{store:n}).catch(c=>(u.setError(c),u.snapshot())).finally(()=>{D=null})),D)},hydrate(t={},e={}){return u.hydrate(t,e)},async loadList(t={},e={}){return u.loadList(t,e)},async markRead(t,e={}){return u.markRead(t,e)},async markAllRead(t={}){return u.markAllRead(t)},pushNotification(t){return u.pushNotification(t)},reset(){u.reset()},snapshot(){return u.snapshot()},working(){return u.working()},subscribe(t){return u.subscribe(t)},startPolling({intervalMs:t=B,store:e=f,immediate:n=!1}={}){return O=e??f,At=oe(t),st=!0,!Y(O)||W()?(this.stopPolling({keepEnabled:!0}),!1):(F!==null||(F=window.setInterval(()=>{this.pollSnapshot({store:O})},At),n&&this.pollSnapshot({store:O})),!0)},stopPolling({keepEnabled:t=!1}={}){F!==null&&(window.clearInterval(F),F=null),t||(st=!1)},restartPolling(t={}){return this.stopPolling(),this.startPolling(t)},pollSnapshot({store:t=O}={}){return!Y(t)||W()?Promise.resolve(u.snapshot()):this.ensureSnapshot({force:!0,store:t})},bindVisibilityLifecycle({store:t=f,intervalMs:e=B}={}){if(typeof document>"u")return()=>{};let n=()=>{if(W()){this.stopPolling({keepEnabled:!0});return}st&&Y(t)&&this.startPolling({store:t,intervalMs:e,immediate:!0})};return document.addEventListener("visibilitychange",n),()=>document.removeEventListener("visibilitychange",n)},bindAuthReset(t){let e=P(t?.get("auth",null));return t?.subscribe?.(n=>{let o=P(n.auth);e!==o&&(e=o,u.reset())})??(()=>{})},bindAuthLifecycle(t=f){let e=P(t?.get("auth",null));return t?.subscribe?.(n=>{let o=P(n.auth);e!==o&&(e=o,u.reset(),V(n.auth)&&this.ensureSnapshot({force:!0,store:t}))})??(()=>{})},bindRealtimeLifecycle(t=f,{intervalMs:e=B}={}){let n=[];n.push(this.bindAuthLifecycle(t)),n.push(this.bindVisibilityLifecycle({store:t,intervalMs:e})),Y(t)&&!W()&&this.startPolling({store:t,intervalMs:e,immediate:!0});let o=t?.subscribe?.(i=>{if(!V(i.auth)){this.stopPolling();return}W()||this.startPolling({store:t,intervalMs:e,immediate:!0})})??null;return o&&n.push(o),()=>{n.splice(0).forEach(i=>i?.()),this.stopPolling()}}};function P(t=null){let e=t?.user?.id??t?.user?.user_id??"",n=t?.role??t?.user?.role??"public";return`${e}:${n}`}function V(t=null){let e=t?.role??t?.user?.role??"public",n=t?.user?.id??t?.user?.user_id??null;return!!(t?.isAuthenticated&&n&&e!=="public")}function Y(t=f){return V(t?.get?.("auth",null)??f.get("auth",null))}function W(){return typeof document<"u"&&document.visibilityState==="hidden"}function oe(t){let e=Number(t);return Number.isFinite(e)?Math.max(3e4,Math.min(e,6e4)):B}var ie={payment:"creditCard",transaction:"shoppingBag",message:"message",offer:"tag",security:"shield",commission:"commission",settlement:"wallet",inspection:"clipboard",listing:"car",system:"bell",transaction_paid:"creditCard",transaction_new:"shoppingBag",transaction_processing:"shoppingBag",transaction_completed:"circleCheck",message_new:"message",security_alert:"shield",commission_accrued:"commission",settlement_paid:"wallet",inspection_needed:"clipboard",listing_approved:"car",listing_rejected:"triangleWarning",system_message:"bell"},re={payment:"blue",transaction:"red",message:"blue",offer:"green",security:"purple",commission:"green",settlement:"green",inspection:"blue",listing:"blue",system:"blue",transaction_paid:"blue",transaction_new:"red",transaction_processing:"red",transaction_completed:"green",message_new:"blue",security_alert:"purple",commission_accrued:"green",settlement_paid:"green",inspection_needed:"blue",listing_approved:"green",listing_rejected:"red",system_message:"blue"};function St({item:t={}}={}){let e=String(t.iconKey??t.icon_key??t.type??"system").trim()||"system",n=ie[e]??"bell",o=re[e]??"blue",i=document.createElement("span");return i.className=`pb-notification-icon pb-notification-icon--${o}`,i.setAttribute("aria-hidden","true"),i.append(w(n,{className:"pb-notification-icon__svg"})),i}function R(t,e){let n=String(t??"").trim();if(!n)return;let o=n.startsWith("#")?n.slice(1):n,i=o.startsWith("/")?o:`/${o}`;if(typeof e=="function"){e(i);return}z(i)}function It({item:t={},onNavigate:e=null,onClose:n=null}={}){let o=document.createElement("article");o.className="pb-notification-item",o.id=`ntf_item_${se(t.id)}`;let i=document.createElement("button");i.type="button",i.className="pb-notification-item__button",i.addEventListener("click",async()=>{let c=!Et(t);try{c&&t.id&&await x.markRead(t.id);let s=t.linkUrl??t.link_url??"";s&&(n?.(),R(s,e))}catch(s){$(s.message||"Gagal menandai notifikasi.",{type:"error"})}});let r=document.createElement("span");r.className=Et(t)?"pb-notification-item__dot pb-notification-item__dot--hidden":"pb-notification-item__dot",r.setAttribute("aria-hidden","true");let a=document.createElement("section");a.className="pb-notification-item__content",a.append(lt("h3",t.title||"Notifikasi"),lt("p",t.body||"Aktivitas baru tersedia."));let l=lt("span",ae(t.createdAt??t.created_at));return l.className="pb-notification-item__time",i.append(r,St({item:t}),a,l),o.append(i),o}function Et(t={}){return!!(t.isRead??t.is_read)}function ae(t){if(!t)return"";let e=new Date(t).getTime();if(!Number.isFinite(e))return"";let n=Math.max(0,Math.floor((Date.now()-e)/1e3));if(n<60)return"Baru saja";let o=Math.floor(n/60);if(o<60)return`${o}m lalu`;let i=Math.floor(o/60);if(i<24)return`${i}j lalu`;let r=Math.floor(i/24);return r<7?`${r}h lalu`:new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short"}).format(new Date(e))}function lt(t,e){let n=document.createElement(t);return n.textContent=e??"",n}function se(t){return String(t??"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"unknown"}function Ct({id:t="ntf_popover",open:e=!1,snapshot:n={},onClose:o=null,onNavigate:i=null}={}){let r=document.createElement("section");r.id=t,r.className=e?"pb-notification-popover is-open":"pb-notification-popover",r.hidden=!e,r.setAttribute("aria-hidden",e?"false":"true");let a=document.createElement("span");a.className="pb-notification-popover__pointer",a.setAttribute("aria-hidden","true");let l=document.createElement("section");l.className="pb-notification-popover__header";let c=document.createElement("h2");c.className="pb-notification-popover__title",c.textContent="Notifikasi";let s=document.createElement("button");s.type="button",s.className="pb-notification-popover__mark",s.textContent=n.isMarkingAllRead?"Memproses...":"Tandai semua dibaca",s.disabled=!!(n.isMarkingAllRead||!Number(n.unreadCount??0)),s.addEventListener("click",async()=>{try{await x.markAllRead(),$("Semua notifikasi ditandai dibaca.",{type:"success"})}catch(I){$(I.message||"Gagal menandai semua notifikasi.",{type:"error"})}}),l.append(c,s);let d=document.createElement("section");d.className="pb-notification-popover__list";let m=Array.isArray(n.items)?n.items.slice(0,5):[];n.error?d.append(Nt({title:"Notifikasi belum bisa dimuat",body:"Coba lagi nanti.",icon:"triangleWarning"})):m.length?m.forEach(I=>{d.append(It({item:I,onNavigate:i,onClose:o}))}):d.append(Nt({title:"Belum ada notifikasi",body:"Aktivitas penting akan muncul di sini.",icon:"bell"}));let g=document.createElement("button");g.type="button",g.className="pb-notification-popover__footer",g.addEventListener("click",()=>{o?.(),R("/notifications",i)});let y=document.createElement("span");return y.className="pb-notification-popover__footer-label",y.append(ct("bell","pb-notification-popover__footer-icon"),ut("span","Lihat semua notifikasi")),g.append(y,ct("chevronRight","pb-notification-popover__chevron")),r.append(a,l,d,g),r}function Nt({title:t,body:e,icon:n}){let o=document.createElement("section");return o.className="pb-notification-popover__state",o.append(ct(n,"pb-notification-popover__state-icon"),ut("h3",t),ut("p",e)),o}function ct(t,e){let n=document.createElement("span");return n.className=e,n.append(w(t,{className:"block h-4 w-4 leading-none"})),n}function ut(t,e){let n=document.createElement(t);return n.textContent=e??"",n}var Mt="pb-notification-components-style",Pt="notification_overlay_root";function Ve({idPrefix:t="ntf",onNavigate:e=null,compact:n=!1,subscribe:o=!0,withBackdrop:i=!1}={}){ce();let r=document.createElement("section");r.className="pb-notification-bell",r.id=`${t}_notification_host`;let a=!1,l=!1,c=null,s=null,d=null,m=null,g=null,y=()=>{a&&(a=!1,Z(),H(),j())},I=()=>y(),j=()=>{if(l)return;if(Z(),H(),!f.get("auth",{})?.isAuthenticated){r.hidden=!0,r.classList.remove("is-open"),r.replaceChildren(),a=!1;return}r.hidden=!1,r.classList.toggle("is-open",a);let v=x.snapshot(),k=x.working(),N={...v,isMarkingAllRead:k.isMarkingAllRead},p=Number(N.unreadCount??0),A=`${t}_ntf_popover`,Dt=`${t}_ntf_backdrop`,h=document.createElement("button");if(h.id=`${t}_ntf_bell_button`,h.type="button",h.className=n?"pb-notification-bell__button pb-notification-bell__button--compact":"pb-notification-bell__button",h.setAttribute("aria-label",a?"Tutup notifikasi":"Buka notifikasi"),h.setAttribute("aria-haspopup","dialog"),h.setAttribute("aria-expanded",a?"true":"false"),h.setAttribute("aria-controls",A),h.addEventListener("click",()=>{a=!a,j()}),h.append(w("bell",{className:"pb-notification-bell__icon"})),p>0){let E=document.createElement("span");E.id=`${t}_ntf_bell_badge`,E.className=p>9?"pb-notification-bell__badge pb-notification-bell__badge--count":"pb-notification-bell__badge",E.textContent=p>99?"99+":p>9?String(p):"",E.setAttribute("aria-label",`${p} notifikasi belum dibaca`),h.append(E)}let S=a?Ct({id:A,open:a,snapshot:N,onClose:y,onNavigate:E=>R(E,e)}):null;i&&S?(S.classList.add("pb-notification-popover--portal"),r.replaceChildren(h),Tt(Dt,S,h),dt({button:h,popover:S})):S?(r.replaceChildren(h,S),dt({button:h,popover:S})):r.replaceChildren(h)};return o&&(c=x.subscribe(j)),j(),window.addEventListener("popstate",I),r.dispose=()=>{l=!0,Z(),H(),c?.(),window.removeEventListener("popstate",I)},r;function dt({button:K,popover:v}){if(!a)return;let k=N=>{let p=N.target;p instanceof Node&&(v.contains(p)||K.contains(p)||y())};document.addEventListener("pointerdown",k,!0),s=()=>document.removeEventListener("pointerdown",k,!0)}function Z(){s?.(),s=null}function Tt(K,v,k){if(!a||!i||typeof document>"u"){H();return}let N=le(),p=document.createElement("button");p.id=K,p.type="button",p.className="pb-notification-popover__backdrop is-open",p.hidden=!1,p.setAttribute("aria-hidden","true"),p.tabIndex=-1,p.addEventListener("click",y),N.append(p,v),m=p,g=v,Rt(k,v);let A=()=>Rt(k,v);window.addEventListener("resize",A,{passive:!0}),window.addEventListener("scroll",A,{passive:!0,capture:!0}),d=()=>{window.removeEventListener("resize",A),window.removeEventListener("scroll",A,{capture:!0})}}function H(){d?.(),d=null,m?.remove(),m=null,g?.remove(),g=null}}function le(){let t=document.getElementById(Pt);return t||(t=document.createElement("div"),t.id=Pt,t.className="pb-notification-overlay-root",document.body.append(t),t)}function Rt(t,e){if(!t?.isConnected||!e?.isConnected)return;let n=t.getBoundingClientRect(),o=window.innerWidth||document.documentElement.clientWidth||0,i=window.innerHeight||document.documentElement.clientHeight||0,r=o<=520,a=o<=374?8:16,l=Math.max(280,Math.min(410,o-a*2)),c=n.left+n.width/2,s=r?Math.max(72,n.bottom+12):Math.max(a,n.bottom+16),d=r?a:Lt(n.right-l,a,Math.max(a,o-a-l)),m=Lt(d+l-c-14,24,Math.max(24,l-52)),g=Math.max(220,i-s-a);e.style.setProperty("--pb-notification-popover-top",`${Math.round(s)}px`),e.style.setProperty("--pb-notification-popover-left",`${Math.round(d)}px`),e.style.setProperty("--pb-notification-popover-width",`${Math.round(l)}px`),e.style.setProperty("--pb-notification-popover-max-height",`${Math.round(g)}px`),e.style.setProperty("--pb-notification-popover-pointer-right",`${Math.round(m)}px`)}function Lt(t,e,n){return Math.min(Math.max(t,e),n)}function ce(){if(document.getElementById(Mt))return;let t=document.createElement("style");t.id=Mt,t.textContent=`
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
      width: min(calc(100vw - 2rem), 380px);
      max-height: min(620px, calc(100vh - 6.5rem));
      display: flex;
      flex-direction: column;
      overflow: visible;
      border: 1.5px solid #1e81b0;
      border-right-width: 6px;
      border-radius: 22px;
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
      gap: 0.75rem;
      padding: 20px 18px 12px;
      border-radius: 22px 22px 0 0;
      background: #ffffff;
    }

    .pb-notification-popover__title {
      margin: 0;
      color: #111827;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.1;
    }

    .pb-notification-popover__mark {
      min-height: 2.25rem;
      border: 0;
      border-radius: var(--pb-radius-lg);
      background: transparent;
      color: var(--pb-danger);
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
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
      min-height: 72px;
      width: 100%;
      grid-template-columns: 10px 44px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 12px 18px;
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
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--pb-danger);
    }

    .pb-notification-item__dot--hidden {
      opacity: 0;
    }

    .pb-notification-icon {
      display: inline-flex;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
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
      gap: 2px;
    }

    .pb-notification-item__content h3 {
      margin: 0;
      overflow-wrap: anywhere;
      color: #111827;
      font-size: 0.88rem;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.25;
    }

    .pb-notification-item__content p {
      margin: 0;
      overflow-wrap: anywhere;
      color: #6b7280;
      font-size: 0.76rem;
      font-weight: 500;
      line-height: 1.32;
    }

    .pb-notification-item__time {
      align-self: start;
      padding-top: 2px;
      color: #6b7280;
      font-size: 0.72rem;
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
      min-height: 50px;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      border: 0;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 20px 20px;
      background: #ffffff;
      color: #111827;
      cursor: pointer;
      padding: 12px 18px;
      text-align: left;
    }

    .pb-notification-popover__footer:hover {
      background: #f8fafc;
    }

    .pb-notification-popover__footer-label {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
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
  `,document.head.append(t)}var $t="pb-account-mobile-footer-nav-style",ue=[{id:"home",label:"Home",icon:"home",path:"/buyer"},{id:"portfolio",label:"Portofolio",icon:"dashboard",path:"/buyer/portfolio"},{id:"catalog",label:"Katalog",icon:"carb",path:"/",featured:!0},{id:"notifications",label:"Notif",icon:"bell",path:"/notifications"},{id:"profile",label:"Profil",icon:"user",path:"/profile"}];function Je({items:t=ue,activePath:e="/buyer",onNavigate:n=null,resolveCatalogTarget:o=pt}={}){pe();let i=document.createElement("nav");i.id="byr_mobile_footer_nav",i.className="account-mobile-footer account-mobile-footer--buyer",i.dataset.ds="buyer.mobile.footer",i.setAttribute("aria-label","Navigasi buyer mobile");let r=document.createElement("section");r.className="account-mobile-footer__shell";let a=document.createElement("section");a.className="account-mobile-footer__bar";let l=document.createElement("section");l.id="byr_mobile_footer_nav_container",l.className="account-mobile-footer__items";let c=document.createElement("section");return c.className="account-mobile-footer__center",t.forEach(s=>{if(s.featured){c.append(zt({item:s,activePath:e,onNavigate:n,resolveCatalogTarget:o}));let d=document.createElement("span");d.className="account-mobile-footer__spacer",d.setAttribute("aria-hidden","true"),l.append(d);return}l.append(zt({item:s,activePath:e,onNavigate:n,resolveCatalogTarget:o}))}),r.append(a,l,c),i.append(r),i}function zt({item:t,activePath:e,onNavigate:n,resolveCatalogTarget:o}){let i=de(t,e),r=t.disabled?document.createElement("button"):document.createElement("a");r.id=`byr_nav_mobile_${t.id}`;let a=()=>t.id==="catalog"?o():t.path,l=a();r.className=t.featured?"account-mobile-footer__action":i?"account-mobile-footer__item account-mobile-footer__item--active":"account-mobile-footer__item",t.disabled?(r.type="button",r.disabled=!0,r.setAttribute("aria-disabled","true"),r.classList.add("account-mobile-footer__item--disabled")):(l?r.href=t.id==="catalog"?l:`#${l}`:r.setAttribute("aria-disabled","true"),r.addEventListener("click",d=>{d.preventDefault();let m=a();m&&n?.(m)})),i&&r.setAttribute("aria-current","page");let c=document.createElement("span");c.className=t.featured?"account-mobile-footer__action-icon":"account-mobile-footer__icon",c.append(w(t.icon,{className:"account-mobile-footer__svg"})),r.append(c);let s=document.createElement("span");return s.className=t.featured?"account-mobile-footer__action-label text-[#ff6600] mt-3":"account-mobile-footer__label",s.textContent=t.label,r.append(s),r.setAttribute("aria-label",t.label),r.title=t.label,r}function de(t,e){let n=String(e??"");return t.path==="/buyer"?n==="/buyer":t.path==="/buyer/portfolio"?n==="/buyer/portfolio"||n.startsWith("/buyer/transactions"):t.path==="/"?n==="/"||t.id==="catalog"&&n==="/buyer/cars":n.startsWith(t.path)}function pe(){if(document.getElementById($t))return;let t=document.createElement("style");t.id=$t,t.textContent=`
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
  `,document.head.append(t)}export{me as a,z as b,ge as c,bt as d,_ as e,x as f,St as g,R as h,Ve as i,ue as j,Je as k};
