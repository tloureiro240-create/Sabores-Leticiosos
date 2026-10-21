// No secrets are exposed to the browser. Optional DeepL key enables bulk translation.
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:'{}'};
  try{
    const {texts,source,target}=JSON.parse(event.body||'{}');
    if(!['pt','fr','en'].includes(target)||!['pt','fr','en','es','de'].includes(source)||!Array.isArray(texts)||texts.length>8||texts.some(t=>typeof t!=='string'||t.length>4000))return {statusCode:400,headers,body:JSON.stringify({error:'invalid_request'})};
    if(source===target)return {statusCode:200,headers,body:JSON.stringify({texts})};
    let output=[];
    if(process.env.DEEPL_API_KEY){
      const res=await fetch(process.env.DEEPL_API_KEY.endsWith(':fx')?'https://api-free.deepl.com/v2/translate':'https://api.deepl.com/v2/translate',{method:'POST',headers:{Authorization:'DeepL-Auth-Key '+process.env.DEEPL_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text:texts,source_lang:source.toUpperCase(),target_lang:target==='pt'?'PT-PT':target.toUpperCase()}),signal:AbortSignal.timeout(18000)});
      if(!res.ok)throw Error('translation_unavailable');
      output=(await res.json()).translations.map(t=>t.text);
    }else{
      // MyMemory's public service has a daily quota; report failures, never cache errors.
      output=await Promise.all(texts.map(async text=>{
        let chunks=[],part='';
        for(const char of text){if(Buffer.byteLength(part+char,'utf8')>450){chunks.push(part);part=''}part+=char}if(part)chunks.push(part);
        let translated=[];
        for(const chunk of chunks){
          const url=new URL('https://api.mymemory.translated.net/get');url.searchParams.set('q',chunk);url.searchParams.set('langpair',source+'|'+target);
          const res=await fetch(url,{signal:AbortSignal.timeout(8000)});const data=await res.json();
          if(!res.ok||Number(data.responseStatus)!==200||!data.responseData?.translatedText||data.quotaFinished)throw Error('translation_unavailable');
          translated.push(data.responseData.translatedText);
        }
        return translated.join('');
      }));
    }
    if(output.length!==texts.length)throw Error('translation_unavailable');
    return {statusCode:200,headers,body:JSON.stringify({texts:output})};
  }catch{return {statusCode:503,headers,body:JSON.stringify({error:'translation_unavailable'})}}
};
