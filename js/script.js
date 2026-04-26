// ============ CONSTANTES ============
const FORTNITE_YAW = 0.07;
const TARGET_SIZES = [40, 34, 28, 24, 20];
const TARGET_SIZES_AFINADO = [22, 18, 16];

// ============ VARIABLES GLOBALES ============
let totalRondas = 5, duracionFase = 25, modoAfinado = false;
let sensBaseAfinado = 8.0, sensFinalGlobal = 8.0;
let rondaActual = 1, faseActual = 'tracking', sensActual = 8.0;
let rangoMin = 5.0, rangoMax = 15.0, sensibilidadesExploradas = [];
let testActivo = false, pausado = false;
let colaOverlay = [], procesandoCola = false;
let mejorScore = 0, mejorSens = 8.0;

// ============ MOVIMIENTO ============
let factorMovimiento = 0, cmObjetivo = 5;
let cursorVirtualX = 0, cursorVirtualY = 0;

function calcularFactorMovimiento(dpi, areaWidth, cmObjetivo) {
    const pulgadasPorCm = 2.54;
    return (areaWidth / 2) / ((dpi / pulgadasPorCm) * cmObjetivo);
}

function actualizarFactorMovimiento() {
    let dpi = parseFloat(document.getElementById("dpi")?.value) || 800;
    if (!dpi || dpi <= 0) dpi = 800;
    let area = document.getElementById("gameArea");
    let areaWidth = area ? area.clientWidth : 600;
    factorMovimiento = calcularFactorMovimiento(dpi, areaWidth, cmObjetivo);
}

function iniciarFaseMovimiento(tipo) { cmObjetivo = tipo === "tracking" ? 6 : 4; actualizarFactorMovimiento(); }
function calcularCm360(sens, dpi) { if (dpi <= 0 || sens <= 0) return 0; return 360 / (dpi * (sens / 100) * FORTNITE_YAW); }
function actualizarCm360Display() { let dpi = parseFloat(document.getElementById("dpi")?.value) || 800; document.getElementById("cm360Display").innerText = Math.round(calcularCm360(sensActual, dpi)); }

// ============ MÉTRICAS ============
let trackingHits = 0, trackingMuestras = 0, distanciaTotal = 0, trackingQuality = 0;
let flickAciertos = 0, flickDistancias = [], flickTiempos = [], flickSpawnTime = 0;
let tiempoRestante = 25, historialRondas = [], comboCount = 0;

let gameArea = document.getElementById("gameArea"), overlay = document.getElementById("areaOverlay");
let tituloFase = document.getElementById("tituloFase"), comboTimer = null;
let target = null, mira = null;
let mouseX = 300, mouseY = 200, targetX = 250, targetY = 180;
let animationId = null, timerInterval = null, pointerLockActive = false;
let currentTargetSize = 40, progressFill = document.getElementById("progressFill");

// ============ OVERLAY ============
function encolarOverlay(html, fontSize, duracion, callback) {
    colaOverlay.push({ html, fontSize, duracion, callback });
    if (!procesandoCola) procesarCola();
}
function procesarCola() {
    if (colaOverlay.length === 0) { procesandoCola = false; return; }
    procesandoCola = true;
    let item = colaOverlay.shift();
    overlay.classList.remove("hidden"); overlay.style.fontSize = item.fontSize; overlay.innerHTML = item.html;
    setTimeout(() => { overlay.classList.add("hidden"); if (item.callback) item.callback(); procesarCola(); }, item.duracion);
}
function encolarCuentaRegresiva(callback) { encolarOverlay("3","80px",800,()=>encolarOverlay("2","80px",800,()=>encolarOverlay("1","80px",800,()=>encolarOverlay("¡YA!","80px",400,callback)))); }
function mostrarCombo(t) { let e=document.getElementById("comboIndicator"); e.innerText=t; e.classList.add("active"); if(comboTimer)clearTimeout(comboTimer); comboTimer=setTimeout(()=>e.classList.remove("active"),1000); }

