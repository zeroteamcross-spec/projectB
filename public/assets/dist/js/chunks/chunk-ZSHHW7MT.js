import{b as l,c as pt,e as g,g as Q,k as z}from"./chunk-XTOXRMDB.js";import{b as P}from"./chunk-WVHJATZP.js";function B(t){let e=Dt(t),o=window.location.pathname+window.location.search;e!==o&&(window.history.pushState(null,"",e),window.dispatchEvent(new PopStateEvent("popstate")))}function Dt(t){let e=String(t??"").replace(/^#/,"");return e.startsWith("/")?e:`/${e}`}function le(t=document){let e=o=>{if(o.defaultPrevented||o.button!==0||o.metaKey||o.ctrlKey||o.shiftKey||o.altKey)return;let n=o.target.closest?.("a[href]");if(!n||n.target&&n.target!=="_self"||n.hasAttribute("download"))return;let i=n.getAttribute("href")||"";if(i.startsWith("#/")){o.preventDefault(),B(i);return}if(i===""||i==="#"){o.preventDefault();return}let r;try{r=new URL(n.href,window.location.href)}catch{return}r.origin!==window.location.origin||r.pathname===window.location.pathname&&r.search===window.location.search&&r.hash||(o.preventDefault(),B(r.pathname+r.search))};return t.addEventListener("click",e),()=>t.removeEventListener("click",e)}var dt=class{constructor({outlet:e,store:o,preloadManager:n,bus:i,notFound:r=null,guard:a=null,resolveMissing:s=null}={}){this.routes=[],this.resolveMissing=s,this.outletResolver=e,this.store=o,this.preloadManager=n,this.bus=i,this.notFound=r,this.guard=a,this.activePage=null,this.jalurTampil=null,this.gulirDitahan=!1,this.handleChange=this.handleChange.bind(this)}add(e){return this.routes.push({...e,pattern:e.pattern??this.compile(e.path)}),this}start(){return"scrollRestoration"in window.history&&(window.history.scrollRestoration="manual"),window.addEventListener("popstate",this.handleChange),this.handleChange(),()=>this.dispose()}navigate(e){B(e)}async handleChange(){let e=this.location(),o=this.match(e.path);if(!o&&typeof this.resolveMissing=="function")try{await this.resolveMissing(e.path)&&(o=this.match(e.path))}catch(m){console.error("Gagal memuat modul rute secara malas.",m)}let n=o?.route??null,i=o?.params??{},r=this.guard?.({route:n,params:i,location:e,router:this,store:this.store,bus:this.bus})??{type:"allow",route:n},a=r.route??n,s=r.params??i;if(r.type==="redirect"){await this.leaveActivePage(),this.bus?.emit("route:guard-redirect",{...r.meta,toPath:r.path}),this.navigate(r.path);return}let c={name:a?.name??null,path:e.path,params:s,query:e.query,route:a,requestedRoute:n,access:r,store:this.store,router:this,bus:this.bus};await this.ensureRoleSnapshot(a),await this.leaveActivePage(),this.store.patchState("app.currentRoute",{name:c.name,path:c.path,params:c.params,query:c.query,route:a?{name:a.name,path:a.path,shell:a.shell??"public",role:a.role??"public",workingStateKey:a.workingStateKey??null}:null},"route:change"),this.bus?.emit("route:change",c);let u=this.jalurTampil!==e.path;if(this.jalurTampil=e.path,this.gulirDitahan=!1,!a){await this.mountPage(this.notFound(c),c),this.pulangkanGulir(u),this.bus?.emit("route:mounted",c);return}a.workingStateKey&&this.store.destroyWorkingState(a.workingStateKey),await this.mountPage(a.page(c),c),this.pulangkanGulir(u),this.bus?.emit("route:mounted",c),this.preloadManager?.hydrateRoute(a,c).then(()=>this.activePage?.__routeName===a.name?this.call(this.activePage,"hydrate",c):null).catch(m=>this.bus?.emit("route:hydrate-error",{error:m,route:a,context:c}))}pulangkanGulir(e){let o=this.gulirDitahan;this.gulirDitahan=!1,!(!e||o)&&window.scrollTo({top:0,left:0,behavior:"instant"})}tahanGulirSekali(){this.gulirDitahan=!0}async leaveActivePage(){this.activePage&&(await this.call(this.activePage,"unmount"),await this.call(this.activePage,"dispose"),this.activePage.__workingStateKey&&this.store.destroyWorkingState(this.activePage.__workingStateKey),this.activePage=null)}async mountPage(e,o){let n=this.outlet(),i=Ft(e);i.__workingStateKey=o.route?.workingStateKey??null,i.__routeName=o.route?.name??null,this.activePage=i,await this.call(i,"bootstrap",o);let r=await i.mount(o);n.replaceChildren(r),await this.call(i,"bindEvents",o)}async ensureRoleSnapshot(e){let o=e?.role??"public";return!this.preloadManager||o==="public"?null:this.preloadManager.boot(o)}async call(e,o,n={}){typeof e?.[o]=="function"&&await e[o](n)}outlet(){return typeof this.outletResolver=="function"?this.outletResolver():this.outletResolver}location(){let e=window.location.pathname||"/",o=window.location.search.replace(/^\?/,"");return{path:this.normalize(e),query:Object.fromEntries(new URLSearchParams(o))}}match(e){for(let o of this.routes){let n=e.match(o.pattern);if(n)return{route:o,params:n.groups??{}}}return null}compile(e){let o=this.normalize(e),n=[],i=o.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,(r,a)=>(n.push(a),`__PARAM_${n.length-1}__`)).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/__PARAM_(\d+)__/g,(r,a)=>`(?<${n[Number(a)]}>[^/]+)`);return new RegExp(`^${i}$`)}normalize(e){let o=`/${String(e||"/").replace(/^#?\/?/,"")}`;return o==="/"?"/":o.replace(/\/$/,"")}dispose(){window.removeEventListener("popstate",this.handleChange),this.leaveActivePage()}};function Ft(t){return t instanceof Node?{mount:()=>t,hydrate:()=>{},bindEvents:()=>{},unmount:()=>{},dispose:()=>{}}:t}var N={async snapshot(t={},e={}){let o=await P.get(`/notifications/snapshot${Q(t)}`,e);return{unread_count:o.data?.unread_count??0,items:o.data?.items??[]}},async list(t={},e={}){let o=await P.get(`/notifications${Q(t)}`,e);return{items:o.data?.items??[],next_cursor:o.data?.next_cursor??null,unread_count:o.data?.unread_count??0}},async markRead(t,e={}){let o=await P.post(`/notifications/${encodeURIComponent(t)}/read`,{},e);return{id:o.data?.id??t,is_read:!!o.data?.is_read,read_at:o.data?.read_at??null,unread_count:o.data?.unread_count??0}},async markAllRead(t={}){let e=await P.post("/notifications/read-all",{},t);return{updated_count:e.data?.updated_count??0,unread_count:e.data?.unread_count??0}}};var et="modules.notifications",mt=5,_=Object.freeze({unreadCount:0,items:[],workingItems:[],nextCursor:null,activeFilter:"all",isHydrated:!1,isLoading:!1,isMarkingAllRead:!1,markingIds:{},error:null,lastSyncedAt:null,lastMutationAt:null}),p={get(){return Ut(),l.get(et,C())},snapshot(){let t=this.get();return{unreadCount:t.unreadCount??0,items:t.items??[],isHydrated:!!t.isHydrated,isLoading:!!t.isLoading,error:t.error??null}},working(){let t=this.get();return{unreadCount:t.unreadCount??0,workingItems:t.workingItems??[],nextCursor:t.nextCursor??null,activeFilter:t.activeFilter??"all",isLoading:!!t.isLoading,isMarkingAllRead:!!t.isMarkingAllRead,markingIds:t.markingIds??{},error:t.error??null}},setSnapshot(t={}){let e=this.get(),o=bt(e),n=_t(Y(t.items).slice(0,mt),e,o);return h({...e,unreadCount:gt(t,e,o),items:n,isHydrated:!0,isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:snapshot-set"),this.snapshot()},hydrate(t={},{append:e=!1,filter:o=null}={}){let n=this.get(),i=bt(n),r=Y(t.items),a=e?J(n.workingItems??[],r):r,s=_t(a,n,i);return h({...n,unreadCount:gt(t,n,i),workingItems:s,nextCursor:t.next_cursor??t.nextCursor??null,activeFilter:o??n.activeFilter??"all",isLoading:!1,error:null,lastSyncedAt:Date.now()},"notifications:hydrate"),this.working()},async loadList(t={},e={}){let o=ot(t.status??this.get().activeFilter??"all"),n=t.cursor??null;this.setLoading(!0);try{let i=await N.list({...t,status:o},e);return this.hydrate(i,{append:!!n,filter:o})}catch(i){throw this.setError(i),i}},setLoading(t){h({...this.get(),isLoading:!!t},"notifications:loading")},setError(t){h({...this.get(),isLoading:!1,isMarkingAllRead:!1,error:qt(t)},"notifications:error")},applyMarkRead(t,e=O()){let o=this.get(),n=String(t),i=ht(o.items,n)||ht(o.workingItems,n);h({...o,unreadCount:i?Math.max(0,Number(o.unreadCount??0)-1):Number(o.unreadCount??0),items:H(o.items,n,e),workingItems:H(o.workingItems,n,e),markingIds:{...o.markingIds??{},[n]:!0},error:null,lastMutationAt:Date.now()},"notifications:mark-read-optimistic")},completeMarkRead(t,e={}){let o=this.get(),n=String(t),i={...o.markingIds??{}};delete i[n];let r=e.read_at??e.readAt??O();return h({...o,unreadCount:tt(e.unread_count,e.unreadCount,o.unreadCount,0),items:H(o.items,n,r),workingItems:H(o.workingItems,n,r),markingIds:i,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-read-complete"),this.get()},async markRead(t,e={}){let o=String(t??"");if(!o)return this.get();let n=this.get();if(Ht(n,o)?.isRead)return n;this.applyMarkRead(o);try{let r=await N.markRead(o,e);return this.completeMarkRead(o,r)}catch(r){throw this.restore(n,"notifications:mark-read-rollback"),this.setError(r),r}},applyMarkAllRead(t=O()){let e=this.get();h({...e,unreadCount:0,items:X(e.items,t),workingItems:X(e.workingItems,t),isMarkingAllRead:!0,markingIds:{},error:null,lastMutationAt:Date.now()},"notifications:mark-all-optimistic")},completeMarkAllRead(t={}){let e=this.get();return h({...e,unreadCount:tt(t.unread_count,t.unreadCount,0),isMarkingAllRead:!1,error:null,lastSyncedAt:Date.now(),lastMutationAt:Date.now()},"notifications:mark-all-complete"),this.get()},async markAllRead(t={}){let e=this.get();this.applyMarkAllRead();try{let o=await N.markAllRead(t);return this.completeMarkAllRead(o)}catch(o){throw this.restore(e,"notifications:mark-all-rollback"),this.setError(o),o}},restore(t,e="notifications:rollback"){h(t??C(),e)},pushNotification(t){let e=yt(t);if(!e.id)return this.get();let o=this.get(),n=ft(o.items,e.id),i=ft(o.workingItems,e.id),r=!n&&!i&&!e.isRead?1:0,a=J([e],o.items??[]).slice(0,mt),s=Kt(e,o.activeFilter)?J([e],o.workingItems??[]):o.workingItems??[];return h({...o,unreadCount:Math.max(0,Number(o.unreadCount??0)+r),items:a,workingItems:s,error:null,lastSyncedAt:Date.now()},"notifications:push"),this.get()},reset(){h(C(),"notifications:reset")},subscribe(t){return l.subscribe((e,o)=>{t(e.modules?.notifications??C(),o)})}};function Ut(){l.get(et,void 0)===void 0&&h(C(),"notifications:init")}function h(t,e){l.patchState(et,Wt(t),e)}function C(){return{unreadCount:_.unreadCount,items:[],workingItems:[],nextCursor:_.nextCursor,activeFilter:_.activeFilter,isHydrated:_.isHydrated,isLoading:_.isLoading,isMarkingAllRead:_.isMarkingAllRead,markingIds:{},error:_.error,lastSyncedAt:_.lastSyncedAt,lastMutationAt:_.lastMutationAt}}function Wt(t={}){return{...C(),...t,unreadCount:Math.max(0,Number(t.unreadCount??0)),items:Y(t.items),workingItems:Y(t.workingItems),activeFilter:ot(t.activeFilter??"all"),markingIds:{...t.markingIds??{}}}}function Y(t=[]){return(Array.isArray(t)?t:[]).map(yt).filter(e=>e.id!=="")}function yt(t={}){let e=t.id??t.notification_id??"",o=t.data??t.data_json??{};return{id:String(e),type:String(t.type??"system_message"),title:String(t.title??""),body:String(t.body??""),data:Yt(o)?o:{},linkUrl:t.linkUrl??t.link_url??null,iconKey:t.iconKey??t.icon_key??null,priority:t.priority??"normal",sourceType:t.sourceType??t.source_type??null,sourceId:t.sourceId??t.source_id??null,actorUserId:t.actorUserId??t.actor_user_id??null,isRead:!!(t.isRead??t.is_read??!1),readAt:t.readAt??t.read_at??null,createdAt:t.createdAt??t.created_at??null,expiresAt:t.expiresAt??t.expires_at??null}}function ot(t){return["all","unread","read"].includes(t)?t:"all"}function Kt(t,e="all"){let o=ot(e);return o==="unread"?!t.isRead:o==="read"?t.isRead:!0}function J(t=[],e=[]){let o=new Set;return[...t,...e].filter(n=>{let i=String(n.id??"");return!i||o.has(i)?!1:(o.add(i),!0)})}function ft(t=[],e){let o=String(e);return(t??[]).some(n=>String(n.id)===o)}function ht(t=[],e){let o=String(e);return(t??[]).some(n=>String(n.id)===o&&!n.isRead)}function Ht(t,e){let o=String(e);return[...t.items??[],...t.workingItems??[]].find(n=>String(n.id)===o)??null}function H(t=[],e,o){let n=String(e);return(t??[]).map(i=>String(i.id)===n?{...i,isRead:!0,readAt:i.readAt??o}:i)}function X(t=[],e){return(t??[]).map(o=>({...o,isRead:!0,readAt:o.readAt??e}))}function bt(t={}){return!!(t.isMarkingAllRead||Object.keys(t.markingIds??{}).length)}function gt(t={},e={},o=!1){let n=tt(t.unread_count,t.unreadCount,e.unreadCount,0);return o?Math.min(n,Number(e.unreadCount??0)):n}function _t(t=[],e={},o=!1){if(!o)return t;if(e.isMarkingAllRead)return X(t,O());let n=new Map;return[...e.items??[],...e.workingItems??[]].filter(i=>i?.isRead).forEach(i=>n.set(String(i.id),i.readAt??O())),t.map(i=>{let r=n.get(String(i.id));return r?{...i,isRead:!0,readAt:r}:i})}function tt(...t){for(let e of t){let o=Number(e);if(Number.isFinite(o))return Math.max(0,o)}return 0}function Yt(t){return t!==null&&typeof t=="object"&&!Array.isArray(t)}function qt(t){return t?.message??String(t||"Notifikasi gagal diproses.")}function O(){return new Date().toISOString()}var wt=Object.freeze(["admin","super-admin","seller","buyer","affiliate","login","google-login","auth","api","cars","transactions","profile","notifications","public","showrooms","af","a","s","daftar-showroom","saas-landing","contoh-katalog","health","uploads","assets","tester","app"]);var vt="projectB:buyer:showroom-url",Gt=new RegExp(`^(?:${wt.join("|")})$`);function Vt(t){let e=t.match(/^#?\/s\/([^/?#]+)$/);if(e)return!!e[1];let o=t.match(/^#?\/([^/?#]+)$/);return!!o&&!Gt.test(o[1])}function Zt(t){let e=String(t??"").trim();return e?`/${encodeURIComponent(e)}`:""}function xt(t){if(t?.role!=="buyer")return"";let e=Zt(t.home_showroom_slug);if(!e||typeof window>"u")return e;try{window.localStorage?.setItem(vt,e)}catch{}return e}function kt(){if(typeof window>"u")return"";try{let t=String(window.localStorage?.getItem(vt)??"").trim();return Vt(t)?t:""}catch{return""}}var rt="projectB:buyer:showroom-icon-url",nt="projectB:buyer:showroom-icon-slug";async function At(t){let e=String(t?.home_showroom_slug??"").trim();if(t?.role!=="buyer"||!e)return St(),"";try{if(window.localStorage?.getItem(nt)===e)return it()}catch{}try{let o=await pt.validateSlug(e),n=String(o?.showroom?.icon_url??"").trim();return n?(window.localStorage?.setItem(rt,n),window.localStorage?.setItem(nt,e),n):(St(),"")}catch{return it()}}function St(){try{window.localStorage?.removeItem(rt),window.localStorage?.removeItem(nt)}catch{}}function it(){if(typeof window>"u")return"";try{return String(window.localStorage?.getItem(rt)??"").trim()}catch{return""}}function xe({size:t="h-11 w-11",wrapperClassName:e="",icon:o="car",iconSize:n="h-5 w-5"}={}){let i=document.createElement("span");i.className=["inline-flex shrink-0 items-center justify-center overflow-hidden leading-none",t,e].filter(Boolean).join(" ");let r=it();if(r){let a=document.createElement("img");return a.src=Qt(r),a.alt="Logo showroom",a.loading="lazy",a.className="block h-full w-full object-cover",a.addEventListener("error",()=>{i.replaceChildren(g(o,{className:`block ${n} leading-none`}))},{once:!0}),i.append(a),i}return i.append(g(o,{className:`block ${n} leading-none`})),i}function Qt(t){let e=String(t??"").trim();return!e||e.startsWith("http://")||e.startsWith("https://")||e.startsWith("data:")||e.startsWith("/")?e:`/${e.replace(/^\/+/,"")}`}var Ee={setContext({user:t=null,actor:e=null,impersonation:o=null}={}){l.patchState("auth",{user:t,actor:e,impersonation:o,isAuthenticated:!!t,role:t?.role??"public"},"auth:set-context"),l.patchState("app.activeRole",t?.role??"public","auth:set-role"),xt(t),At(t)},setUser(t){this.setContext({user:t,actor:null,impersonation:null})},patchUser(t={}){let e=this.user();if(!t||typeof t!="object"||Array.isArray(t))return e;if(!e)return Object.keys(t).length?(this.setContext({user:t,actor:this.actor(),impersonation:this.impersonation()}),t):e;let o={...e,...t};return this.setContext({user:o,actor:this.actor(),impersonation:this.impersonation()}),o},user(){return l.get("auth.user",null)},actor(){return l.get("auth.actor",null)},impersonation(){return l.get("auth.impersonation",null)},role(){return l.get("auth.role","public")},isAuthenticated(){return l.get("auth.isAuthenticated",!1)}};var Jt=45e3,F=45e3,T=null,q="",$=null,j=l,It=F,at=!1,x={setSnapshot(t={}){return p.setSnapshot(t)},async loadSnapshot(t={},e={}){let{store:o=l,...n}=e;p.setLoading(!0);try{let i=await N.snapshot(t,n);return q=M(o.get?.("auth",null)),p.setSnapshot(i)}catch(i){throw p.setError(i),i}},async ensureSnapshot({force:t=!1,ttlMs:e=Jt,store:o=l}={}){let n=o?.get?.("auth",null)??l.get("auth",null);if(!V(n))return p.snapshot();let i=M(n),r=p.get(),a=Number(r.lastSyncedAt??0),s=!!r.isHydrated&&q===i&&a>0&&Date.now()-a<e;return!t&&s?p.snapshot():(T&&q===i||(q=i,T=this.loadSnapshot({},{store:o}).catch(c=>(p.setError(c),p.snapshot())).finally(()=>{T=null})),T)},hydrate(t={},e={}){return p.hydrate(t,e)},async loadList(t={},e={}){return p.loadList(t,e)},async markRead(t,e={}){return p.markRead(t,e)},async markAllRead(t={}){return p.markAllRead(t)},pushNotification(t){return p.pushNotification(t)},reset(){p.reset()},snapshot(){return p.snapshot()},working(){return p.working()},subscribe(t){return p.subscribe(t)},startPolling({intervalMs:t=F,store:e=l,immediate:o=!1}={}){return j=e??l,It=Xt(t),at=!0,!G(j)||D()?(this.stopPolling({keepEnabled:!0}),!1):($!==null||($=window.setInterval(()=>{this.pollSnapshot({store:j})},It),o&&this.pollSnapshot({store:j})),!0)},stopPolling({keepEnabled:t=!1}={}){$!==null&&(window.clearInterval($),$=null),t||(at=!1)},restartPolling(t={}){return this.stopPolling(),this.startPolling(t)},pollSnapshot({store:t=j}={}){return!G(t)||D()?Promise.resolve(p.snapshot()):this.ensureSnapshot({force:!0,store:t})},bindVisibilityLifecycle({store:t=l,intervalMs:e=F}={}){if(typeof document>"u")return()=>{};let o=()=>{if(D()){this.stopPolling({keepEnabled:!0});return}at&&G(t)&&this.startPolling({store:t,intervalMs:e,immediate:!0})};return document.addEventListener("visibilitychange",o),()=>document.removeEventListener("visibilitychange",o)},bindAuthReset(t){let e=M(t?.get("auth",null));return t?.subscribe?.(o=>{let n=M(o.auth);e!==n&&(e=n,p.reset())})??(()=>{})},bindAuthLifecycle(t=l){let e=M(t?.get("auth",null));return t?.subscribe?.(o=>{let n=M(o.auth);e!==n&&(e=n,p.reset(),V(o.auth)&&this.ensureSnapshot({force:!0,store:t}))})??(()=>{})},bindRealtimeLifecycle(t=l,{intervalMs:e=F}={}){let o=[];o.push(this.bindAuthLifecycle(t)),o.push(this.bindVisibilityLifecycle({store:t,intervalMs:e})),G(t)&&!D()&&this.startPolling({store:t,intervalMs:e,immediate:!0});let n=t?.subscribe?.(i=>{if(!V(i.auth)){this.stopPolling();return}D()||this.startPolling({store:t,intervalMs:e,immediate:!0})})??null;return n&&o.push(n),()=>{o.splice(0).forEach(i=>i?.()),this.stopPolling()}}};function M(t=null){let e=t?.user?.id??t?.user?.user_id??"",o=t?.role??t?.user?.role??"public";return`${e}:${o}`}function V(t=null){let e=t?.role??t?.user?.role??"public",o=t?.user?.id??t?.user?.user_id??null;return!!(t?.isAuthenticated&&o&&e!=="public")}function G(t=l){return V(t?.get?.("auth",null)??l.get("auth",null))}function D(){return typeof document<"u"&&document.visibilityState==="hidden"}function Xt(t){let e=Number(t);return Number.isFinite(e)?Math.max(3e4,Math.min(e,6e4)):F}var te={payment:"creditCard",transaction:"shoppingBag",message:"message",offer:"tag",security:"shield",commission:"commission",settlement:"wallet",inspection:"clipboard",listing:"car",system:"bell",transaction_paid:"creditCard",transaction_new:"shoppingBag",transaction_processing:"shoppingBag",transaction_completed:"circleCheck",message_new:"message",security_alert:"shield",commission_accrued:"commission",settlement_paid:"wallet",inspection_needed:"clipboard",listing_approved:"car",listing_rejected:"triangleWarning",system_message:"bell"},ee={payment:"blue",transaction:"red",message:"blue",offer:"green",security:"purple",commission:"green",settlement:"green",inspection:"blue",listing:"blue",system:"blue",transaction_paid:"blue",transaction_new:"red",transaction_processing:"red",transaction_completed:"green",message_new:"blue",security_alert:"purple",commission_accrued:"green",settlement_paid:"green",inspection_needed:"blue",listing_approved:"green",listing_rejected:"red",system_message:"blue"};function Et({item:t={}}={}){let e=String(t.iconKey??t.icon_key??t.type??"system").trim()||"system",o=te[e]??"bell",n=ee[e]??"blue",i=document.createElement("span");return i.className=`pb-notification-icon pb-notification-icon--${n}`,i.setAttribute("aria-hidden","true"),i.append(g(o,{className:"pb-notification-icon__svg"})),i}function L(t,e){let o=String(t??"").trim();if(!o)return;let n=o.startsWith("#")?o.slice(1):o,i=n.startsWith("/")?n:`/${n}`;if(typeof e=="function"){e(i);return}B(i)}function Nt({item:t={},onNavigate:e=null,onClose:o=null}={}){let n=document.createElement("article");n.className="pb-notification-item",n.id=`ntf_item_${ne(t.id)}`;let i=document.createElement("button");i.type="button",i.className="pb-notification-item__button",i.addEventListener("click",async()=>{let c=!Rt(t);try{c&&t.id&&await x.markRead(t.id);let u=t.linkUrl??t.link_url??"";u&&(o?.(),L(u,e))}catch(u){z(u.message||"Gagal menandai notifikasi.",{type:"error"})}});let r=document.createElement("span");r.className=Rt(t)?"pb-notification-item__dot pb-notification-item__dot--hidden":"pb-notification-item__dot",r.setAttribute("aria-hidden","true");let a=document.createElement("section");a.className="pb-notification-item__content",a.append(st("h3",t.title||"Notifikasi"),st("p",t.body||"Aktivitas baru tersedia."));let s=st("span",oe(t.createdAt??t.created_at));return s.className="pb-notification-item__time",i.append(r,Et({item:t}),a,s),n.append(i),n}function Rt(t={}){return!!(t.isRead??t.is_read)}function oe(t){if(!t)return"";let e=new Date(t).getTime();if(!Number.isFinite(e))return"";let o=Math.max(0,Math.floor((Date.now()-e)/1e3));if(o<60)return"Baru saja";let n=Math.floor(o/60);if(n<60)return`${n}m lalu`;let i=Math.floor(n/60);if(i<24)return`${i}j lalu`;let r=Math.floor(i/24);return r<7?`${r}h lalu`:new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short"}).format(new Date(e))}function st(t,e){let o=document.createElement(t);return o.textContent=e??"",o}function ne(t){return String(t??"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"unknown"}function Mt({id:t="ntf_popover",open:e=!1,snapshot:o={},onClose:n=null,onNavigate:i=null}={}){let r=document.createElement("section");r.id=t,r.className=e?"pb-notification-popover is-open":"pb-notification-popover",r.hidden=!e,r.setAttribute("aria-hidden",e?"false":"true");let a=document.createElement("span");a.className="pb-notification-popover__pointer",a.setAttribute("aria-hidden","true");let s=document.createElement("section");s.className="pb-notification-popover__header";let c=document.createElement("h2");c.className="pb-notification-popover__title",c.textContent="Notifikasi";let u=document.createElement("button");u.type="button",u.className="pb-notification-popover__mark",u.textContent=o.isMarkingAllRead?"Memproses...":"Tandai semua dibaca",u.disabled=!!(o.isMarkingAllRead||!Number(o.unreadCount??0)),u.addEventListener("click",async()=>{try{await x.markAllRead(),z("Semua notifikasi ditandai dibaca.",{type:"success"})}catch(E){z(E.message||"Gagal menandai semua notifikasi.",{type:"error"})}}),s.append(c,u);let m=document.createElement("section");m.className="pb-notification-popover__list";let y=Array.isArray(o.items)?o.items.slice(0,5):[];o.error?m.append(Ct({title:"Notifikasi belum bisa dimuat",body:"Coba lagi nanti.",icon:"triangleWarning"})):y.length?y.forEach(E=>{m.append(Nt({item:E,onNavigate:i,onClose:n}))}):m.append(Ct({title:"Belum ada notifikasi",body:"Aktivitas penting akan muncul di sini.",icon:"bell"}));let b=document.createElement("button");b.type="button",b.className="pb-notification-popover__footer",b.addEventListener("click",()=>{n?.(),L("/notifications",i)});let w=document.createElement("span");return w.className="pb-notification-popover__footer-label",w.append(ct("bell","pb-notification-popover__footer-icon"),lt("span","Lihat semua notifikasi")),b.append(w,ct("chevronRight","pb-notification-popover__chevron")),r.append(a,s,m,b),r}function Ct({title:t,body:e,icon:o}){let n=document.createElement("section");return n.className="pb-notification-popover__state",n.append(ct(o,"pb-notification-popover__state-icon"),lt("h3",t),lt("p",e)),n}function ct(t,e){let o=document.createElement("span");return o.className=e,o.append(g(t,{className:"block h-4 w-4 leading-none"})),o}function lt(t,e){let o=document.createElement(t);return o.textContent=e??"",o}var Lt="pb-notification-components-style",Pt="notification_overlay_root";function Xe({idPrefix:t="ntf",onNavigate:e=null,compact:o=!1,subscribe:n=!0,withBackdrop:i=!1}={}){re();let r=document.createElement("section");r.className="pb-notification-bell",r.id=`${t}_notification_host`;let a=!1,s=!1,c=null,u=null,m=null,y=null,b=null,w=()=>{a&&(a=!1,Z(),W(),U())},E=()=>w(),U=()=>{if(s)return;if(Z(),W(),!l.get("auth",{})?.isAuthenticated){r.hidden=!0,r.classList.remove("is-open"),r.replaceChildren(),a=!1;return}r.hidden=!1,r.classList.toggle("is-open",a);let v=x.snapshot(),k=x.working(),R={...v,isMarkingAllRead:k.isMarkingAllRead},d=Number(R.unreadCount??0),S=`${t}_ntf_popover`,jt=`${t}_ntf_backdrop`,f=document.createElement("button");if(f.id=`${t}_ntf_bell_button`,f.type="button",f.className=o?"pb-notification-bell__button pb-notification-bell__button--compact":"pb-notification-bell__button",f.setAttribute("aria-label",a?"Tutup notifikasi":"Buka notifikasi"),f.setAttribute("aria-haspopup","dialog"),f.setAttribute("aria-expanded",a?"true":"false"),f.setAttribute("aria-controls",S),f.addEventListener("click",()=>{a=!a,U()}),f.append(g("bell",{className:"pb-notification-bell__icon"})),d>0){let I=document.createElement("span");I.id=`${t}_ntf_bell_badge`,I.className=d>9?"pb-notification-bell__badge pb-notification-bell__badge--count":"pb-notification-bell__badge",I.textContent=d>99?"99+":d>9?String(d):"",I.setAttribute("aria-label",`${d} notifikasi belum dibaca`),f.append(I)}let A=a?Mt({id:S,open:a,snapshot:R,onClose:w,onNavigate:I=>L(I,e)}):null;i&&A?(A.classList.add("pb-notification-popover--portal"),r.replaceChildren(f),$t(jt,A,f),ut({button:f,popover:A})):A?(r.replaceChildren(f,A),ut({button:f,popover:A})):r.replaceChildren(f)};return n&&(c=x.subscribe(U)),U(),window.addEventListener("popstate",E),r.dispose=()=>{s=!0,Z(),W(),c?.(),window.removeEventListener("popstate",E)},r;function ut({button:K,popover:v}){if(!a)return;let k=R=>{let d=R.target;d instanceof Node&&(v.contains(d)||K.contains(d)||w())};document.addEventListener("pointerdown",k,!0),u=()=>document.removeEventListener("pointerdown",k,!0)}function Z(){u?.(),u=null}function $t(K,v,k){if(!a||!i||typeof document>"u"){W();return}let R=ie(),d=document.createElement("button");d.id=K,d.type="button",d.className="pb-notification-popover__backdrop is-open",d.hidden=!1,d.setAttribute("aria-hidden","true"),d.tabIndex=-1,d.addEventListener("click",w),R.append(d,v),y=d,b=v,zt(k,v);let S=()=>zt(k,v);window.addEventListener("resize",S,{passive:!0}),window.addEventListener("scroll",S,{passive:!0,capture:!0}),m=()=>{window.removeEventListener("resize",S),window.removeEventListener("scroll",S,{capture:!0})}}function W(){m?.(),m=null,y?.remove(),y=null,b?.remove(),b=null}}function ie(){let t=document.getElementById(Pt);return t||(t=document.createElement("div"),t.id=Pt,t.className="pb-notification-overlay-root",document.body.append(t),t)}function zt(t,e){if(!t?.isConnected||!e?.isConnected)return;let o=t.getBoundingClientRect(),n=window.innerWidth||document.documentElement.clientWidth||0,i=window.innerHeight||document.documentElement.clientHeight||0,r=n<=520,a=n<=374?8:16,s=Math.max(280,Math.min(410,n-a*2)),c=o.left+o.width/2,u=r?Math.max(72,o.bottom+12):Math.max(a,o.bottom+16),m=r?a:Bt(o.right-s,a,Math.max(a,n-a-s)),y=Bt(m+s-c-14,24,Math.max(24,s-52)),b=Math.max(220,i-u-a);e.style.setProperty("--pb-notification-popover-top",`${Math.round(u)}px`),e.style.setProperty("--pb-notification-popover-left",`${Math.round(m)}px`),e.style.setProperty("--pb-notification-popover-width",`${Math.round(s)}px`),e.style.setProperty("--pb-notification-popover-max-height",`${Math.round(b)}px`),e.style.setProperty("--pb-notification-popover-pointer-right",`${Math.round(y)}px`)}function Bt(t,e,o){return Math.min(Math.max(t,e),o)}function re(){if(document.getElementById(Lt))return;let t=document.createElement("style");t.id=Lt,t.textContent=`
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
  `,document.head.append(t)}var Ot="pb-account-mobile-footer-nav-style",ae=[{id:"home",label:"Home",icon:"home",path:"/buyer"},{id:"portfolio",label:"Portofolio",icon:"dashboard",path:"/buyer/portfolio"},{id:"catalog",label:"Katalog",icon:"carb",path:"/",featured:!0},{id:"notifications",label:"Notif",icon:"bell",path:"/notifications"},{id:"profile",label:"Profil",icon:"user",path:"/profile"}];function no({items:t=ae,activePath:e="/buyer",onNavigate:o=null}={}){ce();let n=document.createElement("nav");n.id="byr_mobile_footer_nav",n.className="account-mobile-footer account-mobile-footer--buyer",n.dataset.ds="buyer.mobile.footer",n.setAttribute("aria-label","Navigasi buyer mobile");let i=document.createElement("section");i.className="account-mobile-footer__shell";let r=document.createElement("section");r.className="account-mobile-footer__bar";let a=document.createElement("section");a.id="byr_mobile_footer_nav_container",a.className="account-mobile-footer__items";let s=document.createElement("section");return s.className="account-mobile-footer__center",t.forEach(c=>{if(c.featured){s.append(Tt({item:c,activePath:e,onNavigate:o}));let u=document.createElement("span");u.className="account-mobile-footer__spacer",u.setAttribute("aria-hidden","true"),a.append(u);return}a.append(Tt({item:c,activePath:e,onNavigate:o}))}),i.append(r,a,s),n.append(i),n}function Tt({item:t,activePath:e,onNavigate:o}){let n=se(t,e),i=t.disabled?document.createElement("button"):document.createElement("a");i.id=`byr_nav_mobile_${t.id}`;let r=t.id==="catalog"?kt():t.path;i.className=t.featured?"account-mobile-footer__action":n?"account-mobile-footer__item account-mobile-footer__item--active":"account-mobile-footer__item",t.disabled?(i.type="button",i.disabled=!0,i.setAttribute("aria-disabled","true"),i.classList.add("account-mobile-footer__item--disabled")):(r?i.href=t.id==="catalog"?r:`#${r}`:i.setAttribute("aria-disabled","true"),i.addEventListener("click",c=>{c.preventDefault(),r&&o?.(r)})),n&&i.setAttribute("aria-current","page");let a=document.createElement("span");a.className=t.featured?"account-mobile-footer__action-icon":"account-mobile-footer__icon",a.append(g(t.icon,{className:"account-mobile-footer__svg"})),i.append(a);let s=document.createElement("span");return s.className=t.featured?"account-mobile-footer__action-label text-[#ff6600] mt-3":"account-mobile-footer__label",s.textContent=t.label,i.append(s),i.setAttribute("aria-label",t.label),i.title=t.label,i}function se(t,e){let o=String(e??"");return t.path==="/buyer"?o==="/buyer":t.path==="/buyer/portfolio"?o==="/buyer/portfolio"||o.startsWith("/buyer/transactions"):t.path==="/"?o==="/"||t.id==="catalog"&&o==="/buyer/cars":o.startsWith(t.path)}function ce(){if(document.getElementById(Ot))return;let t=document.createElement("style");t.id=Ot,t.textContent=`
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
  `,document.head.append(t)}export{B as a,le as b,dt as c,wt as d,kt as e,xe as f,Ee as g,_ as h,x as i,Et as j,L as k,Xe as l,ae as m,no as n};
