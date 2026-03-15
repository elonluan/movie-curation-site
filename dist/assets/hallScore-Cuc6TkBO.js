import{m as x,l as T,p as $}from"./common-BJ_CqIzc.js";const b=[{key:"final",label:"最终得分"},{key:"personal",label:"个人维度"},{key:"art",label:"艺术维度"},{key:"external",label:"外部维度"}],M=[{key:"90",label:"90-100 分",kicker:"高分区",min:90},{key:"80",label:"80-89 分",kicker:"核心区",min:80},{key:"70",label:"70-79 分",kicker:"稳态区",min:70},{key:"0",label:"70 分以下",kicker:"观察区",min:0}],s={movies:[],mode:"final",activeTag:"全部"};function u(e){return typeof e=="number"&&Number.isFinite(e)?e:0}function i(e){return u(e).toFixed(1)}function g(e){if(!e)return"未记录";const r=new Date(e);if(Number.isNaN(r.getTime()))return e;const n=r.getFullYear(),t=String(r.getMonth()+1).padStart(2,"0"),a=String(r.getDate()).padStart(2,"0");return`${n}-${t}-${a}`}function k(e){if(!e.watchDate)return Number.NEGATIVE_INFINITY;const r=Date.parse(e.watchDate);return Number.isFinite(r)?r:Number.NEGATIVE_INFINITY}function y(e){const r=b.find(n=>n.key===e);return r?r.label:"最终得分"}function E(e){const r=new Set;return e.forEach(n=>{(Array.isArray(n.tags)?n.tags:[]).forEach(a=>r.add(a))}),["全部",...Array.from(r)]}function w(e){const r=e.summaryScores??{},n=u(r.personal),t=u(r.art),a=u(r.external),o=Math.max(n,t,a),c=o>0,l=u(r.total)||u(e.rating)*10,d=c?o:l,p=c?[["personal",n],["art",t],["external",a]].filter(m=>m[1]===o).map(m=>m[0]):[];return{personal:n,art:t,external:a,final:d,dominantKeys:p}}function f(e,r){return r==="personal"?e._scoreProfile.personal:r==="art"?e._scoreProfile.art:r==="external"?e._scoreProfile.external:e._scoreProfile.final}function L(e){return e>=90?"S":e>=80?"A":e>=70?"B":"C"}function N(e){return e>=90?"90":e>=80?"80":e>=70?"70":"0"}function A(e){return e.dominantKeys.length?e.dominantKeys.length>1?"并列主导":e.dominantKeys[0]==="personal"?"个人主导":e.dominantKeys[0]==="art"?"艺术主导":"外部主导":"未判定"}function D(e){const r=M.map(t=>({...t,movies:[]})),n=new Map(r.map(t=>[t.key,t]));return e.forEach(t=>{const a=f(t,s.mode),o=N(a),c=n.get(o);c&&c.movies.push(t)}),r}function v(){const e=document.querySelector("#score-mode-bar");e.innerHTML="",b.forEach(r=>{const n=document.createElement("button");n.type="button",n.className="filter-btn",n.classList.toggle("active",s.mode===r.key),n.textContent=r.label,n.addEventListener("click",()=>{s.mode=r.key,v(),h()}),e.append(n)})}function S(){const e=document.querySelector("#score-tag-filter-bar");e.innerHTML="",E(s.movies).forEach(r=>{const n=document.createElement("button");n.type="button",n.className="filter-btn",n.classList.toggle("active",s.activeTag===r),n.textContent=r,n.addEventListener("click",()=>{s.activeTag=r,S(),h()}),e.append(n)})}function I(){const e=s.activeTag==="全部"?[...s.movies]:s.movies.filter(r=>(Array.isArray(r.tags)?r.tags:[]).includes(s.activeTag));return e.sort((r,n)=>{const t=f(n,s.mode)-f(r,s.mode);if(t!==0)return t;const a=n._scoreProfile.final-r._scoreProfile.final;return a!==0?a:k(n)-k(r)}),e}function _(e){const r=document.querySelector("#score-summary");if(!e.length){r.innerHTML="";return}const n=e[0],t=f(n,s.mode);r.innerHTML=`
    <p class="score-summary-kicker">Ranking Rule</p>
    <h2 class="score-summary-title">当前榜单按「${y(s.mode)}」从高到低排列</h2>
    <p class="score-summary-text">最终分规则固定为 max(个人, 艺术, 外部)。当前共 ${e.length} 部，榜首《${n.titleZh}》得分 ${i(t)}。</p>
  `}function P(e){return e.length?`
    <section class="score-top-grid" aria-label="榜单前三">
      ${e.slice(0,3).map((r,n)=>{const t=r._scoreProfile,a=f(r,s.mode);return`
            <a class="score-top-card" href="/movie.html?id=${encodeURIComponent(r.id)}">
              <span class="score-top-rank">#${n+1}</span>
              <div class="score-top-poster"><img src="${$(r)}" alt="${r.titleZh} 海报" loading="lazy" /></div>
              <div class="score-top-body">
                <h3>${r.titleZh}</h3>
                <p>${y(s.mode)} ${i(a)} · 最终 ${i(t.final)}</p>
                <p>${A(t)} · ${g(r.watchDate)}</p>
              </div>
            </a>
          `}).join("")}
    </section>
  `:""}function B(e,r){const n=e._scoreProfile,t=f(e,s.mode),a=L(t),o=Array.isArray(e.tags)?e.tags.slice(0,3):[];return`
    <a class="score-rank-row" href="/movie.html?id=${encodeURIComponent(e.id)}">
      <div class="score-rank-num">${String(r).padStart(2,"0")}</div>
      <div class="score-rank-poster">
        <img src="${$(e)}" alt="${e.titleZh} 海报" loading="lazy" />
      </div>
      <div class="score-rank-main">
        <div class="score-rank-head">
          <h3>${e.titleZh}</h3>
          <span class="score-rank-tier tier-${a}">${a}</span>
        </div>
        <p class="score-rank-meta">${y(s.mode)} ${i(t)} · 最终 ${i(n.final)} · ${g(e.watchDate)}</p>
        <div class="score-rank-bars">
          <span class="rank-bar personal${s.mode==="personal"?" active":""}" style="--w:${n.personal}%;">个 ${i(n.personal)}</span>
          <span class="rank-bar art${s.mode==="art"?" active":""}" style="--w:${n.art}%;">艺 ${i(n.art)}</span>
          <span class="rank-bar external${s.mode==="external"?" active":""}" style="--w:${n.external}%;">外 ${i(n.external)}</span>
        </div>
        ${o.length?`<div class="score-rank-tags">${o.map(c=>`<span>${c}</span>`).join("")}</div>`:""}
      </div>
    </a>
  `}function q(e){return`
    <aside class="score-range-index" aria-label="分数区间目录">
      <p class="score-range-index-kicker">目录</p>
      <h3 class="score-range-index-title">快速前往分数区间</h3>
      <nav class="score-range-index-nav">
        ${e.map(r=>{const n=r.movies.length===0;return`
              <a
                class="score-index-link${n?" is-empty":""}"
                href="#score-band-${r.key}"
                ${n?'aria-disabled="true"':""}
              >
                <span>${r.label}</span>
                <em>${r.movies.length} 部</em>
              </a>
            `}).join("")}
      </nav>
    </aside>
  `}function C(e,r){return e.map(n=>{const t=n.movies.length?`
          <div class="score-rank-list">
            ${n.movies.map(a=>B(a,r.get(a.id)??0)).join("")}
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
          ${t}
        </section>
      `}).join("")}function h(){const e=document.querySelector("#score-leaderboard"),r=I();if(_(r),!r.length){e.innerHTML='<div class="empty">当前标签下暂无可展示的电影。</div>';return}const n=P(r),t=new Map(r.map((l,d)=>[l.id,d+1])),a=D(r),o=q(a),c=C(a,t);e.innerHTML=`
    <section class="score-rank-layout">
      ${o}
      <div class="score-rank-content">
        ${n}
        <div class="score-band-stack" aria-label="分数区间榜单">
          ${c}
        </div>
      </div>
    </section>
  `,e.querySelectorAll('.score-index-link[href^="#score-band-"]').forEach(l=>{l.addEventListener("click",d=>{if(l.classList.contains("is-empty")){d.preventDefault();return}const p=document.querySelector(l.getAttribute("href"));p&&(d.preventDefault(),p.scrollIntoView({behavior:"smooth",block:"start"}))})})}async function F(){x();try{const e=await T();s.movies=e.map(r=>({...r,_scoreProfile:w(r)})),v(),S(),h()}catch(e){console.error(e),document.querySelector("#score-leaderboard").innerHTML='<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>'}}F();