// ============ GUARDADO ============
function guardarDatos(sf, p) { try { localStorage.setItem("fortniteSensLab", JSON.stringify({ sensFinal:sf, perfil:p, fecha:new Date().toISOString(), historial:historialRondas, dpi:parseFloat(document.getElementById("dpi").value)||800 })); mostrarDatosGuardados(); } catch(e){} }
function cargarDatos() { try { let d=localStorage.getItem("fortniteSensLab"); if(d){ let p=JSON.parse(d); document.getElementById("datosGuardados").classList.remove("hidden"); document.getElementById("datosGuardados").innerHTML=`<strong>📂 Último test:</strong><br>Sens: ${p.sensFinal.toFixed(1)}% | Perfil: ${p.perfil.perfil} | ${new Date(p.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`; } } catch(e){} }
function mostrarDatosGuardados() { cargarDatos(); }

// ============ BASE POR HARDWARE ============
function calcularBasePorHardware() {
    if (modoAfinado) return sensBaseAfinado;
    let dpi = parseFloat(document.getElementById("dpi").value)||800, peso = parseFloat(document.getElementById("peso").value)||65;
    let grip = document.getElementById("grip").value, weapon = document.getElementById("weapon").value;
    let cm360 = 55;
    if (peso < 55) cm360 -= 8; else if (peso < 70) cm360 -= 4; else if (peso >= 95) cm360 += 8; else if (peso >= 80) cm360 += 4;
    if (grip === "fingertip") cm360 -= 6; else if (grip === "claw") cm360 -= 2; else if (grip === "palm") cm360 += 6;
    if (weapon === "shotgun") cm360 -= 5; else if (weapon === "ar") cm360 += 5;
    cm360 = Math.min(85, Math.max(30, cm360));
    let sensCalculada = (360 / (dpi * cm360 * FORTNITE_YAW)) * 100;
    return Math.min(18, Math.max(3, sensCalculada));
}

function getTargetSize() { return (modoAfinado ? TARGET_SIZES_AFINADO : TARGET_SIZES)[Math.min(rondaActual-1, (modoAfinado?TARGET_SIZES_AFINADO:TARGET_SIZES).length-1)]; }

function actualizarTablaProgreso() {
    let tb = document.getElementById("tablaBody");
    if (!historialRondas.length) { tb.innerHTML = '<tr><td colspan="7">Esperando...</td></tr>'; return; }
    let validas = historialRondas.filter(r=>r.score>0), mejor = validas.length?validas.reduce((a,b)=>a.score>b.score?a:b):historialRondas[0];
    tb.innerHTML = historialRondas.map(r=>`<tr class="${r===mejor?'mejor':''}"><td>${r.ronda}</td><td>${r.sens.toFixed(1)}%</td><td>${Math.round(r.cm360)}</td><td>${r.tracking.toFixed(1)}%</td><td>${r.distanciaMedia.toFixed(0)}px</td><td>${r.flicks}</td><td><strong>${(r.score||0).toFixed(1)}</strong></td></tr>`).join('');
}

// ============ ALGORITMO CON INTERPOLACIÓN CUADRÁTICA ============
function quadraticPeak(p1, p2, p3) {
    let x1=p1.sens, y1=p1.score, x2=p2.sens, y2=p2.score, x3=p3.sens, y3=p3.score;
    let denom = (x1-x2)*(x1-x3)*(x2-x3);
    if (Math.abs(denom) < 0.001) return (x1+x2+x3)/3;
    let A = (x3*(y2-y1) + x2*(y1-y3) + x1*(y3-y2)) / denom;
    let B = (x3*x3*(y1-y2) + x2*x2*(y3-y1) + x1*x1*(y2-y3)) / denom;
    let vertice = -B / (2*A);
    let minSens = Math.min(x1,x2,x3)-1.2, maxSens = Math.max(x1,x2,x3)+1.2;
    return Math.max(minSens, Math.min(maxSens, vertice));
}

