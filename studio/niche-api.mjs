// Integrates existing rx/core rules; it contains no second set of thresholds.
import { RULES, STAGES, findTemplate, carriesTemplate, contentVideos, overlapsShelf, suggestedQueries, channelShelf, shelfGate, probeGate, blindTitles, groupCountGate, nextStage, lockedNiche, validateTopics } from './rx.mjs';
import { median, validateGroups } from './core.mjs';

const fault = (message, status = 400) => Object.assign(new Error(message), { status });
const newest = videos => [...videos].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
export function createNicheAPI({ getState, updateState, youtube, videoDetails, generate }) {
  function requireStage(id, stage, state = getState()) {
    const survey = state.surveys.find(s => s.id === id);
    if (!survey) throw fault('Không tìm thấy khảo sát.', 404);
    const index = STAGES.indexOf(stage);
    if (index < 0) throw fault('Bước khảo sát không hợp lệ.');
    for (const prior of STAGES.slice(0, index)) if (survey.nicheFlow?.[prior]?.passed !== true) {
      throw fault(`Chưa qua bước ${prior}; không được gọi tắt bước ${stage}.`, 409);
    }
    return survey;
  }
  async function catalog(raw) {
    raw=String(raw||'').trim();
    if(raw.startsWith('@'))raw='https://www.youtube.com/'+raw;
    let selector;
    if (/^UC[\w-]{22}$/.test(String(raw))) selector = { id: raw };
    else {
      let url; try { url = new URL(raw); } catch { throw fault('Nhập link /@handle hoặc /channel/ID của YouTube.'); }
      if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com'].includes(url.hostname)) throw fault('Chỉ nhận link kênh YouTube HTTPS.');
      const id = url.pathname.match(/^\/channel\/(UC[\w-]{22})\/?$/)?.[1];
      const handle = url.pathname.match(/^\/@([^/]+)\/?$/)?.[1];
      if (id) selector = { id }; else if (handle) selector = { forHandle: handle }; else throw fault('Link không phải trang kênh.');
    }
    const details = await youtube('channels', { part: 'snippet,contentDetails', ...selector });
    const channel = details.items?.[0];
    if (!channel?.contentDetails?.relatedPlaylists?.uploads) throw fault('Không tìm thấy kênh hoặc danh sách video.', 404);
    const ids = new Set(); let pageToken, pages = 0;
    do {
      const page = await youtube('playlistItems', { part: 'contentDetails', playlistId: channel.contentDetails.relatedPlaylists.uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      for (const item of page.items || []) if (item.contentDetails?.videoId) ids.add(item.contentDetails.videoId);
      pageToken = page.nextPageToken; pages++;
    } while (pageToken && pages < 20);
    const videos = newest(await videoDetails([...ids]));
    return { id: channel.id, name: channel.snippet?.title || channel.id, videos, pages, complete: !pageToken && videos.length === ids.size, provenance: 'youtube', quotaEstimate:{readUnits:1+pages+Math.ceil(ids.size/50)}, warning: pageToken ? 'Đã dừng ở 1.000 video. Chưa đủ toàn bộ kho để kết luận.' : '' };
  }
  function imported(survey, id, confirmed) {
    if (confirmed !== true) throw fault('Cần xác nhận kho nhập có đủ video công khai và 20 tiêu đề mới nhất.');
    const videos = newest((survey.videos || []).filter(v => v.channelId === id));
    return { id, name: videos[0]?.channelTitle || id, videos, complete: true, provenance: 'user-declared-import' };
  }
  function evaluateChannel(cat, template, format) {
    const result = findTemplate(contentVideos(cat.videos, format).map(v => v.title));
    // Duration alone cannot definitively distinguish Shorts. Surface this in the UI.
    const videos = contentVideos(cat.videos, format);
    // Kho chỉ tính video MANG KHUÔN. Video nổi bật nhất của kênh nhưng nói về
    // chủ đề khác không thuộc dòng khuôn thì không được vào trung vị/bội số.
    const carrying = videos.filter(v => carriesTemplate(v.title, template));
    const shelf = channelShelf(carrying)[0] || { matureCount: 0, median: null, pass: false, videos: [] };
    // Hai kênh cùng khuôn khi khuôn của kênh này CHỨA khuôn đã chốt. So sánh
    // bằng nhau là quá chặt: kênh lặp cụm dài hơn vẫn là cùng một dòng khuôn.
    const sameTemplate = Boolean(result.template) && `${result.template} `.startsWith(`${template} `);
    const pass = cat.complete && result.complete === true && sameTemplate && shelf.pass;
    const otherReason = result.template ? `Lặp khuôn khác: "${result.template}"` : result.reason || 'Không lặp cùng khuôn';
    return { ...shelf, channelId: cat.id, channelTitle: cat.name, complete: cat.complete, template: result, sameTemplate, pass, videos: pass ? shelf.videos : [], provenance: cat.provenance, reason: pass ? '' : [!cat.complete && 'Kho chưa đầy đủ', !sameTemplate && otherReason, !shelf.pass && (shelf.reason || 'Chưa qua cổng view')].filter(Boolean).join(' · ') };
  }
  async function act(stage, body) {
    const snapshot = getState(), revision = snapshot.revision;
    if (body.revision != null && body.revision !== revision) throw fault('Khảo sát đã đổi. Tải lại trước khi chạy.', 409);
    const survey = requireStage(body.surveyId, stage, snapshot), flow = survey.nicheFlow || {};
    let value;
    if (stage === 'field') {
      if (!['US', 'VN'].includes(body.market) || !['en', 'vi'].includes(body.language) || !['long', 'short'].includes(body.format)) throw fault('Chọn sân, ngôn ngữ và định dạng hợp lệ.');
      value = { passed: true, market: body.market, language: body.language, format: body.format };
    } else if (stage === 'template') {
      const angle = String(body.angle || survey.angle || '').trim();
      if (!angle) throw fault('Nhập angle của kênh bạn trước khi chốt khuôn.');
      const cat = body.mode === 'live' ? await catalog(body.channel) : body.mode === 'import' ? imported(survey, body.channel, body.confirmComplete) : null;
      if (!cat) throw fault('Chọn nguồn YouTube hoặc kho nhập.');
      const result = findTemplate(contentVideos(cat.videos, flow.field.format).map(v => v.title));
      let selected=result.candidates[0];
      if(Object.hasOwn(body,'template')){
        const normalized=typeof body.template==='string'?body.template.normalize('NFC').toLowerCase().trim().replace(/\s+/g,' '):'';
        selected=result.candidates.find(c=>c.template===normalized);
        if(!selected)throw fault('Khuôn này không lặp ở hơn nửa số tiêu đề mới nhất của kênh chỉ đường.',400);
      }
      value={passed:Boolean(selected&&result.complete),value:selected?.template||null,candidates:result.candidates,angle,channelId:cat.id,result,provenance:cat.provenance,examples:selected?contentVideos(cat.videos,flow.field.format).slice(0,RULES.titlesForTemplate).map(v=>v.title):[],reason:result.reason};
      if(selected){value.result={...result,...selected,titles:value.examples.filter(t=>carriesTemplate(t,selected.template)||t.normalize('NFC').toLowerCase().trim().replace(/\s+/g,' ')===selected.template)};}
      if(selected?.words<=2)value.warning='Khuôn quá chung, kho dễ nhiễu.';
    } else if (stage === 'shelf') {
      let catalogs,notice,extraReadUnits=0;
      if (body.mode === 'import'){catalogs = [...new Set(survey.videos.map(v => v.channelId))].map(id => imported(survey, id, body.confirmComplete));if(body.extraChannels?.length)notice='Bỏ qua kênh thêm tay: kho nhập đã có sẵn danh sách kênh.';}
      else if (body.mode === 'live') {
        if(body.extraChannels!==undefined&&(!Array.isArray(body.extraChannels)||body.extraChannels.length>5||body.extraChannels.some(x=>typeof x!=='string'||!x.trim())))throw fault('Chỉ thêm tối đa 5 kênh, mỗi kênh là một link hoặc @handle.',400);
        // Tìm bằng VIDEO mang khuôn, không tìm bằng tên kênh: search type=channel
        // chỉ khớp tên, nên kênh có khuôn tiêu đề đúng vẫn không xuất hiện.
        const found = await youtube('search', {
          part: 'snippet', type: 'video', q: `"${flow.template.value}"`, maxResults: '50',
          publishedAfter: `${new Date().getFullYear()}-01-01T00:00:00Z`,
          regionCode: flow.field.market, relevanceLanguage: flow.field.language,
        });
        const ids = [...new Set([flow.template.channelId, ...(found.items || []).map(i => i.snippet?.channelId)].filter(Boolean))].slice(0, 10);
        catalogs = []; for (const id of ids) catalogs.push({...await catalog(id),discovered:true});
        for(const raw of new Set(body.extraChannels||[])){
          try{const cat=await catalog(raw);extraReadUnits+=cat.quotaEstimate.readUnits;const found=catalogs.find(c=>c.id===cat.id);if(found)found.addedByUser=true;else catalogs.push({...cat,addedByUser:true});}
          catch(e){if(!e.status)throw e;extraReadUnits++;catalogs.push({id:'unresolved:'+raw,name:raw,videos:[],complete:false,provenance:'youtube',addedByUser:true,lookupError:e.message,quotaEstimate:{readUnits:1}});}
        }
      } else throw fault('Chọn nguồn dữ liệu.');
      const channels = catalogs.map(cat => ({...evaluateChannel(cat,flow.template.value,flow.field.format),addedByUser:Boolean(cat.addedByUser),...(cat.lookupError?{reason:cat.lookupError}:{} )}));
      const gate = shelfGate(channels);
      const readUnits=catalogs.filter(c=>c.discovered).reduce((n,c)=>n+(c.quotaEstimate?.readUnits||0),0)+extraReadUnits;
      value = { ...gate, channels, notice, quotaEstimate:body.mode==='live'?{searchCalls:1,readUnits,extraReadUnits,note:'Ước tính theo số trang và lô chi tiết; cache có thể giảm số lượt thực tế.'}:undefined, videos: channels.filter(c => c.pass).flatMap(c => c.videos), provenance: body.mode, formatWarning: 'Phân loại video dài/Shorts theo dữ liệu nhập hoặc thời lượng là gần đúng.' };
    } else if (stage === 'groups') {
      if (body.groupId) {
        if (!flow.groups?.passed || !flow.groups.groups.some(g => g.id === body.groupId)) throw fault('Chọn một nhóm trong kết quả đã đạt.', 409);
        value = { ...flow.groups, chosen: body.groupId };
      } else {
        const proposed = body.groups || (await generate({ action: 'groups', context: { videos: blindTitles(flow.shelf.videos) } })).output.groups;
        const groups = validateGroups(proposed, flow.shelf.videos), gate = groupCountGate(groups);
        value = { ...gate, passed: gate.passed && !groups.some(g => g.id === 'unclassified'), groups, chosen: null, suggestedQueries: suggestedQueries(groups, flow.shelf.videos, flow.template.value) };
      }
    } else if (stage === 'probe') {
      if (!flow.groups.chosen) throw fault('Chọn nhóm trước khi gõ thử.', 409);
      let samples, queries = [];
      if (body.mode === 'live') {
        queries = body.queries;
        if (!Array.isArray(queries) || queries.length !== 3 || queries.some(q => typeof q !== 'string' || !q.trim())) throw fault('Nhập đúng ba câu gõ thử.');
        samples = []; for (const q of queries) {
          const results = await youtube('search', { part: 'snippet', type: 'video', maxResults: '20', q, regionCode: flow.field.market, relevanceLanguage: flow.field.language });
          samples.push(await videoDetails([...new Set((results.items || []).map(i => i.id?.videoId).filter(Boolean))]));
        }
      } else if (body.mode === 'import' && body.confirmComplete === true) samples = body.samples;
      else throw fault('Chọn nguồn và xác nhận dữ liệu gõ thử.');
      if (!Array.isArray(samples) || samples.length !== 3 || samples.some(a => !Array.isArray(a) || a.some(v => !Number.isFinite(typeof v === 'number' ? v : v?.views) || (typeof v === 'number' ? v : v.views) < 0))) throw fault('Cần ba mẫu, mỗi mẫu gồm lượt xem không âm.');
      const results = samples.map(a => probeGate(a.map(v => typeof v === 'number' ? v : v.views)));
      const hits = median(results.map(r => r.hits).filter(Number.isFinite));
      value = { passed: results.every(r => r.size === RULES.probeSize) && hits >= RULES.probePass, results, samples, queries, medianHits: hits, provenance: body.mode };
    } else if (stage === 'topics') {
      const group = flow.groups.groups.find(g => g.id === flow.groups.chosen);
      const shelfTitles = flow.shelf.videos.map(v => v.title);
      const norm = s => String(s).normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
      const existing = new Set(shelfTitles.map(norm));
      const good = [];
      const seen = new Set();
      // "cao" > "vừa" > "thấp". Bỏ dấu để "Cao"/"vừa"/"thấp" đều ra đúng khoá.
      const knownKey = v => String(v ?? '').normalize('NFD').toLowerCase().replace(/\p{Diacritic}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '');
      const KNOWN_RANK = { cao: 0, vua: 1, thuong: 1, trungbinh: 1, thap: 2 };
      const knownRank = v => KNOWN_RANK[knownKey(v)] ?? 1;
      const propose = extra => body.titles
        ? body.titles.map(title => ({ title }))
        : generate({ action: 'topics', context: { group: group.name, template: flow.template.value, angle: flow.template.angle, shelfTitles, ...extra } }).then(r => r.output.topics || []);
      const take = raw => {
        // Xếp theo mức nhiều người biết TRƯỚC khi cắt còn 20: chủ đề đông
        // người biết phải được giữ, chủ đề vắng người biết là phần dư.
        const list = [...(Array.isArray(raw) ? raw : [])].sort((x, y) => knownRank(x?.knownBy) - knownRank(y?.knownBy));
        for (const item of list) {
          const t = typeof item === 'string' ? item : item?.title;
          if (typeof t !== 'string' || !t.trim()) continue;
          const n = norm(t);
          if (!n.startsWith(norm(flow.template.value) + ' ') || existing.has(n) || seen.has(n)) continue;
          // Trùng thực thể với kho: kho có "…of Egypt" thì "…of Ancient Egypt" cũng là đã có.
          if (overlapsShelf(t, flow.template.value, shelfTitles)) continue;
          seen.add(n); good.push(t.trim());
        }
      };
      take(await propose());
      if (good.length < RULES.topicCount && !body.titles) {
        // Gọi lần 2 với danh sách đã có để AI đề xuất thực thể khác hẳn.
        take(await propose({ avoid: [...seen, ...shelfTitles.slice(0, 20)] }));
      }
      if (good.length >= RULES.topicCount) {
        value = { passed: true, chosen: good.slice(0, RULES.topicCount), errors: [] };
      } else {
        const check = validateTopics(good, shelfTitles, flow.template.value);
        value = { passed: false, chosen: [], errors: [`Mới gom được ${good.length}/${RULES.topicCount} chủ đề chưa trùng.`, ...check.errors.slice(0, 5)] };
      }
    }
    return updateState(revision, state => {
      const current = requireStage(body.surveyId, stage, state);
      current.nicheFlow ||= {};
      for (const later of STAGES.slice(STAGES.indexOf(stage))) delete current.nicheFlow[later];
      current.nicheFlow[stage] = value;
      const locked = lockedNiche({ niche: current.nicheFlow });
      if (locked) current.lockedNiche = structuredClone(locked); else delete current.lockedNiche;
      return { survey: current, nextStage: nextStage({ niche: current.nicheFlow }), rules: RULES };
    });
  }
  return { act, catalog, requireStage, rules: RULES };
}
