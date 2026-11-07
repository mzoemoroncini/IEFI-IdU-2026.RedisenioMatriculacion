export const searchKey=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es-AR').trim().replace(/\s+/g,' ');
export function matchesQuery(text,query){const haystack=searchKey(text);return searchKey(query).split(' ').filter(Boolean).every(word=>haystack.includes(word));}
export function optionMatches(options,query,limit=60){const matches=options.filter(o=>!o.disabled&&matchesQuery(o.label,query));return {count:matches.length,options:matches.slice(0,limit)};}