function ajustarSensibilidadHibrida() {
    if (!historialRondas.length) return;
    let ultima = historialRondas[historialRondas.length-1];
    sensibilidadesExploradas.push({ sens: ultima.sens, score: ultima.score });
    let nuevaSens;
    if (modoAfinado) {
        const m = 0.45;
        switch(historialRondas.length) {
            case 1: nuevaSens = sensBaseAfinado + m; break;
            case 2: nuevaSens = sensBaseAfinado - m; break;
            case 3: let r1=historialRondas[0].score, r2=historialRondas[1].score; nuevaSens = Math.abs(r1-r2)<4 ? sensBaseAfinado : sensBaseAfinado+(r1>r2?0.7:-0.7); break;
        }
    } else {
        let puntos = [...sensibilidadesExploradas];
        if (puntos.length <= 2) nuevaSens = calcularBasePorHardware() + (puntos.length===1?3.2:-3.2);
        else if (puntos.length === 3) { let mejor = puntos.sort((a,b)=>b.score-a.score)[0]; nuevaSens = mejor.sens + (mejor.score>puntos[1].score?1.8:-1.8); }
        else { let top3 = puntos.sort((a,b)=>b.score-a.score).slice(0,3); nuevaSens = quadraticPeak(top3[0], top3[1], top3[2]); }
    }
    sensActual = Math.max(2.8, Math.min(19, Math.round(nuevaSens*20)/20));
    actualizarCm360Display();
}

// ============ INICIO ============
function validarConfiguracion() {
    let dpi = parseFloat(document.getElementById("dpi").value);
    if (!dpi || dpi < 400 || dpi > 3200) { alert("⚠️ DPI entre 400 y 3200"); return false; }
    let peso = parseFloat(document.getElementById("peso").value);
    if (!peso || peso < 40 || peso > 150) { alert("⚠️ Peso entre 40g y 150g"); return false; }
    return true;
}

function iniciarTest(afinado) {
    if (!validarConfiguracion()) return;
    modoAfinado = afinado; totalRondas = afinado?3:5; duracionFase = afinado?20:25;
    colaOverlay = []; procesandoCola = false;
    sensActual = Math.min(25, Math.max(1.5, calcularBasePorHardware()));
    sensibilidadesExploradas = []; mejorScore = 0; mejorSens = sensActual;
    rondaActual = 1; faseActual = 'tracking'; historialRondas = []; currentTargetSize = getTargetSize();
    document.getElementById("panelConfig").classList.add("hidden"); document.getElementById("panelTest").classList.remove("hidden");
    document.getElementById("panelResultados").classList.add("hidden");
    document.getElementById("rondaActual").innerText = rondaActual; document.getElementById("totalRondasDisplay").innerText = totalRondas;
    document.getElementById("sensActualDisplay").innerText = sensActual.toFixed(1)+"%";
    tituloFase.innerText = "🎯 SIGUE EL PUNTO";
    iniciarFaseMovimiento("tracking"); actualizarCm360Display(); actualizarTablaProgreso();
    testActivo = true; pausado = false; pointerLockActive = false;
    prepararArea();
}

function iniciarTestAfinado() {
    let s = sensFinalGlobal;
    if (!s || s<=1 || isNaN(s)) { let t=document.getElementById("finalX").innerText; s=parseFloat(t.replace("%","").trim()); }
    if (!s || s<=1 || isNaN(s)) s = mejorSens;
    if (!s || s<=1 || isNaN(s)) { alert("⚠️ Completá un test primero."); return; }
    sensBaseAfinado = s; iniciarTest(true);
}

function resetearTest() {
    if (animationId) cancelAnimationFrame(animationId); if (timerInterval) clearInterval(timerInterval);
    try { gameArea.removeEventListener("mousemove", window.handlerMouseTracking); gameArea.removeEventListener("mousemove", window.handlerMouseFlick); gameArea.removeEventListener("mousedown", handleDisparo); document.removeEventListener('pointerlockchange', handlePointerLock); document.exitPointerLock(); } catch(e){}
    testActivo = false; pausado = false; pointerLockActive = false; colaOverlay = []; procesandoCola = false;
    document.getElementById("panelConfig").classList.remove("hidden"); document.getElementById("panelTest").classList.add("hidden"); document.getElementById("panelResultados").classList.add("hidden");
    window.scrollTo({ top:0, behavior:'smooth' });
}

