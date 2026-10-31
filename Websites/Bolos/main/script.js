const FLAVORS=["Ganache","Bombom","Pêssego","Brigadeiro","Morango com chantilly","Coco com doce de leite","Doce de leite","Amendoim","Creme belga","Abacaxi","Branquinho","Ninho","Creme de ovos","Mousse de maracujá","Mousse de morango","Mousse de chocolate"];
const SIZES=[[10,"Redondo",45],[15,"Redondo",50],[20,"Redondo",60],[25,"Redondo",70],[30,"Redondo",80],[35,"Quadrado",100],[50,"Quadrado",130],[60,"Quadrado",150],[80,"Quadrado",170],[140,"Quadrado",250]];
const SALG=["Canudo","Barquete","Risoles","Coxinha","Croquete","Pastelzinho — carne","Pastelzinho — presunto e queijo","Pastel de nata","Bolinha de queijo","Enroladinho de salsicha","Empada","Trouxa de abacaxi","Estrela de calabresa","Tortinha de frango"];
const DOCES=["Negrinho","Branquinho","Casadinho","Cajuzinho","Napolitano"];
const CASCAS=["Casca de canudo","Casca de barquete"];
const ORDER_WHATSAPP="https://wa.me/5555984532522";
const R=v=>"R$ "+v.toLocaleString("pt-BR",{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
const $=s=>document.querySelector(s);
const cakes=[];const snack={};const casca={};let cq=1;
let sending=false;

const fl=[FLAVORS[0]];
function renderFlavors(){
  $("#flavors").innerHTML=fl.map((f,i)=>`<div class="fl"><select data-fi="${i}" aria-label="Sabor ${i+1}">${FLAVORS.filter(x=>x===f||!fl.includes(x)).map(x=>`<option${x===f?" selected":""}>${x}</option>`).join("")}</select>${i?`<button type="button" data-fr="${i}" aria-label="Remover sabor">×</button>`:""}</div>`).join("");
  $("#addFlavor").hidden=fl.length>=3;
}
document.addEventListener("change",e=>{const s=e.target.closest("[data-fi]");if(s){fl[+s.dataset.fi]=s.value;renderFlavors();cakePrev()}});
document.addEventListener("click",e=>{const b=e.target.closest("[data-fr]");if(b){fl.splice(+b.dataset.fr,1);renderFlavors();cakePrev()}});
$("#addFlavor").onclick=()=>{if(fl.length<3){fl.push(FLAVORS.find(x=>!fl.includes(x)));renderFlavors();cakePrev()}};
$("#size").innerHTML=SIZES.map((s,i)=>`<option value="${i}">${s[0]} fatias · ${s[1]} · ${R(s[2])}</option>`).join("");
$("#size").value=2;

function cakePrev(){const s=SIZES[$("#size").value];$("#cakeTxt").textContent=`${cq}× ${fl.join(" + ")} · ${s[0]} fatias (${s[1].toLowerCase()})`;$("#cakePrice").textContent=R(s[2]*cq);$("#cq").textContent=cq}
$("#size").onchange=cakePrev;
document.querySelectorAll("[data-cq]").forEach(b=>b.onclick=()=>{cq=Math.max(1,Math.min(20,cq+ +b.dataset.cq));cakePrev()});
$("#addCake").onclick=()=>{const s=SIZES[$("#size").value];cakes.push({flavor:fl.join(" + "),slices:s[0],shape:s[1],unit:s[2],q:cq,note:$("#cakeNote").value.trim()});cq=1;$("#cakeNote").value="";cakePrev();render();toast("Bolo adicionado")};

function list(id,names,store,step,unitPrice){
  $(id).innerHTML=names.map((n,i)=>`<div class="item"><div>${n}${step>1?`<small>${R(unitPrice*step)} a cada ${step}</small>`:`<small>${R(unitPrice)} cada</small>`}</div>
  <div class="stepper"><button data-s="${id}|${i}|-1" aria-label="Menos">−</button><span>${store[n]||0}</span><button data-s="${id}|${i}|1" aria-label="Mais">+</button></div></div>`).join("");
}
const cfg={"#l-salgados":[SALG,snack,25,1.2],"#l-doces":[DOCES,snack,25,1.2],"#l-cascas":[CASCAS,casca,1,20.5]};
function drawLists(){for(const k in cfg)list(k,...cfg[k])}
document.addEventListener("click",e=>{const b=e.target.closest("[data-s]");if(!b)return;
  const [id,i,d]=b.dataset.s.split("|");const [names,store,step]=cfg[id];const n=names[+i];
  store[n]=Math.max(0,(store[n]||0)+ +d*step);if(!store[n])delete store[n];
  const y=scrollY;drawLists();scrollTo(0,y);render()});

document.querySelectorAll("[data-tab]").forEach(t=>t.onclick=()=>{
  document.querySelectorAll("[data-tab]").forEach(x=>x.setAttribute("aria-selected",x===t));
  ["bolos","salgados","doces"].forEach(k=>$("#p-"+k).hidden=k!==t.dataset.tab)});

function build(){
  const L=[];let total=0;
  cakes.forEach((c,i)=>{const p=c.unit*c.q;total+=p;L.push({t:`${c.q}× Bolo ${c.flavor} — ${c.slices} fatias (${c.shape.toLowerCase()})${c.note?` — ${c.note}`:""}`,p,rm:()=>cakes.splice(i,1)})});
  [[SALG,"Salgado"],[DOCES,"Doce"]].forEach(([arr,lab])=>arr.forEach(n=>{const q=snack[n];if(q){const p=q*1.2;total+=p;L.push({t:`${q} un. ${lab}: ${n}`,p,rm:()=>delete snack[n]})}}));
  CASCAS.forEach(n=>{const q=casca[n];if(q){const p=q*20.5;total+=p;L.push({t:`${q}× ${n}`,p,rm:()=>delete casca[n]})}});
  return {L,total};
}
function render(){
  const {L,total}=build();
  $("#lines").innerHTML=L.length?L.map((l,i)=>`<div class="line"><div>${l.t}</div><div style="white-space:nowrap">${R(l.p)} <button data-rm="${i}" aria-label="Remover">×</button></div></div>`).join(""):`<div class="empty">Nada por aqui ainda. Escolha um item ao lado.</div>`;
  $("#total").textContent=$("#barTotal").textContent=R(total);
  const hasContact=$("#nm").value.trim()&&$("#ph").value.trim();
  const validEmail=$("#em").value.trim()&&$("#em").validity.valid;
  $("#sendWa").disabled=!(L.length&&hasContact&&!sending);
  $("#sendMail").disabled=!(L.length&&hasContact&&validEmail&&!sending);
  $("#sendMail").textContent=sending?"Enviando pedido...":"Enviar por e-mail";
  window._L=L;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-rm]");if(b){window._L[+b.dataset.rm].rm();drawLists();render()}});
["nm","em","ph","dt"].forEach(i=>$("#"+i).oninput=render);

$("#sendWa").onclick=()=>{
  const {L,total}=build();
  const pickupDate=$("#dt").value;
  const formattedDate=pickupDate?pickupDate.split("-").reverse().join("/"): "A combinar";
  const message=[
    "Novo pedido - Bolos da Salette",
    `Nome: ${$("#nm").value.trim()}`,
    `E-mail: ${$("#em").value.trim()||"Não informado"}`,
    `Telefone / WhatsApp: ${$("#ph").value.trim()}`,
    `Data de coleta: ${formattedDate}`,
    "",
    "Itens:",
    ...L.map(item=>`- ${item.t} — ${R(item.p)}`),
    "",
    `Total estimado: ${R(total)}`,
    "O valor final deve ser confirmado pela Salette.",
  ].join("\n");
  window.open(`${ORDER_WHATSAPP}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
};
$("#sendMail").onclick=async()=>{
  if(sending)return;
  const {L}=build();
  if(!L.length)return;
  sending=true;render();toast("Enviando pedido...",5000);
  try{
    const response=await fetch("/api/orders",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        name:$("#nm").value.trim(),
        email:$("#em").value.trim(),
        phone:$("#ph").value.trim(),
        pickupDate:$("#dt").value,
        website:$("#website").value,
        items:L.map(item=>({description:item.t,amount:item.p}))
      })
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Não foi possível enviar o pedido.");
    toast("Pedido enviado por e-mail!",3500);
  }catch(error){
    toast(error instanceof Error?error.message:"Falha de conexão. Tente novamente.",3500);
  }finally{
    sending=false;render();
  }
};
let tt;function toast(m,duration=1400){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("on"),duration)}
const todayParts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const today=Object.fromEntries(todayParts.map(({type,value})=>[type,value]));
$("#dt").min=`${today.year}-${today.month}-${today.day}`;
renderFlavors();cakePrev();drawLists();render();
``