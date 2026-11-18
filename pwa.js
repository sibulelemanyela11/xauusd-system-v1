let installPrompt=null;
const installButtons=[document.getElementById("install-app"),document.getElementById("install-bottom")].filter(Boolean);
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault(); installPrompt=event;
  installButtons.forEach(b=>b.hidden=false);
});
async function installApp(){
  if(!installPrompt){alert("On Android Chrome, open the browser menu ⋮ and choose 'Add to Home screen' or 'Install app'.");return;}
  installPrompt.prompt(); await installPrompt.userChoice; installPrompt=null;
  installButtons.forEach(b=>b.hidden=true);
}
installButtons.forEach(b=>b.addEventListener("click",installApp));
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}
document.getElementById("refresh")?.addEventListener("click",()=>{const b=document.getElementById("refresh");b.disabled=true;b.textContent="Scanning…";window.dispatchEvent(new Event("xau-manual-scan"));setTimeout(()=>{b.disabled=false;b.textContent="Scan now";},4000);});
const alertButton=document.getElementById("enable-alerts");
function refreshAlertLabel(){if(!alertButton)return;alertButton.textContent=Notification.permission==="granted"?"Alerts enabled":Notification.permission==="denied"?"Alerts blocked":"Enable alerts";}
if("Notification" in window){refreshAlertLabel();alertButton?.addEventListener("click",async()=>{const permission=await Notification.requestPermission();refreshAlertLabel();if(permission==="granted")new Notification("Gold Signal Engine",{body:"Notifications enabled. Keep the app open for live scans."});});}else if(alertButton){alertButton.textContent="Alerts unsupported";alertButton.disabled=true;}
let previousSignal=null;
window.addEventListener("xau-signal",event=>{
  const signal=event.detail?.signal;
  const updated=document.getElementById("updated");
  if(updated)updated.textContent="Last scan: "+new Date().toLocaleTimeString("en-ZA",{timeZone:"Africa/Johannesburg"});
  if(previousSignal===null){previousSignal=signal;return;}
  if((signal==="BUY"||signal==="SELL")&&signal!==previousSignal&&"Notification" in window&&Notification.permission==="granted"){
    if(navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(reg=>reg.showNotification("XAUUSD "+signal,{body:event.detail.reason||"New signal detected",icon:"/icon.svg",tag:"xauusd-signal"}));
    else new Notification("XAUUSD "+signal,{body:event.detail.reason||"New signal detected"});
  }
  previousSignal=signal;
});