function prepararArea() {
    gameArea.innerHTML = ""; gameArea.appendChild(overlay);
    overlay.classList.remove("hidden"); overlay.style.fontSize = "32px"; overlay.innerHTML = "🎯 HAZ CLIC PARA EMPEZAR";
    tituloFase.innerText = faseActual === 'tracking' ? "🎯 SIGUE EL PUNTO" : "⚡ FLICKS";
    gameArea.onclick = () => { if (!pointerLockActive && testActivo && !pausado) gameArea.requestPointerLock(); };
    document.addEventListener('pointerlockchange', handlePointerLock);
}

function handlePointerLock() {
    if (document.pointerLockElement === gameArea) { pointerLockActive = true; overlay.classList.add("hidden"); if (!pausado) iniciarSecuenciaFase(); }
    else { pointerLockActive = false; if (testActivo && !pausado) { overlay.classList.remove("hidden"); overlay.innerHTML = "⏸ PAUSADO"; overlay.style.fontSize = "24px"; } }
}

function iniciarSecuenciaFase() { tituloFase.innerText = faseActual==='tracking'?"🎯 SIGUE EL PUNTO":"⚡ FLICKS"; encolarCuentaRegresiva(()=>iniciarFase()); }

function iniciarFase() {
    if (faseActual==='tracking') { trackingHits=0; trackingMuestras=0; distanciaTotal=0; trackingQuality=0; document.getElementById("trackingScore").innerText="0%"; document.getElementById("distanciaMedia").innerText="-"; iniciarFaseMovimiento("tracking"); }
    else { flickAciertos=0; flickDistancias=[]; flickTiempos=[]; comboCount=0; document.getElementById("flickScore").innerText="0"; document.getElementById("flickDetalle").innerText=""; iniciarFaseMovimiento("flick"); }
    tiempoRestante = duracionFase; actualizarTimer();
    gameArea.innerHTML = ""; currentTargetSize = getTargetSize();
    target = document.createElement("div"); target.className = "target"; target.id = "testTarget"; target.style.width = currentTargetSize+"px"; target.style.height = currentTargetSize+"px"; gameArea.appendChild(target);
    mira = document.createElement("div"); mira.className = "mira"; mira.id = "miraVirtual"; gameArea.appendChild(mira);
    let cx = gameArea.clientWidth/2, cy = gameArea.clientHeight/2; mouseX = cx; mouseY = cy; cursorVirtualX = cx; cursorVirtualY = cy;
    mira.style.left = cx+"px"; mira.style.top = cy+"px";
    if (faseActual==='tracking') iniciarTracking(); else iniciarFlicks();
    gameArea.addEventListener("mousedown", handleDisparo);
    timerInterval = setInterval(() => { if (!testActivo || pausado || !pointerLockActive) return; tiempoRestante--; actualizarTimer(); if (tiempoRestante<=0) finalizarFase(); }, 1000);
}

