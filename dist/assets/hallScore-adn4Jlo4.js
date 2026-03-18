import{m as E,l as M,p as k}from"./common-Bs8lpwK1.js";const g=[{key:"final",label:"最终得分"},{key:"personal",label:"个人维度"},{key:"art",label:"艺术维度"},{key:"external",label:"外部维度"}],h=[{key:"12m",label:"最近一年",months:12},{key:"6m",label:"最近六个月",months:6},{key:"3m",label:"最近三个月",months:3},{key:"1m",label:"最近一个月",months:1}],N=[{key:"90",label:"90-100 分",kicker:"高分区",min:90},{key:"80",label:"80-89 分",kicker:"核心区",min:80},{key:"70",label:"70-79 分",kicker:"稳态区",min:70},{key:"60",label:"60-69 分",kicker:"低分区",min:60},{key:"0",label:"60 分以下",kicker:"极低分区",min:0}],s={movies:[],mode:"final",activeTag:"全部",activeTime:"12m"};function u(e){return typeof e=="number"&&Number.isFinite(e)?e:0}function l(e){return u(e).toFixed(1)}function $(e){if(!e)return"未记录";const t=new Date(e);if(Number.isNaN(t.getTime()))return e;const n=t.getFullYear(),r=String(t.getMonth()+1).padStart(2,"0"),a=String(t.getDate()).padStart(2,"0");return`${n}-${r}-${a}`}function y(e){if(!e.watchDate)return Number.NEGATIVE_INFINITY;const t=Date.parse(e.watchDate);return Number.isFinite(t)?t:Number.NEGATIVE_INFINITY}function v(e){const t=g.find(n=>n.key===e);return t?t.label:"最终得分"}function w(e){const t=new Set;return e.forEach(n=>{(Array.isArray(n.tags)?n.tags:[]).forEach(a=>t.add(a))}),["全部",...Array.from(t)]}function I(e){const t=e.summaryScores??{},n=u(t.personal),r=u(t.art),a=u(t.external),o=Math.max(n,r,a),c=o>0,i=u(t.total)||u(e.rating)*10,d=c?o:i,m=c?[["personal",n],["art",r],["external",a]].filter(b=>b[1]===o).map(b=>b[0]):[];return{personal:n,art:r,external:a,final:d,dominantKeys:m}}function f(e,t){return t==="personal"?e._scoreProfile.personal:t==="art"?e._scoreProfile.art:t==="external"?e._scoreProfile.external:e._scoreProfile.final}function L(e){return e>=90?"S":e>=80?"A":e>=70?"B":e>=60?"C":"F"}function D(e){return e>=90?"90":e>=80?"80":e>=70?"70":e>=60?"60":"0"}function A(e){return e.dominantKeys.length?e.dominantKeys.length>1?"并列主导":e.dominantKeys[0]==="personal"?"个人主导":e.dominantKeys[0]==="art"?"艺术主导":"外部主导":"未判定"}function _(e){const t=N.map(r=>({...r,movies:[]})),n=new Map(t.map(r=>[r.key,r]));return e.forEach(r=>{const a=f(r,s.mode),o=D(a),c=n.get(o);c&&c.movies.push(r)}),t}function T(){const e=document.querySelector("#score-mode-bar");e.innerHTML="",g.forEach(t=>{const n=document.createElement("button");n.type="button",n.className="filter-btn",n.classList.toggle("active",s.mode===t.key),n.textContent=t.label,n.addEventListener("click",()=>{s.mode=t.key,T(),p()}),e.append(n)})}function S(){const e=document.querySelector("#score-tag-filter-bar");e.innerHTML="",w(s.movies).forEach(t=>{const n=document.createElement("button");n.type="button",n.className="filter-btn",n.classList.toggle("active",s.activeTag===t),n.textContent=t,n.addEventListener("click",()=>{s.activeTag=t,S(),p()}),e.append(n)})}function x(){const e=document.querySelector("#score-time-filter-bar");e.innerHTML="",h.forEach(t=>{const n=document.createElement("button");n.type="button",n.className="filter-btn",n.classList.toggle("active",s.activeTime===t.key),n.textContent=t.label,n.addEventListener("click",()=>{s.activeTime=t.key,x(),p()}),e.append(n)})}function B(e){const t=h.find(a=>a.key===e);if(!t)return Number.NEGATIVE_INFINITY;const n=new Date,r=new Date(n);return r.setMonth(r.getMonth()-t.months),r.setHours(0,0,0,0),r.getTime()}function F(){const e=B(s.activeTime),n=(s.activeTag==="全部"?[...s.movies]:s.movies.filter(r=>(Array.isArray(r.tags)?r.tags:[]).includes(s.activeTag))).filter(r=>{const a=y(r);return Number.isFinite(a)&&a>=e});return n.sort((r,a)=>{const o=f(a,s.mode)-f(r,s.mode);if(o!==0)return o;const c=a._scoreProfile.final-r._scoreProfile.final;return c!==0?c:y(a)-y(r)}),n}function P(e){return e.length?`
    <section class="score-top-grid" aria-label="榜单前三">
      ${e.slice(0,3).map((t,n)=>{const r=t._scoreProfile,a=f(t,s.mode),o=String(t.logline||"").trim();return`
            <a class="score-top-card" href="/movie.html?id=${encodeURIComponent(t.id)}">
              <span class="score-top-rank">#${n+1}</span>
              <div class="score-top-poster"><img src="${k(t)}" alt="${t.titleZh} 海报" loading="lazy" /></div>
              <div class="score-top-body">
                <h3>${t.titleZh}</h3>
                ${o?`<p class="score-top-logline">${o}</p>`:""}
                <p>${v(s.mode)} ${l(a)} · 最终 ${l(r.final)}</p>
                <p>${A(r)} · ${$(t.watchDate)}</p>
              </div>
            </a>
          `}).join("")}
    </section>
  `:""}function C(e,t){const n=e._scoreProfile,r=f(e,s.mode),a=L(r),o=Array.isArray(e.tags)?e.tags.slice(0,3):[],c=String(e.logline||"").trim();return`
    <a class="score-rank-row" href="/movie.html?id=${encodeURIComponent(e.id)}">
      <div class="score-rank-num">${String(t).padStart(2,"0")}</div>
      <div class="score-rank-poster">
        <img src="${k(e)}" alt="${e.titleZh} 海报" loading="lazy" />
      </div>
      <div class="score-rank-main">
        <div class="score-rank-head">
          <h3>${e.titleZh}</h3>
          <span class="score-rank-tier tier-${a}">${a}</span>
        </div>
        ${c?`<p class="score-rank-logline">${c}</p>`:""}
        <p class="score-rank-meta">${v(s.mode)} ${l(r)} · 最终 ${l(n.final)} · ${$(e.watchDate)}</p>
        <div class="score-rank-bars">
          <span class="rank-bar personal${s.mode==="personal"?" active":""}" style="--w:${n.personal}%;">个 ${l(n.personal)}</span>
          <span class="rank-bar art${s.mode==="art"?" active":""}" style="--w:${n.art}%;">艺 ${l(n.art)}</span>
          <span class="rank-bar external${s.mode==="external"?" active":""}" style="--w:${n.external}%;">外 ${l(n.external)}</span>
        </div>
        ${o.length?`<div class="score-rank-tags">${o.map(i=>`<span>${i}</span>`).join("")}</div>`:""}
      </div>
    </a>
  `}function q(e){return`
    <aside class="score-range-index" aria-label="分数区间目录">
      <p class="score-range-index-kicker">目录</p>
      <h3 class="score-range-index-title">快速前往分数区间</h3>
      <nav class="score-range-index-nav">
        ${e.map(t=>{const n=t.movies.length===0;return`
              <a
                class="score-index-link${n?" is-empty":""}"
                href="#score-band-${t.key}"
                ${n?'aria-disabled="true"':""}
              >
                <span>${t.label}</span>
                <em>${t.movies.length} 部</em>
              </a>
            `}).join("")}
      </nav>
    </aside>
  `}function H(e,t){return e.map(n=>{const r=n.movies.length?`
          <div class="score-rank-list">
            ${n.movies.map(a=>C(a,t.get(a.id)??0)).join("")}
          </div>
        `:'<div class="score-band-empty">当前区间暂无电影。</div>';return`
        <section class="score-band-section" id="score-band-${n.key}">
          <header class="score-band-head">
            <div>
              <p class="score-band-kicker">${n.kicker}</p>
              <h3>${n.label}</h3>
            </div>
            <span>${n.movies.length} 部</span>
          </header>
          ${r}
        </section>
      `}).join("")}function p(){const e=document.querySelector("#score-leaderboard"),t=F();if(!t.length){e.innerHTML='<div class="empty">当前标签与时间筛选下暂无可展示的电影。</div>';return}const n=P(t),r=new Map(t.map((i,d)=>[i.id,d+1])),a=_(t),o=q(a),c=H(a,r);e.innerHTML=`
    <section class="score-rank-layout">
      ${o}
      <div class="score-rank-content">
        ${n}
        <div class="score-band-stack" aria-label="分数区间榜单">
          ${c}
        </div>
      </div>
    </section>
  `,e.querySelectorAll('.score-index-link[href^="#score-band-"]').forEach(i=>{i.addEventListener("click",d=>{if(i.classList.contains("is-empty")){d.preventDefault();return}const m=document.querySelector(i.getAttribute("href"));m&&(d.preventDefault(),m.scrollIntoView({behavior:"smooth",block:"start"}))})})}async function j(){E();try{const e=await M();s.movies=e.map(t=>({...t,_scoreProfile:I(t)})),T(),S(),x(),p()}catch(e){console.error(e),document.querySelector("#score-leaderboard").innerHTML='<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>'}}j();
