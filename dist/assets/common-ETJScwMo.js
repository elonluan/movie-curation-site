(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const c of n.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function a(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(e){if(e.ep)return;e.ep=!0;const n=a(e);fetch(e.href,n)}})();const u="/data/movies.json",l={amber:["#2f2419","#a26c2a","#f6d2a2"],slate:["#1e242b","#4d5b69","#cad4de"],mist:["#2e3843","#6f8695","#d8e0e8"],paper:["#3d362b","#95866f","#e5ddcf"],mono:["#1f1f1f","#555555","#dbdbdb"],rust:["#342520","#955840","#e5b9a1"],forest:["#1a2a25","#496555","#cad8ca"],charcoal:["#232323","#606060","#d3d3d3"],rose:["#3a2b31","#8d5f70","#e3ced6"],olive:["#2a3023","#6e7d57","#d8dbc8"],sunset:["#402718","#aa5e34","#efc69d"],earth:["#2d271d","#7f6b4d","#d8cdb4"],oxide:["#3c2a26","#93514d","#e0c4bc"],ink:["#1a1b21","#41455d","#c6cad8"]};async function w(){const t=await fetch(u);if(!t.ok)throw new Error("无法加载电影数据");return t.json()}function p(t){return t.poster?t.poster:g(t)}function g(t){const[r,a,s]=l[t.posterTone]??l.paper,e=(t.titleOriginal??t.titleZh).replace(/&/g,"and").replace(/[<>]/g,"").slice(0,36),n=`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${r}"/>
      <stop offset="55%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${s}"/>
    </linearGradient>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.18)"/>
    </pattern>
  </defs>
  <rect width="800" height="1200" fill="url(#g)"/>
  <rect width="800" height="1200" fill="url(#grain)" opacity="0.35"/>
  <rect x="54" y="58" width="692" height="1084" fill="none" stroke="rgba(245,240,230,0.52)" stroke-width="1.8"/>
  <rect x="84" y="88" width="632" height="1024" fill="none" stroke="rgba(245,240,230,0.28)" stroke-width="1"/>
  <text x="96" y="105" font-size="24" fill="rgba(247,242,233,0.84)" font-family="Georgia, serif" letter-spacing="4">ARCHIVE EDITION</text>
  <line x1="96" y1="145" x2="704" y2="145" stroke="rgba(247,242,233,0.55)" stroke-width="1"/>
  <text x="96" y="976" font-size="64" fill="#f8f2e7" font-family="Georgia, serif" letter-spacing="2">${e}</text>
  <text x="96" y="1038" font-size="22" fill="rgba(248,242,231,0.84)" font-family="Georgia, serif" letter-spacing="4">${t.year}</text>
</svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(n)}`}function $(t,{className:r="movie-card",withIntro:a=!1,scoreMode:s="total"}={}){const e=y(t,s),n=b(s),c=x(t.watchDate),f=`${n} ${e.toFixed(1)} · 观影日期 ${c}`,i=document.createElement("a");return i.href=`/movie.html?id=${encodeURIComponent(t.id)}`,i.className=r,i.innerHTML=`
    <div class="poster-wrap">
      <img src="${p(t)}" alt="${t.titleZh} 海报" loading="lazy" />
    </div>
    <div class="card-body">
      <h3 class="card-title">${t.titleZh}</h3>
      <p class="card-subtitle">${t.titleOriginal}</p>
      <p class="card-year">${t.year}</p>
      <p class="card-meta">${f}</p>
      <div class="tag-row">
        ${t.tags.slice(0,3).map(d=>`<span class="tag">${d}</span>`).join("")}
      </div>
      ${a?`<p class="card-subtitle" style="margin-top: 12px;">${t.logline}</p>`:""}
    </div>
  `,i}function h(t){var r;return typeof((r=t==null?void 0:t.summaryScores)==null?void 0:r.total)=="number"&&Number.isFinite(t.summaryScores.total)?t.summaryScores.total:typeof(t==null?void 0:t.rating)=="number"&&Number.isFinite(t.rating)?t.rating*10:0}function y(t,r){const a=(t==null?void 0:t.summaryScores)??{};return r==="personal"?o(a.personal):r==="art"?o(a.art):r==="external"?o(a.external):h(t)}function b(t){return t==="personal"?"个人维度":t==="art"?"艺术维度":t==="external"?"外部维度":"最终得分"}function o(t){return typeof t=="number"&&Number.isFinite(t)?t:0}function x(t){if(!t)return"未记录";const r=new Date(t);if(Number.isNaN(r.getTime()))return t;const a=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0"),e=String(r.getDate()).padStart(2,"0");return`${a}-${s}-${e}`}function m(){const t=document.querySelector("[data-year]");t&&(t.textContent=new Date().getFullYear())}export{$ as c,w as l,m,p};
