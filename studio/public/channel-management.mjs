export const draftChannels=state=>state.channels.filter(c=>!c.name?.trim()||(!(state.projects||[]).some(p=>p.channelId===c.id)&&!c.nicheLock));
export function deleteChannels(state,ids,deleteProjects=false) {
 const selected=new Set(ids),channels=state.channels.map((value,index)=>({value,index})).filter(x=>selected.has(x.value.id)),projects=state.projects.map((value,index)=>({value,index})).filter(x=>selected.has(x.value.channelId));
 if(projects.length&&!deleteProjects)throw Error('Phải xác nhận xoá luôn các dự án của kênh.');
 const snapshot=structuredClone({channels,projects});state.channels=state.channels.filter(c=>!selected.has(c.id));state.projects=state.projects.filter(p=>!selected.has(p.channelId));return snapshot;
}
export function undoChannels(state,snapshot) {
 for(const kind of ['channels','projects'])for(const {value,index} of snapshot[kind]){if(state[kind].some(x=>x.id===value.id))throw Error('ID đã tồn tại; không ghi đè khi hoàn tác.');state[kind].splice(Math.min(index,state[kind].length),0,structuredClone(value));}
}
