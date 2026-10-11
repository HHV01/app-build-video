export function createAIPacer({now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),readUntil=()=>0,writeUntil=()=>{}}={}){
 let until=Number(readUntil())||0;
 return {
  schedule(ms){if(!Number.isFinite(ms)||ms<=0)return;until=Math.max(until,Number(readUntil())||0,now())+Math.min(ms,60000);writeUntil(until);},
  async wait(onTick=()=>{}){for(;;){until=Math.max(until,Number(readUntil())||0);const remaining=until-now();if(remaining<=0)return;onTick(remaining);await sleep(Math.min(1000,remaining));}}
 };
}
