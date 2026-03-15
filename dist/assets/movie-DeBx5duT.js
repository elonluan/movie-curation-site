import{m as o,l as d,p as u}from"./common-CZ9u61u_.js";function p(){return new URLSearchParams(window.location.search).get("id")}function c(){const a=document.querySelector("#movie-detail");a.innerHTML=`
    <div class="empty">
      未找到该电影条目。请从 <a href="/movies.html" style="text-decoration: underline;">展厅目录</a> 重新进入。
    </div>
  `}function m(a){const s=a.summaryScores;if(!s||!e(s.personal)||!e(s.art)||!e(s.external))return"";const n=[["个人向",s.personal],["艺术向",s.art],["外部向",s.external]].map(([l,i])=>`
      <div class="score-row">
        <div class="score-label">${l}</div>
        <div class="score-track">
          <div class="score-fill" style="width: ${g(i,0,100)}%"></div>
        </div>
        <div class="score-value">${Number(i).toFixed(1)}</div>
      </div>
    `).join("");return`
    <section class="score-panel">
      <div class="score-panel-head">
        <h2>三维汇总</h2>
        ${a.coreDimension?`<span class="core-badge">主导维度：${a.coreDimension}</span>`:""}
      </div>
      <div class="score-bars">
        ${n}
      </div>
    </section>
  `}function $(a){const s=document.querySelector("#movie-detail"),t=a.tags.map(l=>`<span class="tag">${l}</span>`).join(""),n=h(a),r=y(a.watchDate);s.innerHTML=`
    <article class="detail-layout reveal">
      <div class="detail-poster">
        <img src="${u(a)}" alt="${a.titleZh} 海报" />
      </div>
      <div class="detail-info">
        <h1>${a.titleZh}</h1>
        <div class="detail-original">${a.titleOriginal}</div>

        <ul class="meta-list">
          <li><span class="meta-label">年份</span><span class="meta-value">${a.year}</span></li>
          <li><span class="meta-label">国家/地区</span><span class="meta-value">${a.country}</span></li>
          <li><span class="meta-label">导演</span><span class="meta-value">${a.director}</span></li>
          <li><span class="meta-label">最终得分</span><span class="meta-value">${n.toFixed(1)} / 100</span></li>
          <li><span class="meta-label">观影日期</span><span class="meta-value">${r}</span></li>
          <li><span class="meta-label">我的评分</span><span class="meta-value">${a.rating} / 10</span></li>
        </ul>

        ${m(a)}

        <div class="tag-row">${t}</div>
        <p class="logline">${a.logline}</p>
        ${a.note?`<p class="note">${a.note}</p>`:""}
      </div>
    </article>
  `}async function f(){o();const a=p();if(!a){c();return}try{const t=(await d()).find(n=>n.id===a);if(!t){c();return}document.title=`${t.titleZh} | 帧间档案`,$(t)}catch(s){console.error(s),c()}}function g(a,s,t){return Math.min(t,Math.max(s,a))}function e(a){return typeof a=="number"&&Number.isFinite(a)}function h(a){var s;return e((s=a==null?void 0:a.summaryScores)==null?void 0:s.total)?a.summaryScores.total:e(a==null?void 0:a.rating)?a.rating*10:0}function y(a){if(!a)return"未记录";const s=new Date(a);if(Number.isNaN(s.getTime()))return a;const t=s.getFullYear(),n=String(s.getMonth()+1).padStart(2,"0"),r=String(s.getDate()).padStart(2,"0");return`${t}-${n}-${r}`}f();
