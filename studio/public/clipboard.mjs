export async function copyWithFallback(text,{writeText,legacyCopy}) {
 try{await writeText(text);return true;}catch{}
 try{return legacyCopy(text)===true;}catch{return false;}
}
