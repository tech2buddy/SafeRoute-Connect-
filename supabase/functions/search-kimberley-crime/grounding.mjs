export function supportedSources(candidate) {
    const metadata = candidate?.groundingMetadata;
    const text = (candidate?.content?.parts || []).filter(part => part.text && !part.thought).map(part => part.text).join('');
    if (!metadata?.webSearchQueries?.length) throw new Error('No search evidence returned');
    const sources = [];
    for (const [index, chunk] of (metadata.groundingChunks || []).entries()) {
        let url;
        try { url = new URL(chunk.web?.uri); } catch { continue; }
        if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) continue;
        const excerpts = (metadata.groundingSupports || []).filter(support => support.groundingChunkIndices?.includes(index))
            .map(support => support.segment?.text)
            .filter(excerpt => typeof excerpt === 'string' && excerpt.length >= 10 && text.includes(excerpt));
        if (!excerpts.length) continue;
        sources.push({ url:url.href, title:String(chunk.web.title || 'Search source').slice(0,100), excerpts:excerpts.slice(0,5).map(s => s.slice(0,1500)) });
    }
    return { sources:sources.slice(0,10), queries:metadata.webSearchQueries.slice(0,10), search_entry_point:metadata.searchEntryPoint || null };
}