// ============ 🔥 MOVIMIENTO CORREGIDO CON DELTA TIME REAL ============
function iniciarTracking() {
    let handler = function(e) { if (!pointerLockActive) return; actualizarMira(e.movementX, e.movementY); evaluarTracking(); };
    gameArea.addEventListener("mousemove", handler);
    window.handlerMouseTracking = handler;

    let lastTime = performance.now();
    const centerX = gameArea.clientWidth / 2;
    const centerY = gameArea.clientHeight / 2;
    const baseSpeed = 180; // px/s (velocidad máxima deseada)
    let targetPosX = centerX;
    let targetPosY = centerY;
    let velocityX = 0;
    let velocityY = 0;

    function loop(currentTime) {
        if (!testActivo || pausado || !pointerLockActive) return;

        // Delta time real en segundos
        let delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        // Protección contra delta enorme (pestaña inactiva)
        if (delta > 0.033) delta = 0.033;
        if (delta <= 0) { animationId = requestAnimationFrame(loop); return; }

        // Dirección estable por períodos cortos
        const directionHoldTime = 0.4;
        const directionChangeFreq = 0.35;
        const globalTime = lastTime / 1000;
        const phase = Math.floor(globalTime / directionHoldTime);
        const subPhase = Math.floor((globalTime % directionHoldTime) / directionChangeFreq);
        const seed = phase * 137.5 + subPhase * 42.3;
        const dirX = Math.sin(seed) > 0 ? 1 : -1;
        const dirY = Math.cos(seed * 1.7) > 0 ? 1 : -1;

        // Velocidad con jitter controlado
        const speedX = baseSpeed * (0.7 + Math.sin(globalTime * 2.1) * 0.3);
        const speedY = baseSpeed * (0.7 + Math.cos(globalTime * 2.8) * 0.3);

        // Aceleración suave (filtro)
        const accel = 0.15;
        velocityX += (dirX * speedX - velocityX) * accel;
        velocityY += (dirY * speedY - velocityY) * accel;

        // Actualizar posición con la velocidad (integración de Euler)
        targetPosX += velocityX * delta;
        targetPosY += velocityY * delta;

        // Oscilaciones adicionales para imprevisibilidad (movimiento browniano suave)
        targetPosX += Math.sin(globalTime * 1.5) * 80 * delta;
        targetPosY += Math.cos(globalTime * 1.9) * 60 * delta;

        // Límites con rebote suave
        const margin = currentTargetSize * 1.8;
        if (targetPosX < margin) {
            targetPosX = margin;
            velocityX = Math.abs(velocityX) * 0.4;
        }
        if (targetPosX > gameArea.clientWidth - margin) {
            targetPosX = gameArea.clientWidth - margin;
            velocityX = -Math.abs(velocityX) * 0.4;
        }
        if (targetPosY < margin) {
            targetPosY = margin;
            velocityY = Math.abs(velocityY) * 0.4;
        }
        if (targetPosY > gameArea.clientHeight - margin) {
            targetPosY = gameArea.clientHeight - margin;
            velocityY = -Math.abs(velocityY) * 0.4;
        }

        targetX = targetPosX;
        targetY = targetPosY;
        target.style.left = targetX + "px";
        target.style.top = targetY + "px";

        animationId = requestAnimationFrame(loop);
    }

    loop(lastTime);
}

function evaluarTracking() {
    let dist = Math.hypot(cursorVirtualX-targetX, cursorVirtualY-targetY);
    let dMax = Math.max(gameArea.clientWidth, gameArea.clientHeight)*1.6;
    if (Math.abs(cursorVirtualX-mouseX)>dMax || Math.abs(cursorVirtualY-mouseY)>dMax) { cursorVirtualX=mouseX; cursorVirtualY=mouseY; dist=Math.hypot(mouseX-targetX, mouseY-targetY); }
    trackingMuestras++; distanciaTotal += dist;
    const closeness = Math.max(0, 1-(dist/(currentTargetSize*2.2)));
    trackingQuality += closeness*closeness;
    if (dist < currentTargetSize*1.15) trackingHits++;
    if (target) { if (dist<currentTargetSize*0.85) target.style.background="#22c55e"; else if (dist<currentTargetSize*1.5) target.style.background="#fbbf24"; else target.style.background="#ef4444"; }
    const precision = (trackingHits/trackingMuestras)*100, qualityScore = (trackingQuality/trackingMuestras)*100;
    document.getElementById("trackingScore").innerText = (precision*0.4+qualityScore*0.6).toFixed(1)+"%";
    document.getElementById("distanciaMedia").innerText = (distanciaTotal/trackingMuestras).toFixed(0);
}

function iniciarFlicks() { target.className = "target flick-mode"; target.style.width=currentTargetSize+"px"; target.style.height=currentTargetSize+"px"; let h=function(e){if(!pointerLockActive)return;actualizarMira(e.movementX,e.movementY);}; gameArea.addEventListener("mousemove",h); window.handlerMouseFlick=h; generarNuevoFlick(); }
function generarNuevoFlick() { if (faseActual!=='flick'||!testActivo||pausado) return; targetX=currentTargetSize*2+Math.random()*(gameArea.clientWidth-currentTargetSize*4); targetY=currentTargetSize*2+Math.random()*(gameArea.clientHeight-currentTargetSize*4); target.style.left=targetX+"px"; target.style.top=targetY+"px"; flickSpawnTime=Date.now(); }

function actualizarMira(dx, dy) {
    let sens = factorMovimiento;
    cursorVirtualX += dx*sens; cursorVirtualY += dy*sens;
    mouseX += dx*sens; mouseY += dy*sens;
    mouseX = Math.max(0, Math.min(gameArea.clientWidth, mouseX)); mouseY = Math.max(0, Math.min(gameArea.clientHeight, mouseY));
    if (mira) { mira.style.left=mouseX+"px"; mira.style.top=mouseY+"px"; }
}

function handleDisparo(e) {
    if (faseActual!=='flick'||!pointerLockActive||!testActivo||pausado) return;
    e.preventDefault();
    let dist = Math.hypot(cursorVirtualX-targetX, cursorVirtualY-targetY), tiempo = Date.now()-flickSpawnTime;
    if (dist<currentTargetSize*1.3 && tiempo<2000) {
        flickAciertos++; flickDistancias.push(dist); flickTiempos.push(tiempo); comboCount++;
        document.getElementById("flickScore").innerText = flickAciertos; document.getElementById("flickDetalle").innerText = "⚡"+Math.round(tiempo)+"ms";
        if (comboCount>=3) mostrarCombo("🔥 x"+comboCount+" COMBO!");
        target.style.background="#22c55e"; target.style.transform="scale(1.3)";
        setTimeout(()=>{ if(target){ target.style.background="#fbbf24"; target.style.transform="scale(1)"; } }, 150);
        setTimeout(()=>generarNuevoFlick(), 200);
    } else { comboCount=0; target.style.background="#ef4444"; setTimeout(()=>{ if(target) target.style.background="#fbbf24"; }, 150); }
}

function actualizarTimer() { if (progressFill) progressFill.style.width = ((duracionFase-tiempoRestante)/duracionFase*100)+"%"; }

// ============ FINALIZAR FASE CON SCORING DINÁMICO ============
function finalizarFase() {
    if (animationId) cancelAnimationFrame(animationId);
    clearInterval(timerInterval);
    
    gameArea.removeEventListener("mousemove", window.handlerMouseTracking); gameArea.removeEventListener("mousemove", window.handlerMouseFlick); gameArea.removeEventListener("mousedown", handleDisparo);
    if (faseActual==='tracking') {
        let precision = trackingMuestras>0?(trackingHits/trackingMuestras*100):0, distMedia = trackingMuestras>0?(distanciaTotal/trackingMuestras):0;
        historialRondas.push({ ronda:rondaActual, sens:sensActual, cm360:calcularCm360(sensActual, parseFloat(document.getElementById("dpi").value)||800), tracking:precision, distanciaMedia:distMedia, flicks:0, flickDistanciaMedia:50, targetSize:currentTargetSize, score:0 });
        actualizarTablaProgreso(); faseActual='flick'; tituloFase.innerText="⚡ FLICKS";
        encolarOverlay("⚡ FLICKS<br><small style='font-size:18px;color:#94a3b8;'>Preparando...</small>", "50px", 1800, ()=>iniciarSecuenciaFase());
    } else {
        let fd = flickDistancias.length?flickDistancias.reduce((a,b)=>a+b,0)/flickDistancias.length:50;
        let r = historialRondas[historialRondas.length-1]; r.flicks = flickAciertos; r.flickDistanciaMedia = fd;
        let ts = r.tracking, fe = Math.floor(duracionFase/2.5), ft = Math.min(100, (r.flicks/fe)*100);
        let fp = Math.max(0, 100-((fd-currentTargetSize*0.4)/(currentTargetSize*0.4))*100);
        let flickTiempoMedio = flickTiempos.length?flickTiempos.reduce((a,b)=>a+b,0)/flickTiempos.length:150;
        let fv = Math.max(0, 100-flickTiempoMedio/5);
        let fs = ft*0.5 + fp*0.35 + fv*0.15;
        let cs = Math.max(0, 100-((r.distanciaMedia-currentTargetSize*0.8)/(currentTargetSize*0.8))*50);
        const pesos = { shotgun:{tracking:0.25, flick:0.60, consistencia:0.15}, ar:{tracking:0.50, flick:0.30, consistencia:0.20}, balanced:{tracking:0.35, flick:0.50, consistencia:0.15} };
        const weapon = document.getElementById("weapon")?.value || 'balanced';
        const p = pesos[weapon] || pesos.balanced;
        r.score = Math.round((ts*p.tracking + fs*p.flick + cs*p.consistencia)*10)/10;
        if (r.score > mejorScore) { mejorScore = r.score; mejorSens = r.sens; }
        console.log(`🎯 R${rondaActual} ${r.sens.toFixed(1)}% | Score ${r.score.toFixed(1)} | Mejor ${mejorScore.toFixed(1)} (${mejorSens.toFixed(1)}%)`);
        actualizarTablaProgreso();
        if (rondaActual < totalRondas) {
            ajustarSensibilidadHibrida(); rondaActual++; faseActual='tracking'; currentTargetSize=getTargetSize();
            document.getElementById("rondaActual").innerText = rondaActual; document.getElementById("sensActualDisplay").innerText = sensActual.toFixed(1)+"%";
            actualizarCm360Display(); tituloFase.innerText = "🎯 SIGUE EL PUNTO";
            encolarOverlay(`LISTO ✅<br><small style='font-size:16px;color:#94a3b8;'>Ronda ${rondaActual} · Sens ${sensActual.toFixed(1)}% · ${Math.round(calcularCm360(sensActual, parseFloat(document.getElementById("dpi").value)||800))}cm/360°</small>`, "40px", 2000, ()=>iniciarSecuenciaFase());
        } else finalizarTest();
    }
}

function pausarTest() { pausado=!pausado; document.getElementById("btnPausa").innerHTML=pausado?"▶️ REANUDAR":"⏸️ PAUSAR"; if (!pausado&&pointerLockActive) overlay.classList.add("hidden"); else { overlay.classList.remove("hidden"); overlay.innerHTML="⏸ PAUSADO"; overlay.style.fontSize="30px"; } }

// ============ PERFIL Y RESULTADO FINAL ============
function calcularPerfilJugador() {
    let pt=historialRondas.reduce((a,r)=>a+r.tracking,0)/historialRondas.length, pf=historialRondas.reduce((a,r)=>a+r.flicks,0)/historialRondas.length, pd=historialRondas.reduce((a,r)=>a+(r.distanciaMedia||50),0)/historialRondas.length;
    let ts=Math.min(100,Math.max(0,pt*1.2)), fs=Math.min(100,Math.max(0,pf*6)), ps=Math.min(100,Math.max(0,100-pd));
    let ratio = ts/(ts+fs); if (isNaN(ratio)) ratio=0.5;
    let ads = Math.round(55+ratio*30), scope = Math.round(ads-10);
    ads = Math.min(85, Math.max(55, ads)); scope = Math.min(75, Math.max(45, scope));
    let perfil, desc;
    if (ts>65&&fs<40) { perfil="🎯 RASTREADOR"; desc="Excelente tracking. ADS alto para mantener estabilidad en combates de medio alcance."; }
    else if (ts<40&&fs>60) { perfil="⚡ FLICKER"; desc="Rápido en disparos. ADS más bajo para mantener velocidad en combate cercano."; }
    else if (ts>=45&&fs>=45) { perfil="⚖️ HÍBRIDO"; desc="Equilibrio perfecto entre tracking y flicks. Versátil en todas las distancias."; }
    else { perfil="🔰 EN DESARROLLO"; desc="Perfil en formación. Continúa practicando."; }
    return { ads, scope, perfil, descripcion:desc, trackScore:ts, flickScore:fs, precisionScore:ps };
}

function finalizarTest() {
    testActivo=false; pausado=false; if (animationId) cancelAnimationFrame(animationId); clearInterval(timerInterval);
    gameArea.removeEventListener("mousemove", window.handlerMouseTracking); gameArea.removeEventListener("mousemove", window.handlerMouseFlick); gameArea.removeEventListener("mousedown", handleDisparo);
    document.removeEventListener('pointerlockchange', handlePointerLock); try { document.exitPointerLock(); } catch(e){}
    document.getElementById("panelTest").classList.add("hidden"); document.getElementById("panelResultados").classList.remove("hidden");
    let perfil = calcularPerfilJugador();
    sensFinalGlobal = mejorSens; let sf = mejorSens||sensActual;
    let dpi = parseFloat(document.getElementById("dpi").value)||800, sy = Math.round(sf*0.95*10)/10, eDPI = Math.round((dpi*sf)/100), cm360 = Math.round(calcularCm360(sf, dpi));
    document.getElementById("sensFinalDisplay").innerText = sf.toFixed(1)+"%"; document.getElementById("eDPIFinal").innerText = eDPI; document.getElementById("cm360Final").innerText = cm360;
    document.getElementById("finalX").innerText = sf.toFixed(1)+"%"; document.getElementById("finalY").innerText = sy.toFixed(1)+"%";
    document.getElementById("finalADS").innerText = perfil.ads+"%"; document.getElementById("finalScope").innerText = perfil.scope+"%";
    document.getElementById("descADS").innerHTML = `ADS dinámico · ${perfil.ads}% del Look = ${(sf*perfil.ads/100).toFixed(1)}% efectiva`;
    document.getElementById("descScope").innerHTML = `Scope dinámico · ${perfil.scope}% del Look = ${(sf*perfil.scope/100).toFixed(1)}% efectiva`;
    document.getElementById("btnAfinar").innerHTML = "🔍 AFINAR MÁS (usar "+sf.toFixed(1)+"%)";
    document.getElementById("perfilJugador").innerHTML = `<div class="perfil-titulo">${perfil.perfil}</div><div class="perfil-desc">${perfil.descripcion}</div><div class="perfil-stats"><span>📊 Tracking: <strong>${perfil.trackScore.toFixed(0)}pts</strong></span><span>⚡ Flicks: <strong>${perfil.flickScore.toFixed(0)}pts</strong></span><span>🎯 Precisión: <strong>${perfil.precisionScore.toFixed(0)}pts</strong></span><span style="margin-left:10px;color:#22c55e;">ADS/Scope: <strong>calculados según tu balance real</strong></span></div>`;
    if (modoAfinado) { let dif=Math.abs(sf-sensBaseAfinado); document.getElementById("confirmacionBox").innerHTML=dif<0.15?`<div class="confirm-box"><h3>✅ CONFIRMADO</h3><p><strong>${sf.toFixed(1)}%</strong> es tu sensibilidad óptima.</p></div>`:`<div class="confirm-box" style="border-color:#f59e0b;"><h3>🔍 NUEVO VALOR</h3><p><strong>${sf.toFixed(1)}%</strong> (diferencia ${dif.toFixed(1)}%).</p></div>`; } else document.getElementById("confirmacionBox").innerHTML="";
    let validas=historialRondas.filter(r=>r.score>0), mejor=validas.length?validas.reduce((a,b)=>a.score>b.score?a:b):null;
    document.getElementById("tablaFinalBody").innerHTML = historialRondas.map(r=>`<tr class="${r===mejor?'mejor':''}"><td>${r.ronda}</td><td>${r.sens.toFixed(1)}%</td><td>${Math.round(r.cm360)}</td><td>${r.tracking.toFixed(1)}%</td><td>${r.distanciaMedia.toFixed(0)}px</td><td>${r.flicks}</td><td><strong>${(r.score||0).toFixed(1)}</strong></td></tr>`).join('');
    guardarDatos(sf, perfil); console.log(`🏆 TEST FINALIZADO | Sens: ${sf.toFixed(1)}% | cm/360°: ${cm360} | eDPI: ${eDPI} | ${perfil.perfil}`);
    window.scrollTo({ top:0, behavior:'smooth' });
}

// ============ EVENTOS ============
document.getElementById("dpi").addEventListener("input", ()=>{ actualizarFactorMovimiento(); if (testActivo) actualizarCm360Display(); });
window.addEventListener("resize", ()=>{ actualizarFactorMovimiento(); if (mira&&gameArea&&(!testActivo||pausado)) { let cx=gameArea.clientWidth/2, cy=gameArea.clientHeight/2; mouseX=cx; mouseY=cy; cursorVirtualX=cx; cursorVirtualY=cy; } });
window.addEventListener('beforeunload', ()=>{ if (animationId) cancelAnimationFrame(animationId); if (timerInterval) clearInterval(timerInterval); try { document.exitPointerLock(); } catch(e){} });
cargarDatos();
actualizarFactorMovimiento();